/** turn a string into a number or undefined */
export function numbdfined(value: string | null | undefined) {
  return value ? +value : undefined;
}

export function numbornull(value: string | null | undefined) {
  return value ? +value : null;
}

/** round to the nearest multiple of step, if step is positive */
export function roundToStep(value: number, step: number | null | undefined) {
  return step ? Math.round(value / step) * step : value;
}
