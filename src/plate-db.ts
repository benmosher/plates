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

const INITIAL_PLATES: readonly Plate[] = [
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

/**
 * Write the default plates to the database at startup, if
 * it is empty.
 * Otherwise, read the existing data.
 */
function initializeStore<T>(
  db: IDBDatabase,
  storeName: string,
  defaultData: readonly T[]
): Promise<readonly T[]> {
  const txn = db.transaction(storeName, "readwrite");
  const store = txn.objectStore(storeName);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = function () {
      if (this.result.length === 0) {
        for (const item of defaultData) {
          store.add(item);
        }
        txn.oncomplete = function () {
          resolve(defaultData);
        };
        txn.onerror = function () {
          reject(this.error);
        };
      } else {
        resolve(this.result as readonly T[]);
      }
      txn.commit();
    };
    request.onerror = function () {
      reject(this.error);
    };
  });
}

/** Resolves when database is available and initialized */
function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mass", 1);

    // capture the database
    request.onsuccess = function () {
      db = this.result;

      initializeStore(db, "plates", INITIAL_PLATES).then((plates) => {
        // populate the in-memory map
        for (const plate of plates) {
          MAP_VIEW.set(plate.weight, plate);
        }
        FLAT_VIEW = _sortedPlateSnapshot();
        resolve();
      }, reject);
    };

    /** initialize the data */
    request.onupgradeneeded = function () {
      const db = this.result;

      if (!db.objectStoreNames.contains("plates")) {
        db.createObjectStore("plates", { keyPath: "weight" });
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
  MAP_VIEW.set(plate.weight, plate);
  FLAT_VIEW = _sortedPlateSnapshot();

  // notify subscribers
  _subscriptions.forEach((cb) => cb());

  // write to the database
  const txn = db.transaction("plates", "readwrite");
  const store = txn.objectStore("plates");
  store.put(plate);
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
const MAP_VIEW = new Map<number, Plate>();
let FLAT_VIEW: readonly Plate[] = [];

/** callbacks to fire on updates */
const _subscriptions = new Set<() => void>();
function _subscribe(cb: () => void) {
  _subscriptions.add(cb);
  return () => _subscriptions.delete(cb);
}
function _getSnapshot(): readonly Plate[] {
  return FLAT_VIEW;
}
function _sortedPlateSnapshot(): readonly Plate[] {
  const plates = Array.from(MAP_VIEW.values());
  plates.sort((a, b) => a.weight - b.weight);
  return plates;
}

interface MassStorage {
  readonly plates: readonly Plate[];

  putPlate(plate: Plate): void;
}

export function useMassStorage(): MassStorage {
  if (dbPromise == null) {
    dbPromise = initializeDatabase();
  }

  // suspend while db is initializing
  use(dbPromise);

  const plates = useSyncExternalStore(_subscribe, _getSnapshot);

  return useMemo(
    () => ({
      plates,
      putPlate,
    }),
    [plates, putPlate]
  );
}
