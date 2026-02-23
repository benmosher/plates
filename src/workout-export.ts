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

  const json = JSON.stringify(exported);
  const encoded = new TextEncoder().encode(json);
  const compressed = await compress(encoded);
  return toBase64url(compressed);
}

export async function decodeWorkout(encoded: string): Promise<ExportedWorkout> {
  const bytes = fromBase64url(encoded);
  const decompressed = await decompress(bytes);
  const json = new TextDecoder().decode(decompressed);
  return JSON.parse(json);
}

export function buildImportUrl(encoded: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}workouts/import?d=${encoded}`;
}
