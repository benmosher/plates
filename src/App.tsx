import { chooseBar, determinePlates, determineWeightSpace } from "./plate-math";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useMassStorage, type Plate, type Bar } from "./plate-db";

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

function Handle({ barLength }: { barLength: number }) {
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
  /** best match bar type */
  barType?: string;
};

function getUrlState(): State {
  // use hash as search
  const params = new URLSearchParams("?" + window.location.hash.slice(1));
  return {
    target: numbdfined(params.get("weight")) ?? 185,
    barType: params.get("bar") ?? "barbell",
  };
}

export default function App() {
  const { plates, bars, putPlate } = useMassStorage();

  const [state, setState] = useState<State>(getUrlState);
  const { target, barType } = state;

  const updateTarget = useCallback((v: number | undefined) => {
    setState((s) => ({ ...s, target: v }));
  }, []);

  const saveURLState = () => {
    const currentUrlState = getUrlState();
    if (
      currentUrlState.target === target &&
      currentUrlState.barType === barType
    )
      return; // don't push a state if we're matching
    history.pushState(null, "", `#weight=${target}&bar=${barType}`);
  };

  // slider does not have onBlur,
  // so debounce all changes instead
  useEffect(
    function saveToUrlDebounced() {
      const cancelHandle = setTimeout(saveURLState, 1000);
      return () => clearTimeout(cancelHandle);
    },
    [target, barType]
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

  const activeBar = chooseBar(bars, target, barType);
  const barWeight = activeBar?.weight;

  const barTypes = bars.reduce((set, b) => set.add(b.type), new Set<string>());

  const validPlates = useMemo<readonly (Plate & { count: number })[]>(() => {
    const filtered = plates.filter((p) => p.count && p.weight) as (Plate & {
      count: number;
    })[];
    filtered.sort((a, b) => a.weight - b.weight);
    return filtered;
  }, [plates, activeBar]);

  const weightStep = validPlates[0] ? 2 * validPlates[0].weight : undefined;

  const possibleWeights = useMemo(
    () =>
      determineWeightSpace(
        bars.filter((b) => b.type === barType),
        validPlates
      ),
    [bars, validPlates]
  );
  const weightMin = possibleWeights ? possibleWeights[0] : undefined;
  const weightMax = possibleWeights
    ? possibleWeights[possibleWeights.length - 1]
    : undefined;
  const determinedPlates = determinePlates(target, activeBar, validPlates);
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
        <Handle {...activeBar} />
        {determinedPlates.flatMap((plate) =>
          Array.from({ length: plate.count }, (_, j) => (
            <DisplayPlate key={`right-${plate.weight}-${j}`} {...plate} />
          ))
        )}
        <Nubbin />
      </section>
      <section>
        <p>
          Bar:&nbsp;
          <b>{activeBar ? `${activeBar.name} (${barWeight})` : "no bar!"}</b>
        </p>
        <p>
          Plates:&nbsp;
          <b>
            {validTarget
              ? determinedPlates
                  .map((p) =>
                    p.count > 1 ? `${p.weight}x${p.count}` : p.weight
                  )
                  .join(", ") || "(empty)"
              : "No valid plate combination!"}
          </b>
        </p>
      </section>
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
          <fieldset role="group">
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
            <select
              value={barType}
              aria-invalid={!validTarget}
              onChange={(e) =>
                setState((s) => ({ ...s, barType: e.target.value }))
              }
            >
              {Array.from(barTypes).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </fieldset>
          <label>
            <input
              id="target-range"
              type="range"
              list="target-options"
              min={weightMin}
              max={weightMax}
              step={weightStep}
              value={target}
              onChange={(e) => updateTarget(numbdfined(e.target.value))}
            />
            <small>use slider for quick changes!</small>
          </label>
        </fieldset>
      </form>

      {/* <details open>
        <summary>Bar/handle</summary>
        <form>
          <label>
            Bar weight:
            <input
              type="number"
              value={barWeight}
              // onChange={(e) => updateBarWeight(numbdfined(e.target.value))}
            />
          </label>
          <fieldset>
            <legend>Style:</legend>
            <fieldset>
              <label>
                <input
                  type="radio"
                  name="bar"
                  checked={activeBar.idx == null}
                />
                Heaviest bar of type:
              </label>
              <select name="barType">
                {[...barTypes].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </fieldset>
            {bars.map((bar) => (
              <fieldset key={bar.idx}>
                <label>
                  <input
                    type="radio"
                    name="bar"
                    checked={activeBar.idx === bar.idx}
                    // onChange={() => updateBarWeight(bar.weight)}
                  />
                  {bar.name}
                </label>
                {activeBar.idx == bar.idx && (
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
      </details> */}
      <details>
        <summary>Plates (pairs)</summary>
        <form>
          {plates.map((plate, index) => (
            <fieldset role="group" key={index}>
              <input type="number" value={plate.weight} readOnly />
              <input
                type="color"
                value={plate.color}
                onChange={(e) => putPlate({ ...plate, color: e.target.value })}
              />
              <input
                type="number"
                step={1}
                min={0}
                value={plate.count}
                onChange={(e) => {
                  // todo: undefined plate count?
                  putPlate({ ...plate, count: numbdfined(e.target.value) });
                }}
              />
              <button
                type="button"
                disabled={!plate.count}
                onClick={() =>
                  putPlate({ ...plate, count: (plate.count ?? 1) - 1 })
                }
              >
                -
              </button>
              <button
                type="button"
                onClick={() =>
                  putPlate({ ...plate, count: (plate.count ?? 0) + 1 })
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
