/** turn a string into a number or undefined */
export function numbdfined(value: string | null | undefined) {
  return value ? +value : undefined;
}
