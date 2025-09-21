import {
  chooseBar,
  closestTarget,
  determinePlates,
  determineWeightSpace,
} from "./plate-math";
import React, { useMemo, useReducer, useState } from "react";
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

  /** percentage-based target */
  percentage?: number;
  /** base weight (e.g. 1RM) */
  percentageBase?: number;
};

function getUrlState(): State {
  // use hash as search
  const params = new URLSearchParams("?" + window.location.hash.slice(1));
  return {
    target: numbdfined(params.get("weight")),
    barType: params.get("bar") ?? undefined,
    percentage: numbdfined(params.get("percentage")),
    percentageBase: numbdfined(params.get("1rm")),
  };
}

function BarEditor(props: { bar: Bar; putBar?: (bar: Bar) => void }) {
  const [bar, setBar] = useState<Partial<Bar>>(props.bar);
  const fieldSetter =
    (field: keyof Bar) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        e.target.type === "number"
          ? numbdfined(e.target.value)
          : e.target.value;
      setBar((b) => ({ ...b, [field]: value }));
    };
  const invalidator = (field: keyof Bar, optional?: boolean) => {
    if (bar[field] == props.bar[field]) return undefined;
    if (bar[field] == null) return true; // invalid
    if (!bar[field]) return !optional || bar[field] != null;
    return false; // valid (not invalid)
  };
  return (
    <article>
      <form>
        <input
          type="text"
          value={bar.name}
          onChange={fieldSetter("name")}
          placeholder="Name"
          aria-invalid={invalidator("name")}
        />
        <fieldset role="group">
          <input
            type="number"
            onChange={fieldSetter("weight")}
            value={bar.weight}
            aria-invalid={invalidator("weight")}
          />
          <input
            type="text"
            value={bar.type}
            onChange={fieldSetter("type")}
            aria-invalid={invalidator("type")}
          />
          <input
            type="number"
            value={bar.plateThreshold}
            onChange={fieldSetter("plateThreshold")}
            placeholder="(no max plate)"
            aria-invalid={invalidator("plateThreshold", true)}
          />
          <input
            type="number"
            value={bar.maxLoad}
            onChange={fieldSetter("maxLoad")}
            placeholder="(no max load)"
            aria-invalid={invalidator("maxLoad", true)}
          />
        </fieldset>
        <small>Weight / Type / Max Plate / Max Load</small>
        <input
          type="submit"
          value="Save"
          disabled={bar == props.bar || !bar.name || !bar.weight || !bar.type}
          onClick={(e) => {
            e.preventDefault();
            if (props.putBar && bar.name && bar.weight && bar.type) {
              props.putBar(bar as Bar);
            }
          }}
        />
      </form>
    </article>
  );
}

function stateReducer(state: State, newState: Partial<State>): State {
  const percentageBase =
    "percentageBase" in newState
      ? newState.percentageBase
      : state.percentageBase;
  const barType = newState.barType ?? state.barType;

  // if the target is being set directly, update percentage
  if ("target" in newState) {
    return {
      target: newState.target,
      percentage:
        percentageBase && newState.target != null
          ? Math.round((newState.target / percentageBase) * 100)
          : undefined,
      percentageBase,
      barType,
    };
  }

  // if the percentage is being set, clear target
  // so it is recomputed outside the reducer
  if ("percentage" in newState) {
    return {
      target: undefined,
      percentage: newState.percentage,
      percentageBase,
      barType,
    };
  }

  if (percentageBase !== state.percentageBase || barType !== state.barType) {
    return { ...state, percentageBase, barType };
  }

  // no changes prescribed
  return state;
}

export default function App() {
  const { plates, bars, putPlate, putBar } = useMassStorage();

  let [{ target, percentage, percentageBase, barType }, dispatchState] =
    useReducer(stateReducer, null, getUrlState);

  // default bar type
  if (!barType && bars[0]) {
    barType = bars[0].type;
  }

  // const saveURLState = () => {
  //   const currentUrlState = getUrlState();
  //   if (
  //     currentUrlState.target === target &&
  //     currentUrlState.barType === barType
  //   )
  //     return; // don't push a state if we're matching
  //   history.pushState(null, "", `#weight=${target}&bar=${barType}`);
  // };

  // // slider does not have onBlur,
  // // so debounce all changes instead
  // useEffect(
  //   function saveToUrlDebounced() {
  //     const cancelHandle = setTimeout(saveURLState, 1000);
  //     return () => clearTimeout(cancelHandle);
  //   },
  //   [target, barType]
  // );

  // useEffect(
  //   function listenToPopState() {
  //     const onPopState = () => {
  //       setState(getUrlState());
  //     };
  //     window.addEventListener("popstate", onPopState);
  //     return () => window.removeEventListener("popstate", onPopState);
  //   },
  //   [setState]
  // );

  const barTypes = bars.reduce((set, b) => set.add(b.type), new Set<string>());

  const validPlates = useMemo<readonly (Plate & { count: number })[]>(() => {
    const filtered = plates.filter((p) => p.count && p.weight) as (Plate & {
      count: number;
    })[];
    filtered.sort((a, b) => a.weight - b.weight);
    return filtered;
  }, [plates]);

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

  // use percentage to determine target if not defined
  if (target == null && percentage != null && percentageBase != null) {
    target = closestTarget(
      (percentage * percentageBase) / 100,
      possibleWeights
    );
  }
  const activeBar = chooseBar(bars, target, barType);
  const barWeight = activeBar?.weight;
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
        <Handle barLength={activeBar?.barLength ?? bars[0]?.barLength} />
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
        <fieldset>
          <legend>Input work weight:</legend>
          <fieldset role="group">
            <input
              id="target-number"
              type="number"
              value={target}
              min={weightMin}
              max={weightMax}
              step={weightStep}
              onChange={(e) =>
                dispatchState({ target: numbdfined(e.target.value) })
              }
              aria-invalid={!validTarget}
            />
            <select
              value={barType}
              aria-invalid={!validTarget}
              onChange={(e) => dispatchState({ barType: e.target.value })}
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
              onChange={(e) =>
                dispatchState({ target: numbdfined(e.target.value) })
              }
            />
            <small>use slider for quick changes!</small>
          </label>
        </fieldset>
      </form>

      <details>
        <summary>Adjust weight by percentage</summary>
        <form>
          <fieldset role="group">
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={percentage}
              placeholder="%"
              onChange={(e) =>
                dispatchState({ percentage: numbdfined(e.target.value) })
              }
            />
            <input
              type="number"
              placeholder="base (e.g. 1RM)"
              value={percentageBase}
              onChange={(e) =>
                dispatchState({ percentageBase: numbdfined(e.target.value) })
              }
            />
          </fieldset>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={percentage}
            onChange={(e) =>
              dispatchState({ percentage: numbdfined(e.target.value) })
            }
          />
          <small>use slider to tweak percentage</small>
        </form>
      </details>

      <details>
        <summary>Bars</summary>
        {bars.map((bar) => (
          <BarEditor key={bar.idx} bar={bar} putBar={putBar} />
        ))}
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
