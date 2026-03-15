import { describe, expect, it } from "vitest";
import { generateSlug } from "./generateSlug";

describe("generateSlug", () => {
  it("lowercases and replaces non-alphanumerics with hyphens", () => {
    expect(generateSlug("Hello, World!")).toBe("hello-world");
    expect(generateSlug("  Hello   World  ")).toBe("hello-world");
    expect(generateSlug("A_B+C")).toBe("a-b-c");
  });

  it("trims leading/trailing hyphens", () => {
    expect(generateSlug("---Hello---")).toBe("hello");
    expect(generateSlug("   ")).toBe("");
  });
});

