// create a database

import { useMemo, useSyncExternalStore } from "react";
import { Workout } from "./workout-types";

export interface Plate {
  count?: number;

  /** this can be pounds or kilos; up to the user */
  weight: number;

  thicknessMm: number;
  diameterMm: number;

  color: string;
}

/** special variables for different bars */
export interface Bar {
  /** unique key, auto-incrementing */
  idx: number;

  name: string;
  type: string;
  weight: number;
  sliderMinStep?: number;

  plateThreshold?: number;

  maxLoad?: number;

  barLength: number;
  handleWidth: number;

  /** per-plate weight limits: plate weight → max count per side */
  plateLimits?: { [plateWeight: number]: number };
}

export type BarInput = Omit<Bar, "idx"> & { idx?: number };

export const INITIAL_BARS: Bar[] = (
  [
    {
      name: "Olympic barbell",
      type: "barbell",
      weight: 45,
      barLength: 500,
      handleWidth: 200,
      sliderMinStep: 5,
    },
    {
      name: "Olympic dumbbell",
      type: "dumbbell",
      weight: 12.5,
      plateThreshold: 10,
      barLength: 260,
      handleWidth: 80,
    },
    {
      name: "Junior barbell",
      type: "barbell",
      weight: 22.5,
      barLength: 400,
      handleWidth: 120,
    },
    {
      name: "Technique bar",
      type: "barbell",
      weight: 5,
      maxLoad: 55, // including bar
      barLength: 300,
      handleWidth: 140,
    },
  ] as BarInput[]
).map((b, i) => ({ ...b, idx: i }));

export const INITIAL_PLATES: readonly Plate[] = [
  { weight: 0.25, thicknessMm: 8, diameterMm: 57, color: "#62D926", count: 1 },
  { weight: 0.5, thicknessMm: 9, diameterMm: 60, color: "#FFBF00", count: 1 },
  { weight: 0.75, thicknessMm: 10, diameterMm: 60, color: "#3C71F7", count: 1 },
  { weight: 1, thicknessMm: 13, diameterMm: 63, color: "#EE402E", count: 1 },
  { weight: 1.25, thicknessMm: 10, diameterMm: 63, color: "#6F7887", count: 0 },
  { weight: 2.5, thicknessMm: 10, diameterMm: 80, color: "#8891A4", count: 1 },
  { weight: 5, thicknessMm: 15, diameterMm: 93, color: "#7B8495", count: 1 },
  { weight: 10, thicknessMm: 20, diameterMm: 114, color: "#6F7887", count: 3 },
  { weight: 15, thicknessMm: 15, diameterMm: 225, color: "#191C20", count: 1 },
  { weight: 25, thicknessMm: 20, diameterMm: 225, color: "#62D926", count: 1 },
  { weight: 35, thicknessMm: 27, diameterMm: 225, color: "#FFBF00", count: 1 },
  { weight: 45, thicknessMm: 35, diameterMm: 225, color: "#3C71F7", count: 3 },
  { weight: 55, thicknessMm: 37, diameterMm: 225, color: "#EE402E", count: 0 },
];

export interface Max {
  /** unique key, auto-incrementing */
  id?: number;

  label: string | null;
  weight: number | null;
}

/** my squatober 2k25 maxes */
export const INITIAL_MAXES: readonly Max[] = [
  { weight: 355, label: "Squat" },
  { weight: 230, label: "Bench" },
  { weight: 420, label: "Deadlift" },
];

/**
 * Write the default plates to the database at startup, if
 * it is empty.
 * Otherwise, read the existing data.
 */
function initializeStore<T>(
  txn: IDBTransaction,
  storeName: string,
  defaultData: readonly T[],
): Promise<readonly T[]> {
  const store = txn.objectStore(storeName);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = function () {
      if (this.result.length === 0) {
        for (const item of defaultData) {
          store.add(item);
        }
        resolve(defaultData);
      } else {
        resolve(this.result as readonly T[]);
      }
    };
    request.onerror = function () {
      reject(this.error);
    };
  });
}

