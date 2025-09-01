export function determinePlates(
  target: number,
  handle: number,
  plates: readonly number[]
) {
  const platesNeeded: number[] = [];
  let weightLeft = (target - handle) / 2;

  for (let i = plates.length - 1; i >= 0; i--) {
    const nextPlate = plates[i];
    if (nextPlate <= weightLeft) {
      platesNeeded.push(nextPlate);
      weightLeft -= nextPlate;
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
