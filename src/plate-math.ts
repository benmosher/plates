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

  return platesNeeded;
}
