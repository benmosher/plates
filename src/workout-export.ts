import { Workout, WorkoutSet } from "./workout-types";
import { Bar, Max } from "./plate-db";

interface ExportedMovement {
  name: string;
  maxName: string | null;
  barType?: string | null;
  sets: WorkoutSet[];
}

interface ExportedGroup {
  movements: ExportedMovement[];
  restSeconds?: number;
  notes?: string | null;
}

export interface ExportedWorkout {
  name: string;
  folder?: string;
  groups: ExportedGroup[];
}

// Packed format: array tuples instead of named-key objects.
// Eliminates JSON field-name overhead (~50% smaller before deflate).
// [name, groups]  where group = [movements, restSeconds|null, notes|null]
//                       movement = [name, maxName|null, sets]
//                       set = [reps, count, weight]
type PackedSet = [reps: number, count: number, weight: number];
type PackedMovement =
  | [name: string, maxName: string | null, sets: PackedSet[]]
  | [name: string, maxName: string | null, sets: PackedSet[], barType: string];
type PackedGroup = [
  movements: PackedMovement[],
  restSeconds: number | null,
  notes: string | null,
];
type PackedWorkout = [name: string, groups: PackedGroup[]] | [name: string, groups: PackedGroup[], folder: string];

function packWorkout(w: ExportedWorkout): PackedWorkout {
  const groups = w.groups.map((g): PackedGroup => [
    g.movements.map((m): PackedMovement => {
      const sets = m.sets.map((s): PackedSet => [s.reps, s.count, s.weight]);
      if (m.barType) return [m.name, m.maxName, sets, m.barType];
      return [m.name, m.maxName, sets];
    }),
    g.restSeconds ?? null,
    g.notes ?? null,
  ]);
  if (w.folder) return [w.name, groups, w.folder];
  return [w.name, groups];
}

function unpackWorkout(packed: PackedWorkout): ExportedWorkout {
  const [name, groups] = packed;
  const folder = packed.length > 2 ? packed[2] : undefined;
  return {
    name,
    ...(folder ? { folder } : {}),
    groups: groups.map(([movements, restSeconds, notes]): ExportedGroup => ({
      movements: movements.map((pm): ExportedMovement => {
        const barType = pm.length > 3 ? (pm as [string, string | null, PackedSet[], string])[3] : undefined;
        return {
          name: pm[0],
          maxName: pm[1],
          ...(barType ? { barType } : {}),
          sets: pm[2].map(([reps, count, weight]): WorkoutSet => ({ reps, count, weight })),
        };
      }),
      ...(restSeconds != null ? { restSeconds } : {}),
      ...(notes ? { notes } : {}),
    })),
  };
}

function toBase64url(bytes: Uint8Array): string {
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Uint8Array {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function compress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const blob = new Blob([data]);
  const stream = blob.stream().pipeThrough(ds);
  const out = new Response(stream);
  const buffer = await out.arrayBuffer();
  return new Uint8Array(buffer);
}

function resolveBarType(bar: { type: string } | { id: number } | undefined, barById: Map<number, Bar>): string | undefined {
  if (!bar) return undefined;
  if ("type" in bar) return bar.type;
  return barById.get(bar.id)?.type;
}

export async function exportWorkout(
  workout: Workout,
  maxes: readonly Max[],
  bars: readonly Bar[],
): Promise<string> {
  const maxById = new Map(maxes.map((m) => [m.id!, m]));
  const barById = new Map(bars.map((b) => [b.idx, b]));

  const exported: ExportedWorkout = {
    name: workout.name,
    ...(workout.folder ? { folder: workout.folder } : {}),
    groups: workout.groups.map((g) => ({
      movements: g.movements.map((m) => {
        const barType = resolveBarType(m.bar, barById);
        return {
          name: m.name,
          maxName: m.maxId != null ? (maxById.get(m.maxId)?.label ?? null) : null,
          ...(barType ? { barType } : {}),
          sets: m.sets,
        };
      }),
      ...(g.restSeconds != null ? { restSeconds: g.restSeconds } : {}),
      ...(g.notes ? { notes: g.notes } : {}),
    })),
  };

  const json = JSON.stringify(packWorkout(exported));
  const encoded = new TextEncoder().encode(json);
  const compressed = await compress(encoded);
  return toBase64url(compressed);
}

export async function decodeWorkout(encoded: string): Promise<ExportedWorkout> {
  const bytes = fromBase64url(encoded);
  const decompressed = await decompress(bytes);
  const json = new TextDecoder().decode(decompressed);
  return unpackWorkout(JSON.parse(json) as PackedWorkout);
}

export function buildImportUrl(encoded: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}workouts/import?d=${encoded}`;
}
