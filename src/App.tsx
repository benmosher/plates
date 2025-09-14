import { determineWeightSpace } from "./plate-math";
import { useImmer } from "use-immer";
import React, { useCallback, useMemo, useState } from "react";
import { wasm_determine_plates } from "./rusty/rusty.js";

const HANDLE_DEFAULT = 12.5;
type Plate = {
  weight: number;
  x: number;
  y: number;
  color: string;
  count: number;
};
const PLATES_DEFAULT: readonly Plate[] = [
  { weight: 0.25, x: 8, y: 57, color: "#62D926", count: 1 },
  { weight: 0.5, x: 9, y: 60, color: "#FFBF00", count: 1 },
  { weight: 0.75, x: 10, y: 60, color: "#3C71F7", count: 1 },
  { weight: 1, x: 13, y: 63, color: "#EE402E", count: 1 },
  { weight: 1.25, x: 10, y: 63, color: "#6F7887", count: 0 },
  { weight: 2.5, x: 10, y: 80, color: "#8891A4", count: 1 },
  { weight: 5, x: 15, y: 93, color: "#7B8495", count: 1 },
  { weight: 10, x: 20, y: 114, color: "#6F7887", count: 3 },
];

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

function DisplayPlate({ x, y, color }: Pick<Plate, "x" | "y" | "color">) {
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

const HANDLE_COLOR = "#A4ACBA";
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
  const [plates, setPlates] =
    useImmer<readonly Partial<Plate>[]>(PLATES_DEFAULT);
  const validPlates = useMemo<readonly Plate[]>(() => {
    const filtered = plates.filter(
      (p) => p.count && p.weight && p.color && p.x && p.y
    ) as Plate[];
    filtered.sort((a, b) => a.weight - b.weight);
    return filtered;
  }, [plates]);

  const weightStep = validPlates[0] ? 2 * validPlates[0].weight : undefined;
  const possibleWeights = useMemo(
    () =>
      determineWeightSpace(
        handle,
        // TODO: pass raw Plates and expand internally
        validPlates.flatMap((p) =>
          Array.from({ length: p.count }, () => p.weight)
        )
      ),
    [handle, validPlates]
  );
  const weightMin = possibleWeights ? possibleWeights[0] : undefined;
  const weightMax = possibleWeights
    ? possibleWeights[possibleWeights.length - 1]
    : undefined;

  const determinedPlates: readonly Plate[] = Array.from(
    wasm_determine_plates(target, handle, validPlates),
    (w: number) => validPlates.find((p) => p.weight === w)!
  );
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
          <DisplayPlate key={-i - 1} {...plate} />
        ))}
        <Handle />
        {determinedPlates.map((plate, i) => (
          <DisplayPlate key={i} {...plate} />
        ))}
        <Nubbin />
      </section>
      <h3>
        {validTarget
          ? determinedPlates.map((p) => p.weight).join(", ") || "(empty)"
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
        <fieldset>
          <legend>Input work weight:</legend>
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
          <label>
            ...or use slider:
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
        </fieldset>
      </form>

      <details>
        <summary>Weights</summary>
        <form>
          <label>
            Handle + collars
            <NumberInput id="handle" value={handle} onChange={setHandle} />
          </label>
          <label>
            <h3>Pairs of plates (per dumbbell)</h3>
          </label>
          {plates.map((plate, index) => (
            <fieldset role="group" key={index}>
              <input type="number" value={plate.weight} readOnly />
              <input
                type="color"
                value={plate.color}
                onChange={(e) =>
                  setPlates((d) => {
                    d[index].color = e.target.value;
                  })
                }
              />
              <input
                type="number"
                step={1}
                min={0}
                value={plate.count}
                onChange={(e) =>
                  setPlates((d) => {
                    d[index].count = numbdfined(e.target.value);
                  })
                }
              />
              <button
                type="button"
                disabled={!plate.count}
                onClick={() =>
                  setPlates((d) => {
                    d[index].count! -= 1;
                  })
                }
              >
                -
              </button>
              <button
                type="button"
                onClick={() =>
                  setPlates((d) => {
                    d[index].count = (d[index].count ?? 0) + 1;
                  })
                }
              >
                +
              </button>
            </fieldset>
          ))}
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
