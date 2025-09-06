export function determinePlates(
  target: number | undefined,
  handle: number | undefined,
  plates: readonly number[]
) {
  // don't bother
  if (!target || !handle) return [];

  const platesNeeded: number[] = [];
  let weightLeft = (target - handle) / 2;

  let i = plates.length - 1;
  while (i >= 0 && weightLeft > 0) {
    const nextPlate = plates[i];
    if (nextPlate && nextPlate <= weightLeft) {
      platesNeeded.push(nextPlate);
      weightLeft -= nextPlate;
    }
    i--;
  }

  return platesNeeded;
}

/**
 * Emits the space of possible work weights
 * given the plates and handle.
 * @param handle - the handle weight
 * @param plates - the available plates _for one side_
 */
export function determinePlateCombos(
  plates: readonly number[],
  pivot: number = 0
): number[] {
  if (!isStrictlyAscending(plates)) {
    throw new Error("plates must be in strictly ascending order");
  }

  // base case
  if (pivot >= plates.length) return [0];

  // work down from the largest to smallest
  const plate = plates[plates.length - 1 - pivot];
  const loaded = 2 * plate;

  const loads = determinePlateCombos(plates, pivot + 1);
  return _merge(
    loads,
    loads.map((l) => l + loaded)
  );
}

export function determineWeightSpace(
  handle: number | undefined,
  plates: readonly number[]
) {
  if (handle == null) return [];
  const weights = determinePlateCombos(plates);
  weights.forEach((w, i) => (weights[i] = w + handle));
  return weights;
}

// merge two ascending unique arrays, discarding duplicates between them
function _merge(a: number[], b: number[]) {
  let ai = 0,
    bi = 0;
  const result = [];
  while (ai < a.length && bi < b.length) {
    const diff = a[ai] - b[bi];
    if (diff <= 0) {
      result.push(a[ai]);
      ai++;
      if (diff === 0) bi++;
    } else {
      result.push(b[bi]);
      bi++;
    }
  }
  // append either tail
  while (ai < a.length) result.push(a[ai++]);
  while (bi < b.length) result.push(b[bi++]);

  return result;
}

function isStrictlyAscending(arr: readonly Plate[]) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].weight <= arr[i - 1].weight) {
      return false;
    }
  }
  return true;
}
