import { useState } from "react";
import { useImmer } from "use-immer";

import { HiddenDeleteFieldset } from "../HiddenDeleteFieldset";
import DoubleClickConfirmButton from "../DoubleClickConfirmButton";
import { numbdfined } from "../utils";
import type { Movement, Prescription, Set, Workout } from "./types";

import { saveWorkout, useWorkout } from "./db";
import { useParams } from "react-router";

export function WorkoutBuilder() {
  const params = useParams<{ workoutId: string }>();
  const workoutId = params.workoutId ? +params.workoutId : undefined;

  const workout = useWorkout(workoutId ?? null);

  const [validating, setValidating] = useState(false);
  const [name, setName] = useState(workout?.name ?? "");
  const [movements, updateMovements] = useImmer<[number, Movement | null][]>(
    workout?.movements.map((m, i) => [i, m]) ?? []
  );

  return (
    <section>
      <h2>Workout Builder</h2>
      <form
        action={async function (formData) {
          setValidating(true);
          const workoutValidation = validateWorkout(formData);
          if (workoutValidation.valid) {
            try {
              await saveWorkout({ ...workoutValidation.value, id: workoutId });
            } catch (e) {
              console.error("Failed to save workout", e);
            }
          } else {
            console.warn("Workout is invalid", workoutValidation.errors);
          }
        }}
      >
        <fieldset>
          <label>
            Workout Name:{" "}
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={validating && !name.trim() ? true : undefined}
            />
          </label>
        </fieldset>
        <h3>Movements</h3>
        <fieldset>
          {movements.map(([key, m], i) => (
            <MovementBuilder
              key={key}
              index={i}
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
                const last = draft[draft.length - 1]?.[0] ?? -1;
                draft.push([last + 1, null]);
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
  index,
  onRemove,
}: {
  movement: Movement | null;
  index: number;
  onRemove: () => void;
}) {
  const [sets, updateSets] = useImmer<readonly [number, Set | null][]>(
    movement?.sets.map((s, i) => [i, s]) ?? [[0, null]]
  );

  return (
    <fieldset>
      <label>
        Movement name:{" "}
        <input
          type="text"
          name="movement-name"
          defaultValue={movement?.name ?? ""}
        />
      </label>
      {sets.map(([key, s], i) => (
        <SetEditor
          key={key}
          set={s}
          movementIndex={index}
          onRemove={() =>
            updateSets((draft) => {
              draft.splice(i, 1);
            })
          }
        />
      ))}
      <label>
        Rest time
        <input
          type="number"
          name={`movements[${index}].restSeconds`}
          defaultValue={movement?.restSeconds ?? ""}
          placeholder="seconds"
        />
      </label>
      <fieldset className="grid">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            updateSets((draft) => {
              const last = draft[draft.length - 1]?.[0] ?? -1;
              draft.push([last + 1, null]);
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
  movementIndex,
  onRemove,
}: {
  movementIndex: number;
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
        name={`movements[${movementIndex}].sets[].count`}
        value={repeat ?? ""}
        onChange={(e) =>
          setRepeat(e.target.value ? +e.target.value : undefined)
        }
        aria-invalid={repeat ? repeat < 1 : undefined}
      />
      <input
        type="number"
        placeholder="Reps"
        name={`movements[${movementIndex}].sets[].reps`}
        value={reps ?? ""}
        onChange={(e) => setReps(numbdfined(e.target.value))}
        aria-invalid={reps ? reps < 1 : undefined}
      />
      <input
        type="text"
        placeholder="Weight"
        value={weight ?? ""}
        name={`movements[${movementIndex}].sets[].prescribed`}
        onChange={(e) => setWeight(e.target.value)}
        aria-invalid={weight ? !parsePrescription(weight) : undefined}
      />
    </HiddenDeleteFieldset>
  );
}

type Valid<T> = {
  valid: true;
  value: T;
};
type Error = {
  name: string;
  index?: number;
  message: string;
};
type Invalid = { valid: false; errors: readonly Error[] };
type Validated<T> = Valid<T> | Invalid;

function validateWorkout(formData: FormData): Validated<Workout> {
  const errors: Error[] = [];

  const name = formData.get("name")?.toString().trim();
  if (!name) {
    errors.push({ name: "name", message: "Name is required" });
  }

  const movements = validateMovements(formData);
  if (!movements.valid) {
    errors.push(...movements.errors);
  }

  if (movements.valid && name) {
    return {
      valid: true,
      value: { name, movements: movements.value },
    };
  } else {
    return { valid: false, errors };
  }
}

function validateMovements(formData: FormData): Validated<Movement[]> {
  const movements: Movement[] = [];
  const errors: Error[] = [];
  formData.getAll("movement-name").forEach((name, i) => {
    const validated = validateMovement(i, name.toString(), formData);
    if (!validated.valid) {
      errors.push(...validated.errors);
    } else {
      movements.push(validated.value);
    }
  });
  if (movements.length === 0) {
    errors.push({
      name: "movements",
      message: "At least one movement is required",
    });
  }
  if (errors.length > 0) return { valid: false, errors };
  else return { valid: true, value: movements };
}

function validateMovement(
  index: number,
  name: string,
  formData: FormData
): Validated<Movement> {
  const errors: Error[] = [];
  name = name.trim();
  if (!name) {
    errors.push({
      name: "movement-name",
      index,
      message: "Movement name is required",
    });
  }

  const reps = formData.getAll(`movements[${index}].sets[].reps`);
  const counts = formData.getAll(`movements[${index}].sets[].count`);
  const prescribeds = formData.getAll(`movements[${index}].sets[].prescribed`);
  const restSecondsRaw = formData
    .get(`movements[${index}].restSeconds`)
    ?.toString();

  let restSeconds: number | undefined = undefined;
  if (restSecondsRaw != null) {
    restSeconds = +restSecondsRaw;
    if (isNaN(restSeconds) || restSeconds < 0) {
      errors.push({
        name: `movements[${index}].restSeconds`,
        message: "Rest time must be a non-negative number",
      });
    }
  }

  const sets: Set[] = [];
  reps.forEach((r, i) => {
    const validated = validateSet(
      index,
      i,
      r.toString(),
      counts[i]?.toString(),
      prescribeds[i]?.toString()
    );
    if (!validated.valid) {
      errors.push(...validated.errors);
    } else {
      sets.push(validated.value);
    }
  });

  if (sets.length === 0) {
    errors.push({
      name: `movement[${index}].sets`,
      message: "At least one set is required",
    });
  }

  if (errors.length > 0) return { valid: false, errors };
  else return { valid: true, value: { name, sets, restSeconds } };
}

function validateSet(
  movementIndex: number,
  index: number,
  reps: string,
  count: string,
  prescribed: string
): Validated<Set> {
  const errors: Error[] = [];
  if (!+reps) {
    errors.push({
      name: `movements[${movementIndex}].sets[].reps`,
      index,
      message: "Reps must be a number",
    });
  }
  if (!+count) {
    errors.push({
      name: `movements[${movementIndex}].sets[].count`,
      index,
      message: "Sets must be a number",
    });
  }
  const prescription = prescribed ? parsePrescription(prescribed) : null;
  if (prescribed && !prescription) {
    errors.push({
      name: `movements[${movementIndex}].sets[].prescribed`,
      index,
      message: "Prescription is not valid",
    });
  }
  if (errors.length > 0) return { valid: false, errors };
  else {
    return {
      valid: true,
      value: {
        reps: +reps,
        count: +count,
        prescribed: prescription ?? undefined,
      },
    };
  }
}
