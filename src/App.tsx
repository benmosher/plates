import {
  chooseBar,
  closestTarget,
  determinePlates,
  determineWeightSpace,
} from "./plate-math";
import { useDeferredValue, useMemo } from "react";
import { useMassStorage, Bar, Max, Plate } from "./plate-db";
import MassConfig from "./MassConfig";
import { useAutoRepeat } from "./useAutoRepeat";
import { useWeightSet } from "./useWeightSet";
import { numbdfined } from "./utils";
import { HiddenDeleteFieldset } from "./HiddenDeleteFieldset";
import BarView from "./BarView";
import { Link, Route, Routes } from "react-router";
import {
  AppContextProvider,
  useAppState,
  useSaveState,
  useUrlHash,
} from "./context";
import WorkoutList from "./WorkoutList";
import WorkoutEditor from "./WorkoutEditor";
import WorkoutViewer from "./WorkoutViewer";
import WorkoutImporter from "./WorkoutImporter";

function Nav() {
  const computeHash = useUrlHash();
  return (
    <nav>
      <ul>
        <li>
          <strong>
            <Link to={`/${computeHash}`}>Compute!</Link>
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
        <li>
          <Link to="/workouts">Workouts</Link>
        </li>
      </ul>
    </nav>
  );
}

export default function App() {
  return (
    <AppContextProvider>
      <Nav />
      <Routes>
        <Route path="/" element={<ComputerRoute />} />
        <Route path="/mass" element={<MassConfig />} />
        <Route path="/maxes" element={<MaxesEditor />} />
        <Route path="/workouts" element={<WorkoutList />} />
        <Route path="/workouts/import" element={<WorkoutImporter />} />
        <Route path="/workouts/:id/edit" element={<WorkoutEditor />} />
        <Route path="/workouts/:id/view" element={<WorkoutViewer />} />
      </Routes>
    </AppContextProvider>
  );
}

function ComputerRoute() {
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

  const [state, dispatchState] = useAppState();

  // record state changes when rendering this component
  useSaveState(state);

  let { target, percentage, percentageBase, barType, barWeight } = state;
  // validate/default bar type
  if (barType && !barTypes.has(barType)) barType = null;
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
            b.type === barType && (barWeight == null || b.weight === barWeight),
        ),
        validPlates,
      ),
    [bars, barType, barWeight, validPlates],
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
    [deferredTarget, activeBar, validPlates],
  );
  const validTarget = possibleWeights.includes(deferredTarget ?? -1);

  const weightSet = useWeightSet();
  const inWeightSet = target != null && weightSet.weights.includes(target);

  const nudgeDown = useAutoRepeat(() => {
    const nudge = activeBar?.sliderMinStep;
    if (nudge == null) return;
    const prev = Math.ceil((target ?? 0) / nudge) * nudge - nudge;
    if (weightMin != null && prev >= weightMin) dispatchState({ target: prev });
  });
  const nudgeUp = useAutoRepeat(() => {
    const nudge = activeBar?.sliderMinStep;
    if (nudge == null) return;
    const next = Math.floor((target ?? 0) / nudge) * nudge + nudge;
    if (weightMax != null && next <= weightMax) dispatchState({ target: next });
  });

  return (
    <>
      <select
        value={JSON.stringify({ barType, barWeight })}
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
      <BarView determinedPlates={determinedPlates} bar={activeBar} />
      <WeightSet
        weights={weightSet.weights}
        target={target}
        dispatchState={dispatchState}
        onClear={weightSet.clear}
      />
      <section>
        <form>
          <datalist id="target-options">
            {possibleWeights?.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </datalist>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "start" }}>
            <fieldset role="group" style={{ flex: 1 }}>
              {activeBar?.sliderMinStep != null && (
                <>
                  <button
                    type="button"
                    className="secondary"
                    disabled={activeBar?.sliderMinStep == null}
                    style={{ width: "auto", paddingInline: "0.5rem" }}
                    {...nudgeDown}
                  >
                    -{activeBar.sliderMinStep}
                  </button>
                </>
              )}
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
              {activeBar?.sliderMinStep != null && (
                <button
                  type="button"
                  className="secondary"
                  disabled={activeBar?.sliderMinStep == null}
                  style={{ width: "auto", paddingInline: "0.5rem" }}
                  {...nudgeUp}
                >
                  {activeBar.sliderMinStep}+
                </button>
              )}
            </fieldset>
            {target != null && (
              <button
                type="button"
                className="secondary"
                style={{ width: "auto", paddingInline: "0.75rem" }}
                onClick={() =>
                  inWeightSet ? weightSet.remove(target) : weightSet.add(target)
                }
              >
                {inWeightSet ? "\u2212" : "+"}
              </button>
            )}
          </div>
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

          <small>or use a percentage:</small>
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
            <select
              value={percentageBase ?? ""}
              onChange={(e) =>
                dispatchState({ percentageBase: numbdfined(e.target.value) })
              }
            >
              <option value="">—</option>
              {maxes
                .filter(({ label, weight }) => label && weight)
                .map(({ id, weight, label }, i) => (
                  <option key={id ?? i} value={weight!}>
                    {label} ({weight})
                  </option>
                ))}
            </select>
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
          <small>
            (configure maxes <Link to="/maxes">here</Link>)
          </small>
        </form>
      </section>
    </>
  );
}

function WeightSet({
  weights,
  target,
  dispatchState,
  onClear,
}: {
  weights: number[];
  target: number | undefined | null;
  dispatchState: (action: { target: number }) => void;
  onClear: () => void;
}) {
  if (!weights.length) return null;

  return (
    <>
      <div className="grid">
        {weights.map((w) => (
          <button
            type="button"
            key={w}
            className={w === target ? undefined : "secondary"}
            onClick={() => dispatchState({ target: w })}
          >
            {w}
          </button>
        ))}
      </div>
      <small>
        (<a href="#" onClick={(e) => { e.preventDefault(); onClear(); }}>clear set</a>)
      </small>
    </>
  );
}

function MaxesEditor() {
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

function MaxEditor({
  max,
  putMax,
  deleteMax,
}: {
  max: Max;
  putMax?: (max: Max) => void;
  deleteMax?: (id: number) => void;
}) {
  return (
    <HiddenDeleteFieldset onDelete={() => deleteMax?.(max.id!)}>
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
    </HiddenDeleteFieldset>
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
