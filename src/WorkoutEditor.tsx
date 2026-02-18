import { useParams, Link } from "react-router";
import { useMassStorage } from "./plate-db";
import { Workout, Movement, WorkoutSet } from "./workout-types";
import { numbdfined } from "./utils";

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
      movements: [
        ...workout!.movements,
        { name: "", maxId: null, sets: [] },
      ],
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Edit Workout</h3>
        <Link to={`/workouts/${id}/view`} role="button" className="secondary outline" style={{ width: "auto" }}>
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
          <header style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Movement name"
              defaultValue={movement.name}
              style={{ marginBottom: 0 }}
              onBlur={(e) => updateMovement(mIdx, { name: e.target.value })}
            />
            <select
              value={movement.maxId ?? ""}
              style={{ marginBottom: 0, width: "auto" }}
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
            <button
              type="button"
              className="secondary outline"
              style={{ width: "auto", marginBottom: 0 }}
              onClick={() => deleteMovement(mIdx)}
            >
              &times;
            </button>
          </header>

          {movement.sets.map((set, sIdx) => (
            <fieldset role="group" key={sIdx}>
              <input
                type="number"
                min={1}
                placeholder="sets"
                defaultValue={set.count}
                style={{ width: "4rem" }}
                onBlur={(e) =>
                  updateSet(mIdx, sIdx, {
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
                style={{ width: "4rem" }}
                onBlur={(e) =>
                  updateSet(mIdx, sIdx, {
                    reps: numbdfined(e.target.value) ?? 1,
                  })
                }
              />
              <span style={{ alignSelf: "center", padding: "0 0.25rem" }}>@</span>
              <input
                type="number"
                min={0}
                placeholder={set.weight.type === "percentage" ? "%" : "weight"}
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
                style={{ width: "auto" }}
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
          ))}
          <button type="button" className="secondary" onClick={() => addSet(mIdx)}>
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
