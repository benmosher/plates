import { useParams, Link, useNavigate } from "react-router";
import { useMassStorage } from "./plate-db";
import { Workout, MovementGroup, Movement, WorkoutSet } from "./workout-types";
import { numbdfined } from "./utils";
import DoubleClickConfirmButton from "./DoubleClickConfirmButton";

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
  const { workouts, putWorkout, deleteWorkout, maxes } = useMassStorage();
  const navigate = useNavigate();
  const workout = workouts.find((w) => w.id === Number(id));

  if (!workout) return <p>Workout not found.</p>;

  function save(patch: Partial<Workout>) {
    putWorkout({ ...workout!, ...patch });
  }

  function updateGroup(gIdx: number, patch: Partial<MovementGroup>) {
    const groups = workout!.groups.map((g, i) =>
      i === gIdx ? { ...g, ...patch } : g,
    );
    save({ groups });
  }

  function addGroup() {
    save({
      groups: [...workout!.groups, { movements: [{ name: "", maxId: null, sets: [{ reps: 5, count: 1, weight: 0 }] }] }],
    });
  }

  function updateMovement(gIdx: number, mIdx: number, patch: Partial<Movement>) {
    const movements = workout!.groups[gIdx].movements.map((m, i) =>
      i === mIdx ? { ...m, ...patch } : m,
    );
    updateGroup(gIdx, { movements });
  }

  function deleteMovement(gIdx: number, mIdx: number) {
    const group = workout!.groups[gIdx];
    if (group.movements.length === 1) {
      save({ groups: workout!.groups.filter((_, i) => i !== gIdx) });
    } else {
      updateGroup(gIdx, { movements: group.movements.filter((_, i) => i !== mIdx) });
    }
  }

  function addMovementToGroup(gIdx: number) {
    const group = workout!.groups[gIdx];
    updateGroup(gIdx, {
      movements: [...group.movements, { name: "", maxId: null, sets: [{ reps: 5, count: 1, weight: 0 }] }],
    });
  }

  function updateSet(gIdx: number, mIdx: number, sIdx: number, patch: Partial<WorkoutSet>) {
    const sets = workout!.groups[gIdx].movements[mIdx].sets.map((s, i) =>
      i === sIdx ? { ...s, ...patch } : s,
    );
    updateMovement(gIdx, mIdx, { sets });
  }

  function deleteSet(gIdx: number, mIdx: number, sIdx: number) {
    updateMovement(gIdx, mIdx, {
      sets: workout!.groups[gIdx].movements[mIdx].sets.filter((_, i) => i !== sIdx),
    });
  }

  function addSet(gIdx: number, mIdx: number) {
    const movement = workout!.groups[gIdx].movements[mIdx];
    const sets = movement.sets;
    const last = sets[sets.length - 1];
    const newSet = last
      ? { ...last }
      : movement.maxId != null
        ? { reps: 5, count: 1, weight: 80 }
        : { reps: 5, count: 1, weight: 0 };
    updateMovement(gIdx, mIdx, { sets: [...sets, newSet] });
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

      {workout.groups.map((group, gIdx) => (
        <article key={gIdx}>
          {group.movements.map((movement, mIdx) => (
            <div key={mIdx}>
              {mIdx > 0 && <hr />}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Movement name"
                  defaultValue={movement.name}
                  style={{ flex: 1 }}
                  onBlur={(e) => updateMovement(gIdx, mIdx, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="secondary outline"
                  style={{ width: "auto" }}
                  onClick={() => deleteMovement(gIdx, mIdx)}
                >
                  &times;
                </button>
              </div>
              <select
                value={movement.maxId ?? ""}
                onChange={(e) => {
                  const maxId = e.target.value ? Number(e.target.value) : null;
                  updateMovement(gIdx, mIdx, { maxId });
                }}
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

              {movement.sets.map((set, sIdx) => (
                <fieldset key={sIdx}>
                  <legend><small>Set {sIdx + 1}</small></legend>
                  <fieldset role="group">
                    <input
                      type="number"
                      min={1}
                      placeholder="sets"
                      defaultValue={set.count}
                      onBlur={(e) =>
                        updateSet(gIdx, mIdx, sIdx, {
                          count: numbdfined(e.target.value) ?? 1,
                        })
                      }
                    />
                    <span style={{ alignSelf: "center", padding: "0 0.25rem" }}>&times;</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="reps"
                      defaultValue={set.reps}
                      onBlur={(e) =>
                        updateSet(gIdx, mIdx, sIdx, {
                          reps: numbdfined(e.target.value) ?? 1,
                        })
                      }
                    />
                    <span style={{ alignSelf: "center", padding: "0 0.25rem" }}>@</span>
                    <input
                      type="number"
                      min={0}
                      placeholder={movement.maxId != null ? "%" : "weight"}
                      defaultValue={set.weight || ""}
                      onBlur={(e) => {
                        const val = numbdfined(e.target.value) ?? 0;
                        updateSet(gIdx, mIdx, sIdx, { weight: val });
                      }}
                    />
                    <button
                      type="button"
                      className="secondary outline"
                      style={{ width: "auto" }}
                      onClick={() => deleteSet(gIdx, mIdx, sIdx)}
                    >
                      &times;
                    </button>
                  </fieldset>
                </fieldset>
              ))}
              <button
                type="button"
                className="secondary"
                onClick={() => addSet(gIdx, mIdx)}
              >
                Add set
              </button>
            </div>
          ))}

          <footer>
            <fieldset>
              <legend><small>Rest</small></legend>
              <input
                type="text"
                placeholder="e.g. 3min"
                defaultValue={
                  group.restSeconds != null
                    ? formatRestSeconds(group.restSeconds)
                    : ""
                }
                onBlur={(e) => {
                  const secs = parseRestSeconds(e.target.value);
                  updateGroup(gIdx, { restSeconds: secs });
                  e.target.value = secs != null ? formatRestSeconds(secs) : "";
                }}
              />
            </fieldset>
            <button
              type="button"
              className="secondary outline"
              onClick={() => addMovementToGroup(gIdx)}
            >
              + Add to superset
            </button>
          </footer>
        </article>
      ))}

      <div>
        <button type="button" onClick={addGroup}>
          Add movement
        </button>
      </div>
      <div>
        <DoubleClickConfirmButton
          onClick={() => {
            deleteWorkout(workout!.id!);
            navigate("/workouts");
          }}
        >
          Delete workout
        </DoubleClickConfirmButton>
      </div>
    </>
  );
}
