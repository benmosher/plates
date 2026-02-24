import { expect, describe, test } from "vitest";

import {
  closestTarget,
  determinePlateCombos,
  determinePlates,
  determineWeightSpace,
} from "./plate-math";

/* start and end are inclusive */
function range(start: number, end: number, step = 1) {
  return Array.from(
    { length: Math.ceil((end - start) / step) + 1 },
    (_, i) => start + i * step,
  );
}

describe("plates needed", () => {
  test("returns multiples", () => {
    const plates = [
      { weight: 2.5, count: 4 },
      { weight: 5, count: 4 },
      { weight: 10, count: 4 },
    ];
    expect(determinePlates(62.5, { weight: 12.5 }, plates)).toEqual([
      { weight: 10, count: 2 },
      { weight: 5, count: 1 },
    ]);
  });

  test("respects plateLimits", () => {
    const plates = [
      { weight: 5, count: 4 },
      { weight: 10, count: 4 },
    ];
    // limit 10lb plates to 1 per side: 52.5 = 12.5 + 2*(10 + 5 + 5)
    expect(
      determinePlates(52.5, { weight: 12.5, plateLimits: { 10: 1 } }, plates),
    ).toEqual([
      { weight: 10, count: 1 },
      { weight: 5, count: 2 },
    ]);
  });

  test("avoids plates marked with avoid when possible", () => {
    const plates = [
      { weight: 10, count: 3 },
      { weight: 25, count: 1 },
      { weight: 35, count: 1, avoid: true },
      { weight: 45, count: 3 },
    ];
    // 295 on 45lb bar = 125 per side
    // greedy would pick: 45+45+35 = 125
    // with avoid: 45+45+25+10 = 125
    expect(determinePlates(295, { weight: 45 }, plates)).toEqual([
      { weight: 45, count: 2 },
      { weight: 25, count: 1 },
      { weight: 10, count: 1 },
    ]);
  });

  test("uses avoided plates when necessary to hit target", () => {
    const plates = [
      { weight: 10, count: 1 },
      { weight: 25, count: 1 },
      { weight: 35, count: 1, avoid: true },
      { weight: 45, count: 2 },
    ];
    // 315 on 45lb bar = 135 per side
    // without 35: 45+45+25+10 = 125 (can't reach 135)
    // with 35: 45+45+35+10 = 135
    expect(determinePlates(315, { weight: 45 }, plates)).toEqual([
      { weight: 45, count: 2 },
      { weight: 35, count: 1, avoid: true },
      { weight: 10, count: 1 },
    ]);
  });
});

function singles(weights: number[]) {
  return weights.map((w) => ({ weight: w, count: 1 }));
}

describe("plate math", () => {
  test("basic cases", () => {
    expect(determinePlateCombos(singles([1, 2]))).toEqual([0, 2, 4, 6]);
    expect(determinePlateCombos(singles([10]))).toEqual([0, 20]);
  });
  test("duplicate plates", () => {
    expect(determinePlateCombos([{ weight: 10, count: 2 }])).toEqual([
      0, 20, 40,
    ]);
    expect(determinePlateCombos([{ weight: 10, count: 3 }])).toEqual([
      0, 20, 40, 60,
    ]);
  });
  test("fractionals", () => {
    expect(determinePlateCombos(singles([0.25, 0.5, 0.75, 1]))).toEqual(
      range(0, 5, 0.5),
    );
  });
  test("full set", () => {
    expect(
      determinePlateCombos(singles([0.25, 0.5, 0.75, 1, 2.5, 5, 10])),
    ).toEqual(range(0, 40, 0.5));
  });
});
describe("weight space", () => {
  test("full set with handle", () => {
    expect(
      determineWeightSpace(
        [{ weight: 12.5 }],
        singles([0.25, 0.5, 0.75, 1, 2.5, 5, 10]),
      ),
    ).toEqual(range(12.5, 52.5, 0.5));
  });
  test("full set with 4 10s, with handle", () => {
    expect(
      determineWeightSpace(
        [{ weight: 12.5 }],
        [...singles([0.25, 0.5, 0.75, 1, 2.5, 5]), { weight: 10, count: 4 }],
      ),
    ).toEqual(range(12.5, 112.5, 0.5));
  });

  test("per-bar plateLimits reduce achievable weights", () => {
    // 2x10lb plates available, but bar limits to 1 per side
    const plates = [{ weight: 10, count: 2 }];
    expect(
      determineWeightSpace(
        [{ weight: 45, plateLimits: { 10: 1 } }],
        plates,
      ),
    ).toEqual([45, 65]);
    // without limit, should be 45, 65, 85
    expect(
      determineWeightSpace([{ weight: 45 }], plates),
    ).toEqual([45, 65, 85]);
  });
});

describe("choose closest weight", () => {
  const possibleWeights = range(45, 225, 5);
  // sanity check range
  expect(possibleWeights[0]).toBe(45);
  expect(possibleWeights[possibleWeights.length - 1]).toBe(225);

  const cases = [
    [45, 45],
    [46, 45],
    [47, 45],
    [134, 135],
    [137, 135],
    [138, 140],
    [225, 225],
    [0, undefined], // below min
    [1000, undefined], // above max
  ];
  cases.forEach(([input, expected]) => {
    test(`closest weight to ${input} is ${expected}`, () => {
      expect(closestTarget(input as number, possibleWeights)).toEqual(expected);
    });
  });
});
