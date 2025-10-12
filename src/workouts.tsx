import { useState } from "react";
import { useParams } from "react-router";
import { useImmer } from "use-immer";
import { HiddenDeleteFieldset } from "./HiddenDeleteFieldset";
import DoubleClickConfirmButton from "./DoubleClickConfirmButton";
import { numbdfined } from "./utils";

type Workout = {
  name: string;
  description?: string;
  movements: readonly Movement[];
};

type Movement = {
  name: string;
  sets: readonly Set[];
};

type Set = {
  reps: number;
  /** if absent, dealer's choice */
  prescribed?: Prescription;
  /** if absent, assume 1 */
  count?: number;
};

type Prescription = Percentage | Weight;

type Percentage = {
  type: "percentage";
  percentage: number;
  base?: string; // e.g. Squat 1RM
};

type Weight = {
  type: "weight";
  weight: number;
};

export function WorkoutBuilder() {
  const params = useParams();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [movements, updateMovements] = useImmer<(Movement | null)[]>([]);

  return (
    <section>
      <h2>Workout Builder (WIP) - {params.workoutId}</h2>
      <form>
        <fieldset>
          <label>
            Workout Name:{" "}
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Description:{" "}
            <input
              type="text"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </fieldset>
        <h3>Movements</h3>
        <fieldset>
          {movements.map((m, i) => (
            <MovementBuilder
              key={i}
              movement={m}
              onRemove={() =>
                updateMovements((draft) => {
                  draft.splice(i, 1);
                })
              }
            />
          ))}
        </fieldset>
        <fieldset className="grid">
          <button
            type="button"
            className="secondary"
            onClick={() =>
              updateMovements((draft) => {
                draft.push(null);
              })
            }
          >
            Add Movement
          </button>
          <button type="submit" className="primary">
            Save Workout
          </button>
        </fieldset>
      </form>
    </section>
  );
}

function MovementBuilder({
  movement,
  onRemove,
}: {
  movement: Movement | null;
  onRemove: () => void;
}) {
  const [name, setName] = useState(movement?.name ?? "");
  const [sets, updateSets] = useImmer<readonly (Set | null)[]>(
    movement?.sets ?? [null]
  );

  return (
    <fieldset>
      <label>
        Movement name:{" "}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {sets.map((s, i) => (
        <SetEditor
          key={i}
          set={s}
          onRemove={() =>
            updateSets((draft) => {
              draft.splice(i, 1);
            })
          }
        />
      ))}
      <fieldset className="grid">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            updateSets((draft) => {
              draft.push(null);
            })
          }
        >
          Add Set
        </button>
        <DoubleClickConfirmButton onClick={onRemove}>
          Remove Movement
        </DoubleClickConfirmButton>
      </fieldset>
    </fieldset>
  );
}

function parsePrescription(value: string): Prescription | null {
  // weight: a straight number
  const number = +value;
  if (!isNaN(number)) {
    return { type: "weight", weight: number };
  }

  // only a percentage; base inferred from context
  if (value.endsWith("%")) {
    const pct = +value.slice(0, -1);
    if (!isNaN(pct)) return { type: "percentage", percentage: pct };
  }

  if (value.includes("% of ")) {
    const [pct, base] = value.split("% of ");
    const p = +pct;
    if (!isNaN(p) && base) return { type: "percentage", percentage: p, base };
  }

  // no valid prescription found
  return null;
}

function stringifyPrescription(p: Prescription | null | undefined): string {
  if (!p) return "";
  if (p.type === "weight") return String(p.weight);
  if (p.base) return `${p.percentage}% of ${p.base}`;
  return `${p.percentage}%`;
}

function SetEditor({
  set,
  onRemove,
}: {
  set?: Set | null;
  onRemove: () => void;
}) {
  const [reps, setReps] = useState(set?.reps);
  const [repeat, setRepeat] = useState(set?.count);
  const [weight, setWeight] = useState(stringifyPrescription(set?.prescribed));

  return (
    <HiddenDeleteFieldset onDelete={onRemove}>
      <input
        type="number"
        placeholder="Sets"
        value={repeat ?? ""}
        onChange={(e) =>
          setRepeat(e.target.value ? +e.target.value : undefined)
        }
        aria-invalid={repeat ? repeat < 1 : undefined}
      />
      <input
        type="number"
        placeholder="Reps"
        value={reps ?? ""}
        onChange={(e) => setReps(numbdfined(e.target.value))}
        aria-invalid={reps ? reps < 1 : undefined}
      />
      <input
        type="text"
        placeholder="Weight"
        value={weight ?? ""}
        onChange={(e) => setWeight(e.target.value)}
        aria-invalid={weight ? !parsePrescription(weight) : undefined}
      />
    </HiddenDeleteFieldset>
  );
}
