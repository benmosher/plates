import { expect, describe, test } from "vitest";
import { numbdfined, numbornull } from "./utils";

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
