// create a database

import { use, useMemo, useSyncExternalStore } from "react";

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

/** my squatober 2k25 maxes */
const INITIAL_MAXES = [
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
  defaultData: readonly T[]
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
    const request = indexedDB.open("mass", 3); // v2: plates + bars + maxes

    let initializeMaxes = false;

    // capture the database
    request.onsuccess = function () {
      db = this.result;
      const txn = db.transaction(["plates", "bars"], "readwrite");

      const initPlates = initializeStore(txn, "plates", INITIAL_PLATES).then(
        (plates) => {
          // populate the in-memory map
          for (const plate of plates) {
            PLATE_MAP.set(plate.weight, plate);
          }
        }
      );
      const initBars = initializeStore(txn, "bars", INITIAL_BARS).then(
        (bars) => {
          // populate the in-memory map
          for (const bar of bars) {
            BAR_MAP.set(bar.idx, bar);
          }
        }
      );

      const initMaxes = new Promise<void>((resolveMaxes, rejectMaxes) => {
        if (initializeMaxes) {
          try {
            const maxTxn = this.result.transaction("maxes", "readwrite");
            const maxStore = maxTxn.objectStore("maxes");
            for (const max of INITIAL_MAXES) {
              maxStore.add(max);
              MAX_MAP.set(max.label, max.weight);
            }
          } catch (e) {
            rejectMaxes(e);
            return;
          }
        } else {
          const maxTxn = this.result.transaction("maxes", "readonly");
          const maxStore = maxTxn.objectStore("maxes");
          const getAllRequest = maxStore.getAll();
          getAllRequest.onsuccess = function () {
            for (const max of this.result as {
              label: string;
              weight: number;
            }[]) {
              MAX_MAP.set(max.label, max.weight);
            }
            resolveMaxes();
          };
          getAllRequest.onerror = function () {
            rejectMaxes(this.error);
          };
        }
      });

      Promise.all([initPlates, initBars, initMaxes]).then(
        () => resolve(),
        reject
      );
    };

    /** initialize the data */
    request.onupgradeneeded = function () {
      const db = this.result;

      if (!db.objectStoreNames.contains("plates")) {
        db.createObjectStore("plates", { keyPath: "weight" });
      }
      if (!db.objectStoreNames.contains("bars")) {
        db.createObjectStore("bars", { keyPath: "idx", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("maxes")) {
        db.createObjectStore("maxes", { keyPath: "label" });
        initializeMaxes = true;
      }
    };

    request.onerror = function () {
      reject(this.error);
    };
  });
}

let dbPromise: Promise<void> | null = null;
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

const MAX_MAP = new Map<string, number>();

/** for the snapshot */
let READ_VIEW = {
  plates: PLATE_MAP,
  bars: BAR_MAP,
  maxes: MAX_MAP,
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
  readonly maxes: readonly [string, number][];

  putPlate(plate: Plate): void;
  putBar(bar: BarInput): void;
  deleteBar(idx: number): void;
}

export function useMassStorage(): MassStorage {
  if (dbPromise == null) {
    dbPromise = initializeDatabase();
  }

  use(dbPromise);

  const store = useSyncExternalStore(_subscribe, _getSnapshot);

  return useMemo(
    () => ({
      plates: Array.from(store.plates.values()).toSorted(
        (a, b) => a.weight - b.weight
      ),
      bars: Array.from(store.bars.values()).toSorted((a, b) => a.idx - b.idx),
      maxes: Array.from(store.maxes.entries()),
      putPlate,
      putBar,
      deleteBar,
    }),
    [store, putPlate, putBar, deleteBar]
  );
}
