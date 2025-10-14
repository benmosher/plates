import { use, useSyncExternalStore } from "react";
import { Workout } from "./types";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("workouts", 1);

    /** initialize the data */
    request.onupgradeneeded = function () {
      const db = this.result;

      if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    // capture the database
    request.onsuccess = function () {
      resolve(this.result);
    };

    request.onerror = function () {
      reject(this.error);
    };
  });
}

export async function saveWorkout(
  workout: Workout & { id?: number }
): Promise<{ id: number }> {
  const db = await openDb();
  const tx = db.transaction("workouts", "readwrite");
  const store = tx.objectStore("workouts");
  const request = store.put(workout);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const id = request.result as number;

      CACHE.set(id, Promise.resolve({ ...workout, id }));

      const subs = subscriptionCache.get(id);
      if (subs) {
        subs.forEach((cb) => cb());
      }

      resolve({ id });
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function loadWorkout(id: number): Promise<Workout | null> {
  const db = await openDb();
  const tx = db.transaction("workouts", "readonly");
  const store = tx.objectStore("workouts");
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

const CACHE: Map<number, Promise<Workout | null>> = new Map();
const subscriptionCache: Map<number, Set<() => void>> = new Map();
function load(id: number | null): Promise<Workout | null> {
  if (id == null) {
    return Promise.resolve(null);
  }

  let promise = CACHE.get(id);
  if (!promise) {
    promise = loadWorkout(id);
    CACHE.set(id, promise);
  }
  return promise;
}

function subscribe(id: number | null, callback: () => void) {
  if (id == null) {
    return () => {};
  }

  let subs = subscriptionCache.get(id);
  if (!subs) {
    subs = new Set();
    subscriptionCache.set(id, subs);
  }
  subs.add(callback);
  return () => {
    subs?.delete(callback);
    if (subs?.size === 0) {
      subscriptionCache.delete(id);
    }
  };
}

export function useWorkout(id: number | null): Workout | null {
  let promise = useSyncExternalStore(
    subscribe.bind(null, id),
    load.bind(null, id)
  );

  if (id == null) {
    return null;
  }

  return use(promise);
}
