import { useSearchParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useMassStorage } from "./plate-db";
import { decodeWorkout, ExportedWorkout } from "./workout-export";
import { Workout } from "./workout-types";

const NONE = "@@none";
const CREATE_PREFIX = "@@create:";

export default function WorkoutImporter() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { maxes, putMax, putWorkout } = useMassStorage();

  const encoded = searchParams.get("d");
  const [exported, setExported] = useState<ExportedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // map from maxName → selected value (max id, NONE, or CREATE_PREFIX+name)
  const [maxMapping, setMaxMapping] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!encoded) {
      setError("No workout data found in URL.");
      return;
    }
    decodeWorkout(encoded).then(
      (data) => {
        setExported(data);
        // collect unique max names and auto-map
        const names = new Set<string>();
        for (const g of data.groups) {
          for (const m of g.movements) {
            if (m.maxName) names.add(m.maxName);
          }
        }
        const mapping = new Map<string, string>();
        for (const name of names) {
          const match = maxes.find(
            (m) => m.label?.toLowerCase() === name.toLowerCase(),
          );
          mapping.set(name, match ? String(match.id!) : `${CREATE_PREFIX}${name}`);
        }
        setMaxMapping(mapping);
      },
      () => setError("Failed to decode workout data."),
    );
  }, [encoded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <>
        <h3>Import Workout</h3>
        <p aria-invalid="true">{error}</p>
      </>
    );
  }

  if (!exported) {
    return (
      <>
        <h3>Import Workout</h3>
        <p aria-busy="true">Decoding workout...</p>
      </>
    );
  }

  const uniqueMaxNames = [...new Set(
    exported.groups
      .flatMap((g) => g.movements)
      .map((m) => m.maxName)
      .filter((n): n is string => n != null),
  )];

  async function handleImport() {
    setImporting(true);
    try {
      // resolve max mappings: create new maxes as needed
      const resolvedMaxIds = new Map<string, number | null>();
      for (const [name, value] of maxMapping) {
        if (value === NONE) {
          resolvedMaxIds.set(name, null);
        } else if (value.startsWith(CREATE_PREFIX)) {
          const label = value.slice(CREATE_PREFIX.length);
          const id = await putMax({ label, weight: null });
          resolvedMaxIds.set(name, id);
        } else {
          resolvedMaxIds.set(name, Number(value));
        }
      }

      // build workout
      const workout: Workout = {
        name: exported!.name,
        groups: exported!.groups.map((g) => ({
          movements: g.movements.map((m) => ({
            name: m.name,
            maxId: m.maxName ? (resolvedMaxIds.get(m.maxName) ?? null) : null,
            sets: m.sets,
          })),
          ...(g.restSeconds != null ? { restSeconds: g.restSeconds } : {}),
        })),
      };

      const id = await putWorkout(workout);
      navigate(`/workouts/${id}/edit`);
    } catch {
      setError("Failed to import workout.");
      setImporting(false);
    }
  }

  return (
    <>
      <h3>Import Workout</h3>
      <article>
        <header>
          <strong>{exported.name || "(untitled)"}</strong>
        </header>
        {exported.groups.map((group, gIdx) => (
          <p key={gIdx}>
            {group.movements.map((m) => m.name || "(unnamed)").join(" + ")}
            {" — "}
            {group.movements.reduce((n, m) => n + m.sets.reduce((s, set) => s + set.count, 0), 0)} sets
            {group.restSeconds != null && `, ${group.restSeconds}s rest`}
          </p>
        ))}
      </article>

      {uniqueMaxNames.length > 0 && (
        <article>
          <header>
            <strong>Link maxes</strong>
          </header>
          {uniqueMaxNames.map((name) => (
            <label key={name}>
              {name}
              <select
                value={maxMapping.get(name) ?? NONE}
                onChange={(e) =>
                  setMaxMapping((prev) => new Map(prev).set(name, e.target.value))
                }
              >
                {maxes
                  .filter((m) => m.label)
                  .map((m) => (
                    <option key={m.id} value={String(m.id!)}>
                      {m.label} ({m.weight ?? "no weight"})
                    </option>
                  ))}
                <option value={`${CREATE_PREFIX}${name}`}>
                  Create new: {name}
                </option>
                <option value={NONE}>None (unlink)</option>
              </select>
            </label>
          ))}
        </article>
      )}

      <button type="button" onClick={handleImport} aria-busy={importing} disabled={importing}>
        {importing ? "Importing..." : "Import"}
      </button>
    </>
  );
}