/** Resolves when database is available and initialized */
function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mass", 5); // v5: + workouts

    let initializeMaxes = false;
    const maxesToInsert = INITIAL_MAXES;

    // capture the database
    request.onsuccess = function () {
      db = this.result;
      const txn = db.transaction(["plates", "bars"], "readwrite");

      const initPlates = initializeStore(txn, "plates", INITIAL_PLATES).then(
        (plates) => {
          for (const plate of plates) {
            PLATE_MAP.set(plate.weight, plate);
          }
        },
      );
      const initBars = initializeStore(txn, "bars", INITIAL_BARS).then(
        (bars) => {
          for (const bar of bars) {
            BAR_MAP.set(bar.idx, bar);
          }
        },
      );

      const initMaxes = new Promise<void>((resolveMaxes, rejectMaxes) => {
        if (initializeMaxes) {
          try {
            const maxTxn = this.result.transaction("maxes", "readwrite");
            const maxStore = maxTxn.objectStore("maxes");
            for (const max of maxesToInsert) {
              maxStore.add(max).onsuccess = function () {
                MAX_MAP.set(this.result as number, {
                  ...max,
                  id: this.result as number,
                });
              };
            }
            resolveMaxes();
          } catch (e) {
            rejectMaxes(e);
          }
        } else {
          const maxTxn = this.result.transaction("maxes", "readonly");
          const maxStore = maxTxn.objectStore("maxes");
          const getAllRequest = maxStore.getAll();
          getAllRequest.onsuccess = function () {
            for (const max of this.result as Iterable<Max>) {
              MAX_MAP.set(max.id!, max);
            }
            resolveMaxes();
          };
          getAllRequest.onerror = function () {
            rejectMaxes(this.error);
          };
        }
      });

      const initWorkouts = new Promise<void>((resolveWorkouts, rejectWorkouts) => {
        if (!this.result.objectStoreNames.contains("workouts")) {
          resolveWorkouts();
          return;
        }
        const wTxn = this.result.transaction("workouts", "readonly");
        const wStore = wTxn.objectStore("workouts");
        const wRequest = wStore.getAll();
        wRequest.onsuccess = function () {
          for (const w of this.result as Iterable<Workout>) {
            WORKOUT_MAP.set(w.id!, w);
          }
          resolveWorkouts();
        };
        wRequest.onerror = function () {
          rejectWorkouts(this.error);
        };
      });

      Promise.all([initPlates, initBars, initMaxes, initWorkouts]).then(() => {
        READ_VIEW = { plates: PLATE_MAP, bars: BAR_MAP, maxes: MAX_MAP, workouts: WORKOUT_MAP };
        _subscriptions.forEach((cb) => cb());
        resolve();
      }, reject);
    };

    /** initialize the data */
    request.onupgradeneeded = function (e) {
      const db = this.result;

      if (!db.objectStoreNames.contains("plates")) {
        db.createObjectStore("plates", { keyPath: "weight" });
      }
      if (!db.objectStoreNames.contains("bars")) {
        db.createObjectStore("bars", { keyPath: "idx", autoIncrement: true });
      }
      if (e.oldVersion < 4 && db.objectStoreNames.contains("maxes")) {
        // re-create to add keyPath
        db.deleteObjectStore("maxes");
      }
      if (!db.objectStoreNames.contains("maxes")) {
        db.createObjectStore("maxes", { keyPath: "id", autoIncrement: true });
        initializeMaxes = true;
      }
      if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onerror = function () {
      reject(this.error);
    };
  });
}

export const dbReady: Promise<void> = initializeDatabase();
let db: IDBDatabase | null = null;

function putPlate(plate: Plate) {
  if (db == null) {
    throw new Error("database not initialized");
  }

  // update the in-memory map and view
  PLATE_MAP.set(plate.weight, plate);
  READ_VIEW = { ...READ_VIEW, plates: PLATE_MAP };

  // notify subscribers
  _subscriptions.forEach((cb) => cb());

  // write to the database
  const txn = db.transaction("plates", "readwrite");
  const store = txn.objectStore("plates");
  store.put(plate);
  txn.commit();
}

function putBar(bar: BarInput) {
  if (db == null) {
    throw new Error("database not initialized");
  }

  // write to the database
  const txn = db.transaction("bars", "readwrite");
  const store = txn.objectStore("bars");
  const request = store.put(bar);
  request.onsuccess = function () {
    // in case this was an add, update the idx
    const indexedBar: Bar = { ...bar, idx: this.result as number };
    BAR_MAP.set(indexedBar.idx, indexedBar);
    READ_VIEW = { ...READ_VIEW, bars: BAR_MAP };
    _subscriptions.forEach((cb) => cb());
  };
  txn.commit();
}

