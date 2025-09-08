import { determinePlates, determineWeightSpace } from "./plate-math";
import { useImmer } from "use-immer";
import React, { useCallback, useMemo, useState } from "react";

const HANDLE_DEFAULT = 12.5;
const PLATES_DEFAULT = [
  "0.25",
  "0.5",
  "0.75",
  "1",
  "2.5",
  "5",
  "10",
  "10",
  "10",
];

type Plate = { x: number; y: number; color: string };
const DEFAULT_PLATE: Plate = { x: 30, y: 100, color: "purple" };
const PLATE_STYLES = new Map<number, Plate>([
  [10, { x: 20, y: 114, color: "var(--pico-color-zinc-500)" }],
  [5, { x: 15, y: 93, color: "var(--pico-color-zinc-450)" }],
  [2.5, { x: 10, y: 80, color: "var(--pico-color-zinc-400)" }],
  [1, { x: 13, y: 63, color: "var(--pico-color-red-450)" }],
  [0.75, { x: 10, y: 60, color: "var(--pico-color-blue-500)" }],
  [0.5, { x: 9, y: 60, color: "var(--pico-color-amber-200)" }],
  [0.25, { x: 8, y: 57, color: "var(--pico-color-green-200)" }],
]);

function numbdfined(value: string | undefined) {
  return value ? +value : undefined;
}

function NumberInput({
  id,
  value,
  onChange,
  onBlur,
  step,
  min,
}: {
  id?: string;
  value?: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  step?: number;
  min?: number;
}) {
  return (
    <input
      id={id}
      type="number"
      value={value}
      min={min}
      onChange={(e) => onChange(numbdfined(e.target.value))}
      onBlur={onBlur}
      step={step}
    />
  );
}

function Plate({ weight }: { weight: number }) {
  const { x, y, color } = PLATE_STYLES.get(weight) ?? DEFAULT_PLATE;
  return (
    <div
      style={{
        width: x,
        height: y,
        border: "1px solid",
        background: color,
        borderRadius: 8,
        margin: "0 -0.5px",
      }}
    >
      &nbsp;
    </div>
  );
}

const HANDLE_COLOR = "var(--pico-color-zinc-300)";
function Nubbin() {
  return (
    <div
      style={{
        width: 8,
        height: 30,
        margin: "0 -4px",
        zIndex: -1,
        overflow: "visible",
        background: HANDLE_COLOR,
        border: "1px solid",
        borderRadius: 2,
      }}
    />
  );
}

function Handle() {
  return (
    <>
      <Nubbin />
      <div
        style={{
          border: "1px solid",
          borderRadius: 4,
          maxWidth: "95%",
          width: 320,
          height: 18,
          margin: "0 -120px",
          background: HANDLE_COLOR,
          zIndex: -2,
        }}
      />
      <Nubbin />
    </>
  );
}

export default function App() {
  const [target, setTarget] = useState<number | undefined>(47.5);
  const [handle, setHandle] = useState<number | undefined>(HANDLE_DEFAULT);
  const [plates, setPlates] = useImmer<(string | undefined)[]>(PLATES_DEFAULT);
  const validPlates = useMemo(() => {
    const filtered = plates.map((p) => numbdfined(p)).filter((p) => p != null);
    filtered.sort((a, b) => a - b);
    return filtered;
  }, [plates]);

  const weightStep = validPlates[0] ? 2 * validPlates[0] : undefined;
  const possibleWeights = useMemo(
    () => determineWeightSpace(handle, validPlates),
    [handle, validPlates]
  );
  const weightMin = possibleWeights ? possibleWeights[0] : undefined;
  const weightMax = possibleWeights
    ? possibleWeights[possibleWeights.length - 1]
    : undefined;
  const determinedPlates = determinePlates(target, handle, validPlates);
  const validTarget = possibleWeights.includes(target ?? -1);

  const onWeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTarget(numbdfined(e.target.value));
    },
    [setTarget]
  );

  return (
    <>
      <section
        style={{
          height: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Nubbin />
        {determinedPlates.toReversed().map((plate, i) => (
          <Plate key={-i - 1} weight={plate} />
        ))}
        <Handle />
        {determinedPlates.map((plate, i) => (
          <Plate key={i} weight={plate} />
        ))}
        <Nubbin />
      </section>
      <h3>
        {validTarget
          ? determinedPlates.join(", ") || "(empty)"
          : "No valid plate combination!"}
      </h3>
      <form>
        <datalist id="target-options">
          {possibleWeights?.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </datalist>
        <label>
          Input work weight:
          <input
            id="target-number"
            type="number"
            value={target}
            min={weightMin}
            max={weightMax}
            step={weightStep}
            onChange={onWeightChange}
            aria-invalid={!validTarget}
          />
          <input
            id="target-range"
            type="range"
            list="target-options"
            min={weightMin}
            max={weightMax}
            step={weightStep}
            value={target}
            onChange={onWeightChange}
          />
        </label>
      </form>

      <details>
        <summary>Available weights</summary>
        <form>
          <label>
            Handle + collars
            <NumberInput id="handle" value={handle} onChange={setHandle} />
          </label>
          <label>Pairs of plates (per dumbbell)</label>
          {plates.map((plate, index) => (
            <fieldset role="group" key={index}>
              <input
                type="number"
                step={0.25}
                min={0}
                value={plate}
                onChange={(e) =>
                  setPlates((d) => {
                    d[index] = e.target.value;
                  })
                }
                onBlur={() =>
                  setPlates((d) => {
                    d.sort((a, b) => +a! - +b!);
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  setPlates((draft) => {
                    draft.splice(index, 1);
                  })
                }
              >
                Remove
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() =>
              setPlates((draft) => {
                draft.push(plates[plates.length - 1] || "5");
              })
            }
          >
            Add Plate
          </button>
        </form>
      </details>
      <details>
        <summary>Ready for more?</summary>
        <ul>
          <li>
            <a href="https://amzn.to/45WSXPC">
              Loadable Olympic dumbbell handles
            </a>
          </li>
          <li>
            <a href="https://amzn.to/3JYYlKC">Fractional plate set (lb)</a>
          </li>
          <li>
            <a href="https://amzn.to/3K0g04B">10lb plates</a>
          </li>
          <li>
            <a href="https://amzn.to/4n4LCEA">5lb plates</a>
          </li>
          <li>
            <a href="https://amzn.to/4g1AaXY">2.5lb plates</a>
          </li>
          <li>
            <a href="https://amzn.to/45Rkthi">Collars</a>
          </li>
        </ul>
        <small>As an Amazon Associate, I earn from qualifying purchases.</small>
      </details>
    </>
  );
}
