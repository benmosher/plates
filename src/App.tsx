import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

import {
  chooseBar,
  closestTarget,
  determinePlates,
  determineWeightSpace,
} from "./plate-math";
import { Suspense, useDeferredValue, useMemo, useReducer } from "react";
import {
  useMassStorage,
  Bar,
  Max,
  Plate,
  INITIAL_BARS,
  INITIAL_PLATES,
  INITIAL_MAXES,
} from "./plate-db";
import MassConfig from "./MassConfig";
import { numbdfined } from "./utils";
import DoubleClickConfirmButton from "./DoubleClickConfirmButton";
import BarView from "./BarView";
import { Link, Route, Routes } from "react-router";

function Nav() {
  return (
    <nav>
      <ul>
        <li>
          <strong>
            <Link to="/">Compute!</Link>
          </strong>
        </li>
      </ul>
      <ul>
        <li>
          <Link to="/mass">Mass</Link>
        </li>
        <li>
          <Link to="/maxes">Maxes</Link>
        </li>
      </ul>
    </nav>
  );
}

type State = {
  /** target weight */
  target?: number | null;
  /** bar type */
  barType?: string | null;
  /** bar weight (if specified); null for best match */
  barWeight?: number | null;

  /** percentage-based target */
  percentage?: number | null;
  /** base weight (e.g. 1RM) */
  percentageBase?: number | null;
};

function getUrlState(barTypes: Set<string>): State {
  // use hash as search
  const params = new URLSearchParams("?" + window.location.hash.slice(1));
  let barType = params.get("bar") ?? null;
  if (barType && !barTypes.has(barType)) barType = null;
  return {
    target: numbdfined(params.get("weight")) ?? null,
    barType,
    barWeight: numbdfined(params.get("barWeight")) ?? null,
    percentage: numbdfined(params.get("pct")) ?? null,
    percentageBase: numbdfined(params.get("1rm")) ?? null,
  };
}

function stateReducer(state: State, newState: Partial<State>): State {
  const percentageBase =
    "percentageBase" in newState
      ? newState.percentageBase
      : state.percentageBase;
  const percentage =
    "percentage" in newState ? newState.percentage : state.percentage;
  const barType = newState.barType ?? state.barType;

  // don't coalesce barWeight; it may be intentionally being cleared
  const barWeight =
    newState.barWeight !== undefined ? newState.barWeight : state.barWeight;

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
      barWeight,
    };
  }

  // if the percentage or base is being set, clear target
  // so it is recomputed outside the reducer
  if ("percentage" in newState || "percentageBase" in newState) {
    return {
      target: null,
      percentage,
      percentageBase,
      barType,
      barWeight,
    };
  }

  return { ...state, percentageBase, barType, barWeight };
}

function useAppState(barTypes: Set<string>) {
  // TODO: restore state storage
  return useReducer(stateReducer, barTypes, getUrlState);
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<ComputerRoute />} />
        <Route path="/mass" element={<MassConfig />} />
        <Route path="/maxes" element={<MaxesEditor />} />
      </Routes>
    </>
  );
}

function ComputerRoute() {
  return (
    <Suspense
      fallback={
        <BarComputer
          plates={INITIAL_PLATES}
          bars={INITIAL_BARS}
          maxes={INITIAL_MAXES}
        />
      }
    >
      <LoadedBarComputer />
    </Suspense>
  );
}

function LoadedBarComputer() {
  const { plates, bars, maxes } = useMassStorage();
  return <BarComputer plates={plates} bars={bars} maxes={maxes} />;
}