function deleteBar(idx: number) {
  if (db == null) {
    throw new Error("database not initialized");
  }

  // update the in-memory map and view
  BAR_MAP.delete(idx);
  READ_VIEW = { ...READ_VIEW, bars: BAR_MAP };
  _subscriptions.forEach((cb) => cb());

  // write to the database
  const txn = db.transaction("bars", "readwrite");
  const store = txn.objectStore("bars");
  store.delete(idx);
  txn.commit();
}

function putMax(max: Max): void {
  if (db == null) {
    throw new Error("database not initialized");
  }

  // write to the database
  const txn = db.transaction("maxes", "readwrite");
  const store = txn.objectStore("maxes");
  store.put(max).onsuccess = function () {
    const idMax = { ...max, id: this.result as number };
    MAX_MAP.set(idMax.id, idMax);
    READ_VIEW = { ...READ_VIEW, maxes: MAX_MAP };
    _subscriptions.forEach((cb) => cb());
  };
  txn.commit();
}

function deleteMax(idx: number) {
  if (db == null) {
    throw new Error("database not initialized");
  }

  // update the in-memory map and view
  MAX_MAP.delete(idx);
  READ_VIEW = { ...READ_VIEW, maxes: MAX_MAP };
  _subscriptions.forEach((cb) => cb());

  // write to the database
  const txn = db.transaction("maxes", "readwrite");
  const store = txn.objectStore("maxes");
  store.delete(idx);
  txn.commit();
}

function putWorkout(workout: Workout): Promise<number> {
  if (db == null) {
    throw new Error("database not initialized");
  }

  const txn = db.transaction("workouts", "readwrite");
  const store = txn.objectStore("workouts");
  return new Promise((resolve) => {
    store.put(workout).onsuccess = function () {
      const id = this.result as number;
      const saved = { ...workout, id };
      WORKOUT_MAP.set(id, saved);
      READ_VIEW = { ...READ_VIEW, workouts: WORKOUT_MAP };
      _subscriptions.forEach((cb) => cb());
      resolve(id);
    };
    txn.commit();
  });
}

function deleteWorkout(id: number) {
  if (db == null) {
    throw new Error("database not initialized");
  }

  WORKOUT_MAP.delete(id);
  READ_VIEW = { ...READ_VIEW, workouts: WORKOUT_MAP };
  _subscriptions.forEach((cb) => cb());

  const txn = db.transaction("workouts", "readwrite");
  const store = txn.objectStore("workouts");
  store.delete(id);
  txn.commit();
}

/**
 * This map holds the current state of the plates
 * in memory, but is global so that multiple calls to
 * useMassStorage() share the same state.
 *
 * This is necessary because IndexedDB does not provide
 * change notifications.
 */
const PLATE_MAP = new Map<number, Plate>();
/** bars have a unique key number */
const BAR_MAP = new Map<number, Bar>();

const MAX_MAP = new Map<number, Max>();

const WORKOUT_MAP = new Map<number, Workout>();

/** for the snapshot */
let READ_VIEW = {
  plates: PLATE_MAP,
  bars: BAR_MAP,
  maxes: MAX_MAP,
  workouts: WORKOUT_MAP,
};

/** callbacks to fire on updates */
const _subscriptions = new Set<() => void>();
function _subscribe(cb: () => void) {
  _subscriptions.add(cb);
  return () => _subscriptions.delete(cb);
}
function _getSnapshot() {
  return READ_VIEW;
}

interface MassStorage {
  readonly plates: readonly Plate[];
  readonly bars: readonly Bar[];
  readonly maxes: readonly Max[];
  readonly workouts: readonly Workout[];

  putPlate(plate: Plate): void;

  putBar(bar: BarInput): void;
  deleteBar(idx: number): void;

  putMax(max: Max): void;
  deleteMax(id: number): void;

  putWorkout(workout: Workout): Promise<number>;
  deleteWorkout(id: number): void;
}

export function useMassStorage(): MassStorage {
  const store = useSyncExternalStore(_subscribe, _getSnapshot);

  return useMemo(
    () => ({
      plates: Array.from(store.plates.values()).toSorted(
        (a, b) => a.weight - b.weight,
      ),
      bars: Array.from(store.bars.values()).toSorted((a, b) => a.idx - b.idx),
      maxes: Array.from(store.maxes.values()).toSorted((a, b) => a.id! - b.id!),
      workouts: Array.from(store.workouts.values()).toSorted((a, b) => a.id! - b.id!),
      putPlate,
      putBar,
      deleteBar,
      putMax,
      deleteMax,
      putWorkout,
      deleteWorkout,
    }),
    [store, putPlate, putBar, deleteBar, putMax],
  );
}
