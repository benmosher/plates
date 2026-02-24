import { expect, describe, test, vi } from "vitest";
import { exportWorkout, decodeWorkout, buildImportUrl } from "./workout-export";
import { Workout } from "./workout-types";
import { Max } from "./plate-db";

const maxes: Max[] = [
  { id: 1, label: "Squat", weight: 355 },
  { id: 2, label: "Bench", weight: 230 },
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
    const encoded = await exportWorkout(workout, maxes);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.name).toBe("Test Day");
  });

  test("replaces maxId with maxName", async () => {
    const encoded = await exportWorkout(workout, maxes);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0].maxName).toBe("Squat");
    expect(decoded.groups[1].movements[0].maxName).toBe("Bench");
  });

  test("null maxId becomes null maxName", async () => {
    const encoded = await exportWorkout(workout, maxes);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[2].movements[0].maxName).toBeNull();
  });

  test("preserves set data", async () => {
    const encoded = await exportWorkout(workout, maxes);
    const decoded = await decodeWorkout(encoded);
    const sets = decoded.groups[0].movements[0].sets;
    expect(sets).toEqual([
      { reps: 5, count: 3, weight: 80 },
    ]);
  });

  test("preserves restSeconds when present", async () => {
    const encoded = await exportWorkout(workout, maxes);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].restSeconds).toBe(180);
  });

  test("omits restSeconds when absent", async () => {
    const encoded = await exportWorkout(workout, maxes);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[1].restSeconds).toBeUndefined();
  });

  test("preserves movement names", async () => {
    const encoded = await exportWorkout(workout, maxes);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups.map((g) => g.movements[0].name)).toEqual([
      "Back Squat",
      "Bench Press",
      "Curls",
    ]);
  });

  test("strips workout id from export", async () => {
    const encoded = await exportWorkout(workout, maxes);
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
    const encoded = await exportWorkout(workoutWithMissing, maxes);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements[0].maxName).toBeNull();
  });

  test("empty workout round-trips", async () => {
    const empty: Workout = { name: "", groups: [] };
    const encoded = await exportWorkout(empty, []);
    const decoded = await decodeWorkout(encoded);
    expect(decoded).toEqual({ name: "", groups: [] });
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
    const encoded = await exportWorkout(superset, maxes);
    const decoded = await decodeWorkout(encoded);
    expect(decoded.groups[0].movements).toHaveLength(2);
    expect(decoded.groups[0].movements[0].maxName).toBe("Squat");
    expect(decoded.groups[0].movements[1].maxName).toBeNull();
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
