export function determinePlates(
  target: number,
  handle: number,
  plates: readonly number[]
) {
  const platesNeeded: number[] = [];
  let weightLeft = (target - handle) / 2;

  let i = plates.length - 1;
  while (i >= 0 && weightLeft > 0) {
    const nextPlate = plates[i];
    if (nextPlate && nextPlate <= weightLeft) {
      platesNeeded.push(nextPlate);
      weightLeft -= nextPlate;
    } else {
      i--;
    }
  }

  if (weightLeft != 0) {
    // If there's still weight left,
    // jam it on as a bonus plate
    // it might be negative!
    platesNeeded.push(weightLeft);
  }

  return platesNeeded;
}
