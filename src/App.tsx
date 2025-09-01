import "./styles.css";
import { determinePlates } from "./plate-math";
import { useImmer } from "use-immer";
import React, { useMemo, useState } from "react";

const HANDLE_DEFAULT = 12.5;
const PLATES = [0.25, 0.5, 0.75, 1, 2.5, 5, 10];

const PLATE_STYLES = {
  10: { x: 20, y: 100, color: "bg-gray-500" },
  5: { x: 15, y: 80, color: "bg-gray-500" },
  2.5: { x: 12, y: 70, color: "bg-gray-500" },
  1: { x: 12, y: 60, color: "bg-red-500" },
  0.75: { x: 10, y: 60, color: "bg-blue-500" },
  0.5: { x: 8, y: 60, color: "bg-yellow-500" },
  0.25: { x: 6, y: 60, color: "bg-green-500" },
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

export default function App() {
  const [target, setTarget] = useState<number | undefined>(75);
  const [handle, setHandle] = useState<number | undefined>(HANDLE_DEFAULT);
  const [plates, setPlates] = useImmer<(number | undefined)[]>(PLATES);
  const validPlates = useMemo(() => {
    const filtered = plates.filter((p) => !!p) as number[];
    filtered.sort((a, b) => a - b);
    return filtered;
  }, [plates]);

  const determinedPlates = determinePlates(target, handle, validPlates);

  return (
    <div className="m-5">
      <h1 className="text-3xl">🏋️</h1>
      <div
        className="grid grid-cols-2"
        role="group"
        aria-label="Plate calculator inputs"
      >
        <label htmlFor="handle">Handle</label>
        <NumberInput id="handle" value={handle} onChange={setHandle} />

        <label htmlFor="target">Work weight</label>
        <NumberInput
          id="target"
          value={target}
          onChange={setTarget}
          // step by 2x smallest plate
          step={
            2 *
            (plates.reduce((acc, p) => (p && acc && p < acc ? p : acc), 1) ??
              0.5)
          }
        />
      </div>
      <div>
        <h2 className="text-2xl">Plates needed:</h2>
        <div className="text-xl my-2">{determinedPlates.join(", ")}</div>
        <div className="h-[100px] p-1 flex items-center">
          {determinedPlates.map((plate, i) => {
            const style = PLATE_STYLES[plate];
            if (!style) return null;
            const { x, y, color } = style;
            return (
              <div
                key={i}
                className={`border border-1 ${color}`}
                style={{ width: x, height: y }}
              >
                &nbsp;
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-5">
        <h2 className="text-xl">Plates available:</h2>
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
    </div>
  );
}
