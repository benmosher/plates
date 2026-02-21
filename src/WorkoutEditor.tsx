import { useParams, Link } from "react-router";
import { useMassStorage } from "./plate-db";
import { Workout, Movement, WorkoutSet } from "./workout-types";
import { numbdfined } from "./utils";

/** Parse human-readable rest time to seconds. Handles: "3min", "90s", "1:30", "90". */
function parseRestSeconds(input: string): number | undefined {
  const s = input.trim();
  if (!s) return undefined;

  // "1:30" → 90
  const colonMatch = s.match(/^(\d+):(\d{2})$/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);

  // "2min30s", "2m30s"
  const compoundMatch = s.match(/^(\d+)\s*m(?:in)?\s*(\d+)\s*s(?:ec)?$/i);
  if (compoundMatch)
    return parseInt(compoundMatch[1]) * 60 + parseInt(compoundMatch[2]);

  // "3min", "3m"
  const minMatch = s.match(/^(\d+(?:\.\d+)?)\s*m(?:in)?$/i);
  if (minMatch) return Math.round(parseFloat(minMatch[1]) * 60);

  // "90s", "90sec"
  const secMatch = s.match(/^(\d+)\s*s(?:ec)?$/i);
  if (secMatch) return parseInt(secMatch[1]);

  // plain number
  const num = parseFloat(s);
  if (!isNaN(num)) return Math.round(num);

  return undefined;
}

function formatRestSeconds(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60}min`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export default function WorkoutEditor() {
  const { id } = useParams<{ id: string }>();
  const { workouts, putWorkout, maxes } = useMassStorage();
  const workout = workouts.find((w) => w.id === Number(id));

  if (!workout) return <p>Workout not found.</p>;

  function save(patch: Partial<Workout>) {
    putWorkout({ ...workout!, ...patch });
  }

  function updateMovement(idx: number, patch: Partial<Movement>) {
    const movements = workout!.movements.map((m, i) =>
      i === idx ? { ...m, ...patch } : m,
    );
    save({ movements });
  }

  function deleteMovement(idx: number) {
    save({ movements: workout!.movements.filter((_, i) => i !== idx) });
  }

  function addMovement() {
    save({
      movements: [...workout!.movements, { name: "", maxId: null, sets: [] }],
    });
  }

  function updateSet(mIdx: number, sIdx: number, patch: Partial<WorkoutSet>) {
    const sets = workout!.movements[mIdx].sets.map((s, i) =>
      i === sIdx ? { ...s, ...patch } : s,
    );
    updateMovement(mIdx, { sets });
  }

  function deleteSet(mIdx: number, sIdx: number) {
    updateMovement(mIdx, {
      sets: workout!.movements[mIdx].sets.filter((_, i) => i !== sIdx),
    });
  }

  function addSet(mIdx: number) {
    const sets = workout!.movements[mIdx].sets;
    const last = sets[sets.length - 1];
    const newSet = last
      ? { ...last, weight: { ...last.weight } }
      : { reps: 5, count: 1, weight: { type: "absolute" as const, value: 0 } };
    updateMovement(mIdx, { sets: [...sets, newSet] });
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3>Edit Workout</h3>
        <Link
          to={`/workouts/${id}/view`}
          role="button"
          className="secondary outline"
        >
          View
        </Link>
      </div>
      <input
        type="text"
        placeholder="Workout name"
        defaultValue={workout.name}
        onBlur={(e) => save({ name: e.target.value })}
      />

      {workout.movements.map((movement, mIdx) => (
        <article key={mIdx}>
          <header>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <input
                type="text"
                placeholder="Movement name"
                defaultValue={movement.name}
                style={{ flex: 1 }}
                onBlur={(e) => updateMovement(mIdx, { name: e.target.value })}
              />
              <button
                type="button"
                className="secondary outline"
                style={{ width: "auto" }}
                onClick={() => deleteMovement(mIdx)}
              >
                &times;
              </button>
            </div>
            <fieldset className="grid">
              <select
                value={movement.maxId ?? ""}
                onChange={(e) =>
                  updateMovement(mIdx, {
                    maxId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">No max</option>
                {maxes
                  .filter((m) => m.label && m.weight)
                  .map((m) => (
                    <option key={m.id} value={m.id!}>
                      {m.label} ({m.weight})
                    </option>
                  ))}
              </select>
              <input
                type="text"
                placeholder="rest (e.g. 3min)"
                defaultValue={
                  movement.restSeconds != null
                    ? formatRestSeconds(movement.restSeconds)
                    : ""
                }
                onBlur={(e) => {
                  const secs = parseRestSeconds(e.target.value);
                  updateMovement(mIdx, { restSeconds: secs });
                  e.target.value = secs != null ? formatRestSeconds(secs) : "";
                }}
              />
            </fieldset>
          </header>

          {movement.sets.map((set, sIdx) => (
            <fieldset className="grid" key={sIdx}>
              <legend>
                <small>Set {sIdx + 1}</small>
              </legend>
              <fieldset role="group" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  min={1}
                  placeholder="sets"
                  defaultValue={set.count}
                  onBlur={(e) =>
                    updateSet(mIdx, sIdx, {
                      count: numbdfined(e.target.value) ?? 1,
                    })
                  }
                />
                <input
                  type="number"
                  min={1}
                  placeholder="reps"
                  defaultValue={set.reps}
                  onBlur={(e) =>
                    updateSet(mIdx, sIdx, {
                      reps: numbdfined(e.target.value) ?? 1,
                    })
                  }
                />
              </fieldset>
              <fieldset role="group" style={{ marginBottom: 0 }}>
                <input
                  type="number"
                  min={0}
                  placeholder={
                    set.weight.type === "percentage" ? "%" : "weight"
                  }
                  defaultValue={set.weight.value}
                  onBlur={(e) => {
                    const val = numbdfined(e.target.value) ?? 0;
                    updateSet(mIdx, sIdx, {
                      weight: { ...set.weight, value: val },
                    });
                  }}
                />
                <select
                  value={set.weight.type}
                  onChange={(e) => {
                    const type = e.target.value as "absolute" | "percentage";
                    updateSet(mIdx, sIdx, {
                      weight: { type, value: set.weight.value },
                    });
                  }}
                >
                  <option value="absolute">lb</option>
                  <option value="percentage">%</option>
                </select>
                <button
                  type="button"
                  className="secondary outline"
                  style={{ width: "auto" }}
                  onClick={() => deleteSet(mIdx, sIdx)}
                >
                  &times;
                </button>
              </fieldset>
            </fieldset>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => addSet(mIdx)}
          >
            Add set
          </button>
        </article>
      ))}

      <button type="button" onClick={addMovement}>
        Add movement
      </button>
    </>
  );
}
