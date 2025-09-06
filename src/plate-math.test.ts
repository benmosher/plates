import { expect, describe, test } from "vitest";

import { determinePlateCombos, determineWeightSpace } from "./plate-math";

/* start and end are inclusive */
function range(start: number, end: number, step = 1) {
  return Array.from(
    { length: Math.ceil((end - start) / step) + 1 },
    (_, i) => start + i * step
  );
}

describe("plate math", () => {
  test("basic cases", () => {
    expect(determinePlateCombos([1, 2])).toEqual([0, 2, 4, 6]);
    expect(determinePlateCombos([10])).toEqual([0, 20]);
  });
  test("duplicate plates", () => {
    expect(determinePlateCombos([10, 10])).toEqual([0, 20, 40]);
    expect(determinePlateCombos([10, 10, 10])).toEqual([0, 20, 40, 60]);
  });
  test("fractionals", () => {
    expect(determinePlateCombos([0.25, 0.5, 0.75, 1])).toEqual(
      range(0, 5, 0.5)
    );
  });
  test("full set", () => {
    expect(determinePlateCombos([0.25, 0.5, 0.75, 1, 2.5, 5, 10])).toEqual(
      range(0, 40, 0.5)
    );
  });
});
describe("weight space", () => {
  test("full set with handle", () => {
    expect(
      determineWeightSpace(12.5, [0.25, 0.5, 0.75, 1, 2.5, 5, 10])
    ).toEqual(range(12.5, 52.5, 0.5));
  });
  test("full set with 4 10s, with handle", () => {
    expect(
      determineWeightSpace(12.5, [0.25, 0.5, 0.75, 1, 2.5, 5, 10, 10, 10, 10])
    ).toEqual(range(12.5, 112.5, 0.5));
  });
});
