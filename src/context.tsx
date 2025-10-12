import { createContext, use, useEffect, useReducer } from "react";
import { numbornull } from "./utils";

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

function getInitialState(): State {
  // use URL if possible, otherwise localstorage
  const urlState = getUrlState();
  if (!urlState.target && (!urlState.percentage || !urlState.percentageBase)) {
    const saved = localStorage.getItem("appState");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore parse errors
      }
    }
  }
  return urlState;
}

function getUrlState(): State {
  // use hash as search
  const params = new URLSearchParams("?" + window.location.hash.slice(1));
  return {
    target: numbornull(params.get("weight")),
    barType: params.get("bar") ?? null,
    barWeight: numbornull(params.get("barWeight")),
    percentage: numbornull(params.get("pct")),
    percentageBase: numbornull(params.get("1rm")),
  };
}

function buildUrlHash(state: State): string {
  const params = new URLSearchParams();
  if (state.target != null) params.set("weight", String(state.target));
  if (state.barType) params.set("bar", state.barType);
  if (state.barWeight != null) params.set("barWeight", String(state.barWeight));

  // only set pct if target not explicitly set
  if (state.percentage != null && state.target == null)
    params.set("pct", String(state.percentage));

  if (state.percentageBase != null)
    params.set("1rm", String(state.percentageBase));
  return `#${params.toString()}`;
}

export function useUrlHash() {
  const [state] = useAppState();
  return buildUrlHash(state);
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

export function useRawAppState() {
  const [state, dispatch] = useReducer(
    stateReducer,
    undefined,
    getInitialState
  );

  const saveURLState = () => {
    const current = getUrlState();
    if (
      Object.entries(current).every(
        ([key, value]) => value == state[key as keyof State]
      )
    )
      return; // don't push a state if we're matching

    history.pushState(null, "", buildUrlHash(state));
  };

  useEffect(function saveState() {
    localStorage.setItem("appState", JSON.stringify(state));
    const cancelHandle = setTimeout(saveURLState, 1000);
    return () => clearTimeout(cancelHandle);
  }, Object.values(state));

  useEffect(function listenToPopState() {
    const onPopState = () => {
      // get only the defined values from the URL
      const newState = Object.fromEntries(
        Object.entries(getUrlState()).filter(([, v]) => v != null)
      ) as Partial<State>;

      dispatch(newState);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return [state, dispatch] as const;
}

const AppContext = createContext<ReturnType<typeof useRawAppState> | null>(
  null
);

export function AppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = useRawAppState();
  return <AppContext value={state}>{children}</AppContext>;
}

export function useAppState() {
  const ctx = use(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