function BarComputer({
  plates,
  bars,
  maxes,
}: {
  plates: readonly Plate[];
  bars: readonly Bar[];
  maxes: readonly Max[];
}) {
  const barTypes = bars.reduce((set, b) => set.add(b.type), new Set<string>());

  let [
    { target, percentage, percentageBase, barType, barWeight },
    dispatchState,
  ] = useAppState(barTypes);

  // default bar type
  if (!barType && bars[0]) {
    barType = bars[0].type;
  }

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
        bars.filter(
          (b) =>
            b.type === barType && (barWeight == null || b.weight === barWeight)
        ),
        validPlates
      ),
    [bars, barType, barWeight, validPlates]
  );
  const weightMin = possibleWeights ? possibleWeights[0] : undefined;
  const weightMax = possibleWeights
    ? possibleWeights[possibleWeights.length - 1]
    : undefined;

  // use percentage to determine target if not defined
  if (target == null && percentage != null && percentageBase != null) {
    target =
      closestTarget((percentage * percentageBase) / 100, possibleWeights) ??
      Math.round((percentage * percentageBase) / 100);
  }

  const deferredTarget = useDeferredValue(target);
  const activeBar = chooseBar(bars, deferredTarget, barType, barWeight);
  const determinedPlates = useMemo(
    () => determinePlates(deferredTarget, activeBar, validPlates),
    [deferredTarget, activeBar, validPlates]
  );
  const validTarget = possibleWeights.includes(deferredTarget ?? -1);

  return (
    <>
      <BarView determinedPlates={determinedPlates} bar={activeBar} />
      <form>
        <datalist id="target-options">
          {possibleWeights?.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </datalist>
        <fieldset>
          <fieldset role="group">
            <input
              id="target-number"
              type="number"
              placeholder="work weight"
              value={target ?? ""}
              min={weightMin}
              max={weightMax}
              step={weightStep}
              onFocus={clear}
              onKeyDown={onEnterBlur}
              onBlur={scrollToTop}
              onChange={(e) =>
                dispatchState({ target: numbdfined(e.target.value) })
              }
              aria-invalid={!validTarget}
            />
            <select
              value={JSON.stringify({ barType, barWeight })}
              aria-invalid={!validTarget}
              onChange={(e) => {
                dispatchState(JSON.parse(e.target.value));
              }}
            >
              <optgroup label="Best fit">
                {Array.from(barTypes).map((type) => (
                  <option
                    key={type}
                    value={JSON.stringify({
                      barType: type,
                      barWeight: null,
                    })}
                  >
                    {type}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Specific bars">
                {bars.map((bar) => (
                  <option
                    key={bar.idx}
                    value={JSON.stringify({
                      barType: bar.type,
                      barWeight: bar.weight,
                    })}
                  >
                    {bar.name} ({bar.weight})
                  </option>
                ))}
              </optgroup>
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
              value={target ?? ""}
              onChange={(e) =>
                dispatchState({ target: numbdfined(e.target.value) })
              }
            />
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
              value={percentage ?? ""}
              placeholder="%"
              onFocus={clear}
              onKeyDown={onEnterBlur}
              onBlur={scrollToTop}
              onChange={(e) =>
                dispatchState({ percentage: numbdfined(e.target.value) })
              }
            />
            <datalist id="1rm-options">
              {maxes
                .filter(({ weight }) => weight)
                .map(({ id, weight }) => (
                  <option key={id} value={weight!} />
                ))}
            </datalist>
            <input
              type="number"
              placeholder="base (e.g. 1RM)"
              value={percentageBase ?? ""}
              min={0}
              list="1rm-options"
              onFocus={clear}
              onKeyDown={onEnterBlur}
              onBlur={scrollToTop}
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
            value={percentage ?? ""}
            onChange={(e) =>
              dispatchState({ percentage: numbdfined(e.target.value) })
            }
          />
          <fieldset className="grid">
            {maxes.map((max) => (
              <button
                type="button"
                key={max.id}
                onClick={() => dispatchState({ percentageBase: max.weight })}
              >
                {max.label}
              </button>
            ))}
          </fieldset>
        </form>
      </details>
    </>
  );
}

function MaxesEditor() {
  return (
    <Suspense fallback={null}>
      <RawMaxesEditor />
    </Suspense>
  );
}

function RawMaxesEditor() {
  const { maxes, putMax, deleteMax } = useMassStorage();
  return (
    <details open>
      <summary>Maxes</summary>
      <form>
        {maxes.map((max) => (
          <MaxEditor
            key={max.id}
            max={max}
            putMax={putMax}
            deleteMax={deleteMax}
          />
        ))}
        <button
          type="button"
          onClick={() => putMax?.({ label: "", weight: null })}
        >
          Add
        </button>
      </form>
    </details>
  );
}

function clamp(x: number, min: number, max: number) {
  return x < min ? min : x > max ? max : x;
}

function MaxEditor({
  max,
  putMax,
  deleteMax,
}: {
  max: Max;
  putMax?: (max: Max) => void;
  deleteMax?: (id: number) => void;
}) {
  // swipe to delete
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }));
  const bind = useDrag(({ down, movement: [mx] }) => {
    const xStop = mx < -95 ? -95 : 0;
    const clamped = clamp(mx, -120, 20);
    if (down && (mx > 20 || mx < -120)) return; // don't drag too far
    api.start({ x: down ? clamped : xStop, y: 0 });
  });
  return (
    <div style={{ position: "relative" }}>
      <DoubleClickConfirmButton
        style={{
          position: "absolute",
          right: 0,
        }}
        onClick={() => deleteMax?.(max.id!)}
      >
        Delete
      </DoubleClickConfirmButton>
      <animated.fieldset
        role="group"
        {...bind()}
        style={{ x, y, touchAction: "none" }}
      >
        <input
          type="text"
          defaultValue={max.label ?? ""}
          onChange={(e) => putMax?.({ ...max, label: e.target.value })}
        />
        <input
          defaultValue={max.weight ?? ""}
          type="number"
          onChange={(e) =>
            putMax?.({
              ...max,
              weight: numbdfined(e.target.value) ?? null,
            })
          }
        />
      </animated.fieldset>
    </div>
  );
}

/** autoclear on focus for easier changes */
function clear(e: React.FocusEvent<HTMLInputElement>) {
  e.target.value = "";
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onEnterBlur(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.blur();
  }
}
