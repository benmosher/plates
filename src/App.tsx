import { determinePlates, determineWeightSpace } from "./plate-math";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useMassStorage, type Plate } from "./plate-db";

type BarDisplay = {
  barLength: number;
  handleWidth: number;
};

/** special variables for different bars */
type SpecialtyBar = BarDisplay & {
  name: string;
  weight: number;
  sliderMinStep?: number;

  /** the heaviest plate to put on this */
  plateThreshold?: number;

  maxLoad?: number;
};

// the first number is the highest bar weight for that config
const BARS: [number, SpecialtyBar][] = [
  [
    5,
    {
      name: "Technique bar",
      weight: 5,
      maxLoad: 55, // including bar
      barLength: 300,
      handleWidth: 140,
    },
  ],
  [
    15,
    {
      name: "Olympic dumbbell",
      weight: 12.5,
      plateThreshold: 10,
      barLength: 260,
      handleWidth: 80,
    },
  ],
  [
    34.9,
    { name: "Junior barbell", weight: 22.5, barLength: 400, handleWidth: 120 },
  ],
  [
    Infinity,
    {
      name: "Olympic barbell",
      weight: 45,
      barLength: 500,
      handleWidth: 200,
      sliderMinStep: 5,
    },
  ],
];

function numbdfined(value: string | null | undefined) {
  return value ? +value : undefined;
}

function DisplayPlate({
  thicknessMm,
  diameterMm,
  color,
}: Pick<Plate, "thicknessMm" | "diameterMm" | "color">) {
  return (
    <div
      style={{
        width: thicknessMm,
        height: diameterMm,
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
        flexShrink: 0,
      }}
    />
  );
}

function Handle({
  barLength,
  handleWidth,
}: {
  barLength: number;
  handleWidth: number;
}) {
  return (
    <>
      <Nubbin />
      <div
        style={{
          border: "1px solid",
          borderRadius: 4,
          maxWidth: "95%",
          // flexShrink: 1,
          width: barLength,
          height: 18,
          margin: `0 -100px`,
          background: HANDLE_COLOR,
          zIndex: -2,
        }}
      />
      <Nubbin />
    </>
  );
}

type State = {
  /** target weight */
  target?: number;
  /** bar weight */
  barWeight?: number;
};

function getUrlState(): State {
  // use hash as search
  const params = new URLSearchParams("?" + window.location.hash.slice(1));
  return {
    target: numbdfined(params.get("tw")) ?? 47.5,
    barWeight: numbdfined(params.get("bw")) ?? 12.5,
  };
}

