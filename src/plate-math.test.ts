import { expect, describe, test } from "vitest";

import {
  chooseBar,
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

  test("returns empty for null target", () => {
    expect(determinePlates(null, { weight: 45 }, singles([10]))).toEqual([]);
  });

  test("returns empty for null handle", () => {
    expect(determinePlates(100, null, singles([10]))).toEqual([]);
  });

  test("returns empty for empty plates", () => {
    expect(determinePlates(100, { weight: 45 }, [])).toEqual([]);
  });

  test("respects plateThreshold on handle", () => {
    const plates = [
      { weight: 5, count: 4 },
      { weight: 10, count: 4 },
    ];
    // plateThreshold=5 means 10lb plates are skipped
    // target=50, handle=20 → 15 per side → only 5lb plates → 3x5=15
    expect(
      determinePlates(50, { weight: 20, plateThreshold: 5 }, plates),
    ).toEqual([{ weight: 5, count: 3 }]);
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

  test("returns empty for no bars", () => {
    expect(determineWeightSpace([], singles([10]))).toEqual([]);
  });

  test("plateThreshold filters heavy plates", () => {
    // bar with plateThreshold=5 should exclude 10lb plates
    const plates = singles([5, 10]);
    expect(
      determineWeightSpace([{ weight: 20, plateThreshold: 5 }], plates),
    ).toEqual([20, 30]);
  });

  test("maxLoad caps achievable weights", () => {
    const plates = [{ weight: 10, count: 3 }];
    // bar=20, combos=0,20,40,60 → totals=20,40,60,80
    // maxLoad=50 caps at 40
    expect(
      determineWeightSpace([{ weight: 20, maxLoad: 50 }], plates),
    ).toEqual([20, 40]);
  });

  test("multiple bars merge interleaved weight spaces", () => {
    // bar1=10 with plates [5] → [10, 20]
    // bar2=15 with plates [5] → [15, 25]
    // merged → [10, 15, 20, 25]
    const plates = singles([5]);
    expect(
      determineWeightSpace(
        [{ weight: 10 }, { weight: 15 }],
        plates,
      ),
    ).toEqual([10, 15, 20, 25]);
  });

  test("merge handles first array having larger tail", () => {
    // bar1=20 with [10] → [20, 40]
    // bar2=5 with [10] → [5, 25]
    // _merge([20,40], [5,25]):
    //   5<20→push 5, 20<25→push 20, 25<40→push 25, a-tail→push 40
    const plates = singles([10]);
    expect(
      determineWeightSpace(
        [{ weight: 20 }, { weight: 5 }],
        plates,
      ),
    ).toEqual([5, 20, 25, 40]);
  });
});

describe("chooseBar", () => {
  const bars = [
    { type: "barbell", weight: 45 },
    { type: "barbell", weight: 35 },
    { type: "dumbbell", weight: 15 },
    { type: "dumbbell", weight: 10 },
  ];

  test("returns null for null target", () => {
    expect(chooseBar(bars, null)).toBeNull();
  });

  test("returns null for undefined target", () => {
    expect(chooseBar(bars, undefined)).toBeNull();
  });

  test("returns null for empty bars", () => {
    expect(chooseBar([], 100)).toBeNull();
  });

  test("returns heaviest bar under target", () => {
    expect(chooseBar(bars, 100)).toEqual({ type: "barbell", weight: 45 });
  });

  test("filters by type", () => {
    expect(chooseBar(bars, 100, "dumbbell")).toEqual({
      type: "dumbbell",
      weight: 15,
    });
  });

  test("returns exact weight match", () => {
    expect(chooseBar(bars, 100, null, 35)).toEqual({
      type: "barbell",
      weight: 35,
    });
  });

  test("skips bars heavier than target", () => {
    // target=20: barbell 45 and 35 are too heavy, dumbbell 15 fits
    expect(chooseBar(bars, 20)).toEqual({ type: "dumbbell", weight: 15 });
  });

  test("returns null when all bars exceed target", () => {
    expect(chooseBar(bars, 5)).toBeNull();
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

  test("returns undefined for empty weight list", () => {
    expect(closestTarget(100, [])).toBeUndefined();
  });
});
