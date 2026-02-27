import { expect, describe, test, vi } from "vitest";
import { exportWorkout, decodeWorkout, buildImportUrl } from "./workout-export";
import { Workout } from "./workout-types";
import { Bar, Max } from "./plate-db";

const maxes: Max[] = [
  { id: 1, label: "Squat", weight: 355 },
  { id: 2, label: "Bench", weight: 230 },
];

const bars: Bar[] = [
  { idx: 0, name: "Olympic barbell", type: "barbell", weight: 45, barLength: 500, handleWidth: 200 },
  { idx: 1, name: "Olympic dumbbell", type: "dumbbell", weight: 12.5, barLength: 260, handleWidth: 80 },
];

const workout: Workout = {
  id: 42,
  name: "Test Day",
  groups: [
    {
      movements: [
        {
          name: "Back Squat",
          maxId: 1,
          sets: [
            { reps: 5, count: 3, weight: 80 },
          ],
        },
      ],
      restSeconds: 180,
    },
    {
      movements: [
        {
          name: "Bench Press",
          maxId: 2,
          sets: [
            { reps: 8, count: 4, weight: 70 },
          ],
        },
      ],
    },
    {
      movements: [
        {
          name: "Curls",
          maxId: null,
          sets: [
            { reps: 12, count: 3, weight: 30 },
          ],
        },
      ],
    },
  ],
};

describe("exportWorkout + decodeWorkout round-trip", () => {
  test("preserves workout name", async () => {
    const encoded = await exportWorkout(workout, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.name).toBe("Test Day");
  });

  test("replaces maxId with maxName", async () => {
    const encoded = await exportWorkout(workout, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0].maxName).toBe("Squat");
    expect(decoded.groups[1].movements[0].maxName).toBe("Bench");
  });

  test("null maxId becomes null maxName", async () => {
    const encoded = await exportWorkout(workout, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[2].movements[0].maxName).toBeNull();
  });

  test("preserves set data", async () => {
    const encoded = await exportWorkout(workout, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    const sets = decoded.groups[0].movements[0].sets;
    expect(sets).toEqual([
      { reps: 5, count: 3, weight: 80 },
    ]);
  });

  test("preserves restSeconds when present", async () => {
    const encoded = await exportWorkout(workout, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].restSeconds).toBe(180);
  });

  test("omits restSeconds when absent", async () => {
    const encoded = await exportWorkout(workout, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[1].restSeconds).toBeUndefined();
  });

  test("preserves movement names", async () => {
    const encoded = await exportWorkout(workout, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups.map((g) => g.movements[0].name)).toEqual([
      "Back Squat",
      "Bench Press",
      "Curls",
    ]);
  });

  test("strips workout id from export", async () => {
    const encoded = await exportWorkout(workout, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded).not.toHaveProperty("id");
  });
});

describe("exportWorkout edge cases", () => {
  test("missing max resolves maxName to null", async () => {
    const workoutWithMissing: Workout = {
      name: "Ghost",
      groups: [
        {
          movements: [
            { name: "Mystery", maxId: 999, sets: [] },
          ],
        },
      ],
    };
    const encoded = await exportWorkout(workoutWithMissing, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0].maxName).toBeNull();
  });

  test("empty workout round-trips", async () => {
    const empty: Workout = { name: "", groups: [] };
    const encoded = await exportWorkout(empty, [], []);
    const decoded = await decodeWorkout(encoded);
    expect(decoded).toEqual({ name: "", groups: [] });
  });

  test("group notes round-trip", async () => {
    const withNotes: Workout = {
      name: "Notes Day",
      groups: [
        {
          movements: [
            { name: "Squat", maxId: null, sets: [{ reps: 5, count: 3, weight: 80 }] },
          ],
          notes: "Focus on depth",
        },
      ],
    };
    const encoded = await exportWorkout(withNotes, [], []);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].notes).toBe("Focus on depth");
  });

  test("superset (multiple movements per group) round-trips", async () => {
    const superset: Workout = {
      name: "Superset Day",
      groups: [
        {
          movements: [
            { name: "A1", maxId: 1, sets: [{ reps: 10, count: 1, weight: 60 }] },
            { name: "A2", maxId: null, sets: [{ reps: 10, count: 1, weight: 50 }] },
          ],
          restSeconds: 60,
        },
      ],
    };
    const encoded = await exportWorkout(superset, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements).toHaveLength(2);
    expect(decoded.groups[0].movements[0].maxName).toBe("Squat");
    expect(decoded.groups[0].movements[1].maxName).toBeNull();
  });
});

