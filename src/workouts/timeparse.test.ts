import { expect, describe, test } from "vitest";

import { parseSeconds } from "./types";

describe("parse time", () => {
  test("should parse seconds", () => {
    expect(parseSeconds("30")).toEqual(30);
    expect(parseSeconds("30s")).toEqual(30);
    expect(parseSeconds("30 sec")).toEqual(30);
    expect(parseSeconds("30 seconds")).toEqual(30);
  });

  test("should parse minutes", () => {
    expect(parseSeconds("5m")).toEqual(300);
    expect(parseSeconds("5 min")).toEqual(300);
    expect(parseSeconds("5 minutes")).toEqual(300);
  });

  test("should parse hours", () => {
    expect(parseSeconds("2h")).toEqual(7200);
    expect(parseSeconds("2 hr")).toEqual(7200);
    expect(parseSeconds("2 hours")).toEqual(7200);
  });

  test("should return null for invalid input", () => {
    expect(parseSeconds("invalid")).toBeNull();
  });
});
