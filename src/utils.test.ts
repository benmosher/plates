import { expect, describe, test } from "vitest";
import { numbdfined, numbornull, roundToStep } from "./utils";

describe("numbdfined", () => {
  test("converts numeric string to number", () => {
    expect(numbdfined("42")).toBe(42);
  });
  test("converts decimal string to number", () => {
    expect(numbdfined("3.14")).toBe(3.14);
  });
  test("returns undefined for null", () => {
    expect(numbdfined(null)).toBeUndefined();
  });
  test("returns undefined for undefined", () => {
    expect(numbdfined(undefined)).toBeUndefined();
  });
  test("returns undefined for empty string", () => {
    expect(numbdfined("")).toBeUndefined();
  });
});

describe("numbornull", () => {
  test("converts numeric string to number", () => {
    expect(numbornull("42")).toBe(42);
  });
  test("returns null for null", () => {
    expect(numbornull(null)).toBeNull();
  });
  test("returns null for undefined", () => {
    expect(numbornull(undefined)).toBeNull();
  });
  test("returns null for empty string", () => {
    expect(numbornull("")).toBeNull();
  });
});

describe("roundToStep", () => {
  test("rounds to nearest multiple of step", () => {
    expect(roundToStep(266.25, 5)).toBe(265);
    expect(roundToStep(267.5, 5)).toBe(270);
  });
  test("handles fractional steps", () => {
    expect(roundToStep(41.3, 2.5)).toBe(42.5);
  });
  test("returns value unchanged when step is missing", () => {
    expect(roundToStep(266.25, undefined)).toBe(266.25);
    expect(roundToStep(266.25, null)).toBe(266.25);
    expect(roundToStep(266.25, 0)).toBe(266.25);
  });
});