export default function App() {
  const plates = useMassStorage();
  const setPlates = () => {
    console.warn("plate editing not implemented");
  };
  const [state, setState] = useState<State>(getUrlState);
  const { target, barWeight } = state;

  const updateTarget = useCallback((v: number | undefined) => {
    setState((s) => ({ ...s, target: v }));
  }, []);
  const updateBarWeight = useCallback((v: number | undefined) => {
    setState((s) => ({ ...s, barWeight: v }));
  }, []);

  const saveURLState = () => {
    const currentUrlState = getUrlState();
    if (
      currentUrlState.target === target &&
      currentUrlState.barWeight === barWeight
    )
      return; // don't push a state if we're matching
    history.pushState(null, "", `#tw=${target}&bw=${barWeight}`);
  };

  // slider does not have onBlur,
  // so debounce all changes instead
  useEffect(
    function saveToUrlDebounced() {
      const cancelHandle = setTimeout(saveURLState, 1000);
      return () => clearTimeout(cancelHandle);
    },
    [target, barWeight]
  );

  useEffect(
    function listenToPopState() {
      const onPopState = () => {
        setState(getUrlState());
      };
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    },
    [setState]
  );

  // find the closest matching bar config
  const barIndex =
    BARS.findIndex(([breakpoint]) => (barWeight ?? 0) <= breakpoint) ??
    BARS.length - 1;

  const bar = BARS[barIndex][1];

  const validPlates = useMemo<readonly Plate[]>(() => {
    const filtered = plates.filter(
      (p) =>
        p.count &&
        p.weight &&
        // discard plates above the bar's threshold
        (!bar.plateThreshold || p.weight <= bar.plateThreshold)
    ) as Plate[];
    filtered.sort((a, b) => a.weight - b.weight);
    return filtered;
  }, [plates, bar]);

  const weightStep = validPlates[0] ? 2 * validPlates[0].weight : undefined;
  const possibleWeights = useMemo(() => {
    let weights = determineWeightSpace(
      barWeight,
      // TODO: pass raw Plates and expand internally
      validPlates.flatMap((p) =>
        Array.from({ length: p.count }, () => p.weight)
      )
    );
    const { maxLoad } = bar;
    if (maxLoad != null && weights[weights.length - 1] > maxLoad) {
      weights = weights.filter((w) => w <= maxLoad);
    }
    return weights;
  }, [barWeight, validPlates]);
  const weightMin = possibleWeights ? possibleWeights[0] : undefined;
  const weightMax = possibleWeights
    ? possibleWeights[possibleWeights.length - 1]
    : undefined;
  const determinedPlates = determinePlates(target, barWeight, validPlates);
  const validTarget = possibleWeights.includes(target ?? -1);

  return (
    <>
      <section
        style={{
          height: Math.max(...validPlates.map((p) => p.diameterMm)) + 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Nubbin />
        {determinedPlates
          .toReversed()
          .flatMap((plate) =>
            Array.from({ length: plate.count }, (_, j) => (
              <DisplayPlate key={`left-${plate.weight}-${j}`} {...plate} />
            ))
          )}
        <Handle {...bar} />
        {determinedPlates.flatMap((plate) =>
          Array.from({ length: plate.count }, (_, j) => (
            <DisplayPlate key={`right-${plate.weight}-${j}`} {...plate} />
          ))
        )}
        <Nubbin />
      </section>
      <h3>
        {validTarget
          ? determinedPlates
              .map((p) => (p.count > 1 ? `${p.weight}x${p.count}` : p.weight))
              .join(", ") || "(empty)"
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
        <fieldset onBlur={saveURLState}>
          <legend>Input work weight:</legend>
          <input
            id="target-number"
            type="number"
            value={target}
            min={weightMin}
            max={weightMax}
            step={weightStep}
            onChange={(e) => updateTarget(numbdfined(e.target.value))}
            aria-invalid={!validTarget}
          />
          <label>
            <input
              id="target-range"
              type="range"
              list="target-options"
              min={weightMin}
              max={weightMax}
              step={bar.sliderMinStep ?? weightStep}
              value={target}
              onChange={(e) => updateTarget(numbdfined(e.target.value))}
            />
            <small>use slider for quick changes!</small>
          </label>
        </fieldset>
      </form>

      <details open>
        <summary>Bar/handle</summary>
        <form>
          <label>
            Bar weight:
            <input
              type="number"
              value={barWeight}
              onChange={(e) => updateBarWeight(numbdfined(e.target.value))}
            />
          </label>
          <fieldset>
            <legend>Style:</legend>
            {BARS.map(([, bar], idx) => (
              <fieldset key={idx}>
                <label>
                  <input
                    type="radio"
                    name="bar"
                    checked={barIndex === idx}
                    onChange={() => updateBarWeight(bar.weight)}
                  />
                  {bar.name}
                </label>
                {barIndex == idx && (
                  <fieldset role="group">
                    <input
                      type="number"
                      readOnly
                      placeholder="(no max plate)"
                      value={bar.plateThreshold}
                    />
                  </fieldset>
                )}
              </fieldset>
            ))}
          </fieldset>
        </form>
      </details>
      <details>
        <summary>Plates (pairs)</summary>
        <form>
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
