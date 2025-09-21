export function determinePlates<
  Plate extends { weight: number; count: number }
>(
  target: number | undefined,
  handle: { weight: number; plateThreshold?: number } | null,
  plates: readonly Plate[]
): readonly Plate[] {
  // don't bother
  if (!target || !handle || !plates.length) return [];

  const platesUsed: Plate[] = [];
  let weightLeft = (target - handle.weight) / 2;

  for (let i = plates.length - 1; weightLeft > 0 && i >= 0; i--) {
    const plate = plates[i];

    if (handle.plateThreshold != null && plate.weight > handle.plateThreshold)
      continue; // skip this plate if it exceeds the threshold

    // use as many of this plate as possible
    let countUsed = Math.min(
      plate.count,
      Math.floor(weightLeft / plate.weight)
    );

    // if none used, it was too big - move to next plate
    if (countUsed) {
      // push a version of the plate with the count used
      platesUsed.push({ ...plate, count: countUsed });
      weightLeft -= countUsed * plate.weight;
    }
  }

  return platesUsed;
}

/**
 * Emits the space of possible work weights
 * given the plates and handle.
 * @param handle - the handle weight
 * @param plates - the available plates _for one side_
 */
export function determinePlateCombos(
  plates: readonly { weight: number; count: number }[],
  pivot: number = 0,
  usedCount: number = 0
): number[] {
  // base case
  if (pivot >= plates.length) return [0];

  // work down from the largest to smallest
  const plate = plates[plates.length - 1 - pivot];

  if (plate.count < usedCount) throw new Error("usedCount exceeds plate count");
  if (plate.count == usedCount)
    return determinePlateCombos(plates, pivot + 1, 0);

  const loaded = 2 * plate.weight;

  const loads = determinePlateCombos(plates, pivot, usedCount + 1);
  return _merge(
    loads,
    loads.map((l) => l + loaded)
  );
}

export function determineWeightSpace(
  bars: readonly {
    weight: number;
    maxLoad?: number;
    plateThreshold?: number;
  }[],
  plates: readonly { weight: number; count: number }[]
) {
  // merge all possible spaces for all selected bars
  return bars.map((b) => deterimineBarWeightSpace(b, plates)).reduce(_merge);
}

function deterimineBarWeightSpace(
  bar: { weight: number; maxLoad?: number; plateThreshold?: number },
  plates: readonly { weight: number; count: number }[]
) {
  // filter plates by threshold
  const validPlates =
    bar.plateThreshold != null
      ? plates.filter((p) => p.weight <= bar.plateThreshold!)
      : plates;

  const plateCombos = determinePlateCombos(validPlates);

  const barWeights = [];
  for (const combo of plateCombos) {
    const total = combo + bar.weight;
    if (bar.maxLoad != null && total > bar.maxLoad) {
      break;
    }
    barWeights.push(total);
  }

  return barWeights;
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

/**
 * returns the heaviest bar that meets the criteria.
 */
export function chooseBar<
  Type extends string,
  Bar extends { type: Type; weight: number }
>(bars: readonly Bar[], target: number | undefined, type?: Type): Bar | null {
  // no inputs; return null
  if (target == null || bars.length === 0) return null;

  let heaviest: Bar | null = null;
  for (const bar of bars) {
    if (bar.weight > target) continue;
    if (type && bar.type !== type) continue;
    if (heaviest == null || bar.weight > heaviest.weight) heaviest = bar;
  }

  return heaviest;
}

export function closestTarget(rawTarget: number, possibleWeights: number[]) {
  // can't do it if no weights
  if (possibleWeights.length === 0) return undefined;

  // binary search for closest weight (possibleWeights is sorted ascending)
  let low = 0,
    high = possibleWeights.length,
    minDiff = Infinity,
    best: number | undefined = undefined;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midWeight = possibleWeights[mid];
    const distance = midWeight - rawTarget;

    // break out on a direct hit
    if (distance == 0) return midWeight;

    // update best if closer
    const absDistance = Math.abs(distance);
    if (absDistance < minDiff) {
      minDiff = absDistance;
      best = midWeight;
    }
    if (midWeight < rawTarget) low = mid + 1;
    else high = mid;
  }

  return best;
}