describe("barType round-trip", () => {
  test("preserves barType from bar type selection", async () => {
    const withBarType: Workout = {
      name: "Bar Day",
      groups: [
        {
          movements: [
            { name: "Back Squat", maxId: 1, bar: { type: "barbell" }, sets: [{ reps: 5, count: 3, weight: 80 }] },
          ],
        },
      ],
    };
    const encoded = await exportWorkout(withBarType, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0].barType).toBe("barbell");
  });

  test("resolves bar id to bar type on export", async () => {
    const withBarId: Workout = {
      name: "Specific Bar Day",
      groups: [
        {
          movements: [
            { name: "Squat", maxId: null, bar: { id: 0 }, sets: [{ reps: 5, count: 1, weight: 135 }] },
          ],
        },
      ],
    };
    const encoded = await exportWorkout(withBarId, [], bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0].barType).toBe("barbell");
  });

  test("omits barType when bar absent", async () => {
    const encoded = await exportWorkout(workout, maxes, bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0]).not.toHaveProperty("barType");
  });

  test("mixed bar and no-bar movements round-trip", async () => {
    const mixed: Workout = {
      name: "Mixed",
      groups: [
        {
          movements: [
            { name: "Squat", maxId: null, bar: { type: "barbell" }, sets: [{ reps: 5, count: 1, weight: 135 }] },
            { name: "Curls", maxId: null, sets: [{ reps: 12, count: 3, weight: 30 }] },
          ],
        },
      ],
    };
    const encoded = await exportWorkout(mixed, [], bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0].barType).toBe("barbell");
    expect(decoded.groups[0].movements[1]).not.toHaveProperty("barType");
  });

  test("dumbbell barType round-trips", async () => {
    const dbWorkout: Workout = {
      name: "DB Day",
      groups: [
        {
          movements: [
            { name: "DB Press", maxId: null, bar: { type: "dumbbell" }, sets: [{ reps: 10, count: 3, weight: 50 }] },
          ],
        },
      ],
    };
    const encoded = await exportWorkout(dbWorkout, [], bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0].barType).toBe("dumbbell");
  });

  test("unknown bar id omits barType", async () => {
    const withUnknown: Workout = {
      name: "Unknown Bar",
      groups: [
        {
          movements: [
            { name: "Mystery", maxId: null, bar: { id: 999 }, sets: [] },
          ],
        },
      ],
    };
    const encoded = await exportWorkout(withUnknown, [], bars);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0]).not.toHaveProperty("barType");
  });
});

describe("folder round-trip", () => {
  test("preserves folder when present", async () => {
    const withFolder: Workout = {
      name: "Leg Day",
      folder: "Week 1",
      groups: [
        {
          movements: [{ name: "Squat", maxId: null, sets: [{ reps: 5, count: 3, weight: 135 }] }],
        },
      ],
    };
    const encoded = await exportWorkout(withFolder, [], []);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.folder).toBe("Week 1");
  });

  test("omits folder when absent", async () => {
    const noFolder: Workout = { name: "Quick", groups: [] };
    const encoded = await exportWorkout(noFolder, [], []);
    const decoded = await decodeWorkout(encoded);
    expect(decoded).not.toHaveProperty("folder");
  });
});

describe("decodeWorkout error handling", () => {
  test("rejects invalid base64", async () => {
    await expect(decodeWorkout("!!!invalid!!!")).rejects.toThrow();
  });
});

describe("buildImportUrl", () => {
  test("constructs URL with encoded data as query param", () => {
    vi.stubGlobal("window", { location: { origin: "https://example.com" } });
    try {
      const url = buildImportUrl("abc123");
      expect(url).toContain("https://example.com");
      expect(url).toContain("/workouts/import?d=abc123");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
