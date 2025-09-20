// create a database

import { use, useEffect, useRef, useState } from "react";

interface Plate {
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

interface MassStorage {
  // all known plates
  plates: readonly Plate[];

  put(plate: Plate): void;
  delete(weight: number): void;
}

/**
 * Write the default plates to the database at startup, if
 * it is empty.
 */
function createInitialPlateConfiguration(db: IDBDatabase): Promise<void> {
  const txn = db.transaction("plates", "readwrite");
  const store = txn.objectStore("plates");
  const countRequest = store.count();
  return new Promise((resolve, reject) => {
    countRequest.onsuccess = function () {
      if (this.result === 0) {
        console.log("initializing plates store");
        for (const plate of PLATES_DEFAULT) {
          store.add(plate);
        }
      }
      txn.oncomplete = function () {
        console.log("plates store initialized");
        resolve();
      };
      txn.commit();
    };
    countRequest.onerror = function () {
      reject(this.error);
    };
  });
}

/** Resolves when database is available and initialized */
function initializeDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // TODO: reject on error?
    const request = indexedDB.open("mass", 1);

    // capture the database
    request.onsuccess = function () {
      console.log("database opened, checking data");
      createInitialPlateConfiguration(this.result).then(() =>
        resolve(this.result)
      );
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

let dbPromise: Promise<IDBDatabase> | null = null;

export function useDatabase(): IDBDatabase {
  if (dbPromise == null) {
    dbPromise = initializeDatabase();
  }

  return use(dbPromise);
}
