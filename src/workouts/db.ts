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

export async function saveWorkout(workout: Workout): Promise<{ id: number }> {
  const db = await openDb();
  const tx = db.transaction("workouts", "readwrite");
  const store = tx.objectStore("workouts");
  const request = store.put(workout);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve({ id: request.result as number });
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}
