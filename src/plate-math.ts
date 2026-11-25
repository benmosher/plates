type Handle = {
  weight: number;
  plateThreshold?: number;
  plateLimits?: { [plateWeight: number]: number };
};

export function determinePlates<
  Plate extends { weight: number; count: number; avoid?: boolean },
>(
  target: number | null | undefined,
  handle: Handle | null,
  plates: readonly Plate[],
): readonly Plate[] {
  // don't bother
  if (!target || !handle || !plates.length) return [];

  if (plates.some((p) => p.avoid)) {
    const targetPerSide = (target - handle.weight) / 2;
    const isExact = (result: readonly Plate[]) =>
      Math.abs(
        result.reduce((sum, p) => sum + p.weight * p.count, 0) - targetPerSide,
      ) < 0.001;

    // prefer: avoided plates only once all heavier plates are exhausted
    const exhausted = _greedyPlates(target, handle, plates, true);
    if (isExact(exhausted)) return exhausted;

    // next: avoided plates not at all
    const nonAvoided = _greedyPlates(
      target,
      handle,
      plates.filter((p) => !p.avoid),
    );
    if (isExact(nonAvoided)) return nonAvoided;
  }

  return _greedyPlates(target, handle, plates);
}

function _greedyPlates<
  Plate extends { weight: number; count: number; avoid?: boolean },
>(
  target: number,
  handle: Handle,
  plates: readonly Plate[],
  /** if true, avoided plates are only used once all heavier plates are used up */
  avoidUntilExhausted = false,
): readonly Plate[] {
  const platesUsed: Plate[] = [];
  let weightLeft = (target - handle.weight) / 2;
  let heavierExhausted = true;

  for (let i = plates.length - 1; weightLeft > 0 && i >= 0; i--) {
    const plate = plates[i];
    const limit = handle.plateLimits?.[plate.weight] ?? Infinity;

    if (
      limit <= 0 ||
      (handle.plateThreshold != null && plate.weight > handle.plateThreshold)
    )
      continue; // skip this plate if it exceeds the threshold or is disallowed by limits

    if (avoidUntilExhausted && plate.avoid && !heavierExhausted) continue;

    // use as many of this plate as possible
    const available = Math.min(plate.count, limit);
    const countUsed = Math.min(available, Math.floor(weightLeft / plate.weight));
    if (countUsed < available) heavierExhausted = false;

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
): number[] {
  let loads: number[] = [0];
  for (let i = 0; i < plates.length; i++) {
    const plate = plates[i];
    const loaded = 2 * plate.weight;
    for (let usedCount = 0; usedCount < plate.count; usedCount++) {
      loads = _merge(
        loads,
        loads.map((l) => l + loaded),
      );
    }
  }
  return loads;
}

export function determineWeightSpace(
  bars: readonly {
    weight: number;
    maxLoad?: number;
    plateThreshold?: number;
    plateLimits?: { [plateWeight: number]: number };
  }[],
  plates: readonly { weight: number; count: number }[],
) {
  if (bars.length === 0) return [];
  // merge all possible spaces for all selected bars
  return bars.map((b) => determineBarWeightSpace(b, plates)).reduce(_merge);
}

function determineBarWeightSpace(
  bar: {
    weight: number;
    maxLoad?: number;
    plateThreshold?: number;
    plateLimits?: { [plateWeight: number]: number };
  },
  plates: readonly { weight: number; count: number }[],
) {
  // filter plates by threshold
  const validPlates =
    bar.plateThreshold != null
      ? plates.filter((p) => p.weight <= bar.plateThreshold!)
      : plates;

  // apply per-plate limits
  const effectivePlates = validPlates.map((p) => {
    const limit = bar.plateLimits?.[p.weight];
    return limit != null ? { ...p, count: Math.min(p.count, limit) } : p;
  });

  const plateCombos = determinePlateCombos(effectivePlates);

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
export function chooseBar<Bar extends { type: string; weight: number }>(
  bars: readonly Bar[],
  target: number | null | undefined,
  type?: string | null,
  weight?: number | null,
): Bar | null {
  // no inputs; return null
  if (target == null || bars.length === 0) return null;

  let heaviest: Bar | null = null;
  for (const bar of bars) {
    if (type && bar.type !== type) continue;
    if (bar.weight === weight) return bar; // exact match
    if (bar.weight > target) continue;
    if (heaviest == null || bar.weight > heaviest.weight) heaviest = bar;
  }

  return heaviest;
}

export function closestTarget(rawTarget: number, possibleWeights: number[]) {
  // can't do it if no weights
  if (possibleWeights.length === 0) return undefined;

  // return undefined if outside the range; this allows better feedback
  if (rawTarget < possibleWeights[0]) return undefined;
  if (rawTarget > possibleWeights[possibleWeights.length - 1]) return undefined;

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
