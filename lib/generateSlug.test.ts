import { describe, expect, it } from "vitest";
import { generateSlug } from "./generateSlug";

describe("generateSlug", () => {
  it.each([
    ["Hello, World!", "hello-world"],
    ["  Hello   World  ", "hello-world"],
    ["A_B+C", "a-b-c"],
    ["Release Notes 2026", "release-notes-2026"],
  ])("normalizes %s into a URL slug", (input, expected) => {
    expect(generateSlug(input)).toBe(expected);
  });

  it.each([
    ["---Hello---", "hello"],
    ["   ", ""],
    ["!!!", ""],
  ])("trims generated separators for %s", (input, expected) => {
    expect(generateSlug(input)).toBe(expected);
  });
});
