import { useState } from "react";

const STORAGE_KEY = "weightSet";

function readStorage(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function writeStorage(weights: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
}

export function useWeightSet() {
  const [weights, setWeights] = useState<number[]>(readStorage);

  function add(weight: number) {
    setWeights((prev) => {
      if (prev.includes(weight)) return prev;
      const next = [...prev, weight].sort((a, b) => a - b);
      writeStorage(next);
      return next;
    });
  }

  function remove(weight: number) {
    setWeights((prev) => {
      const next = prev.filter((w) => w !== weight);
      writeStorage(next);
      return next;
    });
  }

  function clear() {
    writeStorage([]);
    setWeights([]);
  }

  return { weights, add, remove, clear };
}
