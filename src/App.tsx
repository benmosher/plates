import "./styles.css";
import React, { useState } from "react";

const HANDLE_DEFAULT = 12.5;
const PLATES = [0.25, 0.5, 0.75, 1, 2.5, 5, 10, 10, 10];

function determinePlates(target: number, handle: number) {
  const platesNeeded: number[] = [];
  let weightLeft = (target - handle) / 2;

  for (let i = PLATES.length - 1; i >= 0; i--) {
    const nextPlate = PLATES[i];
    if (nextPlate <= weightLeft) {
      platesNeeded.push(nextPlate);
      weightLeft -= nextPlate;
    }
  }

  return platesNeeded;
}

export default function App() {
  const [target, setTarget] = useState<number>(75);
  const [handle, setHandle] = useState<number>(HANDLE_DEFAULT);
  return (
    <div className="App">
      <h1>🏋️</h1>
      <div>
        <label>
          Handle:
          <input
            type="number"
            value={handle}
            onChange={(e) => setHandle(+e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Work weight:
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(+e.target.value)}
          />
        </label>
      </div>
      <div>Plates: {determinePlates(target, handle).join(", ")}</div>
    </div>
  );
}
