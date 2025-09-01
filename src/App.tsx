import "./styles.css";
import { determinePlates } from "./plate-math";
import { useImmer } from "use-immer";
import React, { useState } from "react";

const HANDLE_DEFAULT = 12.5;
const PLATES = [0.25, 0.5, 0.75, 1, 2.5, 5, 10];

export default function App() {
  const [target, setTarget] = useState<number>(75);
  const [handle, setHandle] = useState<number>(HANDLE_DEFAULT);
  const [plates, setPlates] = useImmer<number[]>(PLATES);
  return (
    <div className="App">
      <h1>🏋️</h1>
      <div
        className="form-grid"
        role="group"
        aria-label="Plate calculator inputs"
      >
        <label htmlFor="handle">Handle</label>
        <input
          id="handle"
          type="number"
          value={handle}
          onChange={(e) => setHandle(+e.target.value)}
        />

        <label htmlFor="target">Work weight</label>
        <input
          id="target"
          type="number"
          value={target}
          // step by 2x smallest plate
          step={2 * plates.reduce((acc, p) => (p < acc ? p : acc), 1)}
          onChange={(e) => setTarget(+e.target.value)}
        />
      </div>
      <div>Plates: {determinePlates(target, handle, plates).join(", ")}</div>
      <div>
        <h2>Plates available</h2>
        <div className="plates-available">
          {plates.map((plate, index) => (
            <div key={index} className="plate">
              <input
                type="number"
                step={0.25}
                min={0}
                value={plate}
                onChange={(e) =>
                  setPlates((d) => {
                    d[index] = +e.target.value;
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
          <button
            type="button"
            onClick={() =>
              setPlates((draft) => {
                draft.push(plates[plates.length - 1] || 5);
              })
            }
          >
            Add Plate
          </button>
        </div>
      </div>
    </div>
  );
}
