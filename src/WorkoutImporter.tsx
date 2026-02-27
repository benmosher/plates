import { useSearchParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useMassStorage } from "./plate-db";
import { decodeWorkout, ExportedWorkout } from "./workout-export";
import { Workout } from "./workout-types";

const NONE = "@@none";
const CREATE_PREFIX = "@@create:";
const BAR_TYPE_PREFIX = "type:";
const BAR_ID_PREFIX = "bar:";

export default function WorkoutImporter() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { maxes, bars, workouts, putMax, putWorkout } = useMassStorage();

  const encoded = searchParams.get("d");
  const [exported, setExported] = useState<ExportedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [folder, setFolder] = useState<string>("");

  // map from maxName → selected value (max id, NONE, or CREATE_PREFIX+name)
  const [maxMapping, setMaxMapping] = useState<Map<string, string>>(new Map());
  // map from barType → selected value (NONE, BAR_TYPE_PREFIX+type, or BAR_ID_PREFIX+idx)
  const [barTypeMapping, setBarTypeMapping] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!encoded) {
      setError("No workout data found in URL.");
      return;
    }
    decodeWorkout(encoded).then(
      (data) => {
        setExported(data);
        setFolder(data.folder ?? "");
        // collect unique max names and auto-map
        const names = new Set<string>();
        const barTypes = new Set<string>();
        for (const g of data.groups) {
          for (const m of g.movements) {
            if (m.maxName) names.add(m.maxName);
            if (m.barType) barTypes.add(m.barType);
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

        // auto-map bar types: default to matching type if bars of that type exist
        const btMapping = new Map<string, string>();
        for (const bt of barTypes) {
          const hasMatch = bars.some((b) => b.type === bt);
          btMapping.set(bt, hasMatch ? `${BAR_TYPE_PREFIX}${bt}` : NONE);
        }
        setBarTypeMapping(btMapping);
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

  const uniqueBarTypes = [...new Set(
    exported.groups
      .flatMap((g) => g.movements)
      .map((m) => m.barType)
      .filter((t): t is string => t != null),
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

      // resolve bar type mappings
      type BarValue = { type: string } | { id: number } | undefined;
      const resolvedBars = new Map<string, BarValue>();
      for (const [bt, value] of barTypeMapping) {
        if (value === NONE) {
          resolvedBars.set(bt, undefined);
        } else if (value.startsWith(BAR_ID_PREFIX)) {
          resolvedBars.set(bt, { id: Number(value.slice(BAR_ID_PREFIX.length)) });
        } else if (value.startsWith(BAR_TYPE_PREFIX)) {
          resolvedBars.set(bt, { type: value.slice(BAR_TYPE_PREFIX.length) });
        }
      }

      // build workout
      const trimmedFolder = folder.trim();
      const workout: Workout = {
        name: exported!.name,
        ...(trimmedFolder ? { folder: trimmedFolder } : {}),
        groups: exported!.groups.map((g) => ({
          movements: g.movements.map((m) => {
            const bar = m.barType ? resolvedBars.get(m.barType) : undefined;
            return {
              name: m.name,
              maxId: m.maxName ? (resolvedMaxIds.get(m.maxName) ?? null) : null,
              ...(bar ? { bar } : {}),
              sets: m.sets,
            };
          }),
          ...(g.restSeconds != null ? { restSeconds: g.restSeconds } : {}),
          ...(g.notes ? { notes: g.notes } : {}),
        })),
      };

      const id = await putWorkout(workout);
      navigate(`/workouts/${id}/view`);
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

      <label>
        Folder
        <input
          type="text"
          placeholder="No folder"
          value={folder}
          list="import-folder-options"
          onChange={(e) => setFolder(e.target.value)}
        />
        <datalist id="import-folder-options">
          {[...new Set(workouts.map((w) => w.folder).filter((f): f is string => !!f))].map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </label>

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

      {uniqueBarTypes.length > 0 && (
        <article>
          <header>
            <strong>Link bar types</strong>
          </header>
          {uniqueBarTypes.map((bt) => (
            <label key={bt}>
              {bt}
              <select
                value={barTypeMapping.get(bt) ?? NONE}
                onChange={(e) =>
                  setBarTypeMapping((prev) => new Map(prev).set(bt, e.target.value))
                }
              >
                <option value={`${BAR_TYPE_PREFIX}${bt}`}>{bt} (any)</option>
                {bars
                  .filter((b) => b.type === bt)
                  .map((b) => (
                    <option key={b.idx} value={`${BAR_ID_PREFIX}${b.idx}`}>
                      {b.name} ({b.weight})
                    </option>
                  ))}
                <option value={NONE}>None (ignore)</option>
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
