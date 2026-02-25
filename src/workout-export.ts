import { Workout, WorkoutSet } from "./workout-types";
import { Max } from "./plate-db";

interface ExportedMovement {
  name: string;
  maxName: string | null;
  sets: WorkoutSet[];
}

interface ExportedGroup {
  movements: ExportedMovement[];
  restSeconds?: number;
  notes?: string | null;
}

export interface ExportedWorkout {
  name: string;
  groups: ExportedGroup[];
}

// Packed format: array tuples instead of named-key objects.
// Eliminates JSON field-name overhead (~50% smaller before deflate).
// [name, groups]  where group = [movements, restSeconds|null, notes|null]
//                       movement = [name, maxName|null, sets]
//                       set = [reps, count, weight]
type PackedSet = [reps: number, count: number, weight: number];
type PackedMovement = [name: string, maxName: string | null, sets: PackedSet[]];
type PackedGroup = [
  movements: PackedMovement[],
  restSeconds: number | null,
  notes: string | null,
];
type PackedWorkout = [name: string, groups: PackedGroup[]];

function packWorkout(w: ExportedWorkout): PackedWorkout {
  return [
    w.name,
    w.groups.map((g): PackedGroup => [
      g.movements.map((m): PackedMovement => [
        m.name,
        m.maxName,
        m.sets.map((s): PackedSet => [s.reps, s.count, s.weight]),
      ]),
      g.restSeconds ?? null,
      g.notes ?? null,
    ]),
  ];
}

function unpackWorkout([name, groups]: PackedWorkout): ExportedWorkout {
  return {
    name,
    groups: groups.map(([movements, restSeconds, notes]): ExportedGroup => ({
      movements: movements.map(([movName, maxName, sets]): ExportedMovement => ({
        name: movName,
        maxName,
        sets: sets.map(([reps, count, weight]): WorkoutSet => ({ reps, count, weight })),
      })),
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

export async function exportWorkout(
  workout: Workout,
  maxes: readonly Max[],
): Promise<string> {
  const maxById = new Map(maxes.map((m) => [m.id!, m]));

  const exported: ExportedWorkout = {
    name: workout.name,
    groups: workout.groups.map((g) => ({
      movements: g.movements.map((m) => ({
        name: m.name,
        maxName: m.maxId != null ? (maxById.get(m.maxId)?.label ?? null) : null,
        sets: m.sets,
      })),
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
