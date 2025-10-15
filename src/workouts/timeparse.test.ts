import { expect, describe, test } from "vitest";

import { parseSeconds, stringifySeconds } from "./types";

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

  test("parses multiple resolutions", () => {
    expect(parseSeconds("2m30s")).toEqual(150);
    expect(parseSeconds("2min 30sec")).toEqual(150);
    expect(parseSeconds("1h30m")).toEqual(5400);
    expect(parseSeconds("1 hour 30 minutes")).toEqual(5400);
    expect(parseSeconds("2h15m30s")).toEqual(8130);
  });
});

describe("stringify time", () => {
  test("should stringify seconds", () => {
    expect(stringifySeconds(30)).toEqual("30s");
    expect(stringifySeconds(90)).toEqual("1m30s");
    expect(stringifySeconds(3600)).toEqual("1h");
    expect(stringifySeconds(3665)).toEqual("1h1m5s");
    expect(stringifySeconds(7320)).toEqual("2h2m");
    expect(stringifySeconds(0)).toEqual("");
    expect(stringifySeconds(undefined)).toEqual("");
  });
});
