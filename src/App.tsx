import "./styles.css";
import { determinePlates } from "./plate-math";
import { useImmer } from "use-immer";
import React, { useMemo, useState } from "react";

const HANDLE_DEFAULT = 12.5;
const PLATES = [0.25, 0.5, 0.75, 1, 2.5, 5, 10];

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
      <div className="text-2xl my-5">
        Plates: {determinePlates(target, handle, validPlates).join(", ")}
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
