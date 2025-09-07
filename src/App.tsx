import "./styles.css";
import { determinePlates, determineWeightSpace } from "./plate-math";
import { useImmer } from "use-immer";
import cx from "classnames";
import React, { useCallback, useMemo, useState } from "react";

const HANDLE_DEFAULT = 12.5;
const PLATES = [0.25, 0.5, 0.75, 1, 2.5, 5, 10, 10, 10];

// note: default plate should not be needed!
const DEFAULT_PLATE = { x: 30, y: 100, color: "bg-purple-500" };
const PLATE_STYLES = {
  10: { x: 20, y: 114, color: "bg-gray-500" },
  5: { x: 15, y: 93, color: "bg-gray-500" },
  2.5: { x: 10, y: 80, color: "bg-gray-500" },
  1: { x: 13, y: 63, color: "bg-red-500" },
  0.75: { x: 10, y: 60, color: "bg-blue-500" },
  0.5: { x: 9, y: 60, color: "bg-yellow-500" },
  0.25: { x: 8, y: 57, color: "bg-green-500" },
};

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
      className="border border-gray-800 p-0.5 text-right"
      type="number"
      value={value}
      min={min}
      onChange={(e) => onChange(numbdfined(e.target.value))}
      onBlur={onBlur}
      step={step}
    />
  );
}

function Button({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-gray-800 p-2 bg-gray-500"
    >
      {children}
    </button>
  );
}

function Plate({ weight }: { weight: number }) {
  const { x, y, color } = PLATE_STYLES[weight] ?? DEFAULT_PLATE;
  return (
    <div
      className={`border rounded-lg ${color} text-center overflow-hidden mx-[-0.5px]`}
      style={{ width: x, height: y }}
    >
      &nbsp;
    </div>
  );
}

function Handle() {
  return (
    <>
      <div
        className={`border bg-gray-400 text-center overflow-visible`}
        style={{ width: 10, height: 30, margin: "0 -6px", zIndex: -1 }}
      >
        &nbsp;
      </div>
      <div
        className={`border bg-gray-400 text-center overflow-visible`}
        style={{
          maxWidth: "95%",
          width: 320,
          height: 20,
          margin: "0 -120px",
          zIndex: -2,
        }}
      >
        &nbsp;
      </div>
      <div
        className={`border bg-gray-400 text-center overflow-visible`}
        style={{ width: 10, height: 30, margin: "0 -6px", zIndex: -1 }}
      >
        &nbsp;
      </div>
    </>
  );
}

export default function App() {
  const [target, setTarget] = useState<number | undefined>(47.5);
  const [handle, setHandle] = useState<number | undefined>(HANDLE_DEFAULT);
  const [plates, setPlates] = useImmer<(number | undefined)[]>(PLATES);
  const validPlates = useMemo(() => {
    const filtered = plates.filter((p) => !!p) as number[];
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
    <div className="m-5">
      <div className="my-5">
        <div
          className={cx("h-[120px] p-1 my-8 flex items-center justify-center", {
            "opacity-50": !validTarget,
          })}
        >
          {determinedPlates.toReversed().map((plate, i) => (
            <Plate key={-i - 1} weight={plate} />
          ))}
          <Handle />
          {determinedPlates.map((plate, i) => (
            <Plate key={i} weight={plate} />
          ))}
        </div>
        <div className="text-xl my-2">
          {validTarget
            ? determinedPlates.join(", ") || "(empty)"
            : "No valid plate combination!"}
        </div>
      </div>
      <div
        className="grid grid-cols-2"
        role="group"
        aria-label="Plate calculator inputs"
      >
        <label htmlFor="handle">Handle + collars</label>
        <NumberInput id="handle" value={handle} onChange={setHandle} />
        <datalist id="target-options">
          {possibleWeights?.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </datalist>
        <label htmlFor="target">Work weight</label>
        <input
          id="target-number"
          type="number"
          className={cx("border p-0.5 text-right", {
            "border-red-300": !validTarget,
            "border-gray-800": validTarget,
          })}
          value={target}
          min={weightMin}
          max={weightMax}
          step={weightStep}
          onChange={onWeightChange}
        />

        <input
          id="target-range"
          type="range"
          list="target-options"
          min={weightMin}
          max={weightMax}
          step={weightStep}
          className="m-4 mb-8 col-span-2"
          value={target}
          onChange={onWeightChange}
        />
      </div>

      <div className="mt-5">
        <h2 className="text-xl">Plates available (as pairs, per dumbbell):</h2>
        <div className="plates-available">
          {plates.map((plate, index) => (
            <div key={index} className="plate">
              <NumberInput
                step={0.25}
                min={0}
                value={plate}
                onChange={(e) =>
                  setPlates((d) => {
                    d[index] = e;
                  })
                }
                onBlur={() =>
                  setPlates((d) => {
                    d.sort((a, b) => a - b);
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
                ❌
              </button>
            </div>
          ))}
          <Button
            onClick={() =>
              setPlates((draft) => {
                draft.push(plates[plates.length - 1] || 5);
              })
            }
          >
            Add Plate
          </Button>
        </div>
      </div>
      <div className="py-5">
        <h2 className="text-2xl">Equipment:</h2>
        <ul className="list-disc pl-5 underline">
          <li>
            <a href="https://amzn.to/45WSXPC">Handles</a>
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
        <div className="text-sm my-3">
          As an Amazon Associate, I earn from qualifying purchases.
        </div>
      </div>
    </div>
  );
}
