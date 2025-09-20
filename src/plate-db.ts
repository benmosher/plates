// create a database

import { use } from "react";

export interface Plate {
  count: number;

  /** this can be pounds or kilos; up to the user */
  weight: number;

  thicknessMm: number;
  diameterMm: number;

  color: string;
}

const PLATES_DEFAULT: readonly Plate[] = [
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

interface ObjectDb<T, K> {
  objects: readonly T[];

  put(object: T): void;
  delete(key: K): void;
}

type MassStorage = ObjectDb<Plate, number>;

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
        console.log(`initializing ${storeName} store`);
        for (const item of defaultData) {
          store.add(item);
        }
        txn.oncomplete = function () {
          console.log(`${storeName} store initialized`);
          resolve(defaultData);
        };
        txn.onerror = function () {
          reject(this.error);
        };
      } else {
        console.log(`${storeName} store already initialized`);
        resolve(this.result as readonly T[]);
      }
      txn.commit();
    };
    request.onerror = function () {
      reject(this.error);
    };
  });
}

type Initialized = {
  db: IDBDatabase;
  plates: readonly Plate[];
};

/** Resolves when database is available and initialized */
function initializeDatabase(): Promise<Initialized> {
  return new Promise((resolve, reject) => {
    // TODO: reject on error?
    const request = indexedDB.open("mass", 1);

    // capture the database
    request.onsuccess = function () {
      console.log("database opened, checking data");
      initializeStore(this.result, "plates", PLATES_DEFAULT).then((plates) => {
        console.log("database initialized");
        resolve({ db: this.result, plates });
      });
    };

    /** initialize the data */
    request.onupgradeneeded = function () {
      console.log("database upgrade needed");
      const db = this.result;

      // TODO: handle errors? note completion?
      if (!db.objectStoreNames.contains("plates")) {
        console.log("creating plates store");
        db.createObjectStore("plates", { keyPath: "weight" });
        console.log("plates store created and initialized");
      }
      console.log("database upgrade complete");
    };
  });
}

let dbPromise: Promise<Initialized> | null = null;

export function useMassStorage(): readonly Plate[] {
  if (dbPromise == null) {
    dbPromise = initializeDatabase();
  }

  const { plates } = use(dbPromise);
  return plates;
}
