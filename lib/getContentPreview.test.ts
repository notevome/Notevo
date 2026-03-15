import { describe, expect, it } from "vitest";
import { getContentPreview } from "./getContentPreview";

describe("getContentPreview", () => {
  it("returns a default message for empty content", () => {
    expect(getContentPreview(null)).toBe("No content yet. Click to start writing...");
    expect(getContentPreview(undefined)).toBe("No content yet. Click to start writing...");
  });

  it("returns plain text for string content", () => {
    expect(getContentPreview("Hello")).toBe("Hello");
  });

  it("truncates according to view mode", () => {
    const content = "a".repeat(200);
    const grid = getContentPreview(content, "grid");
    const list = getContentPreview(content, "list");

    expect(grid).toHaveLength(83); // 80 + "..."
    expect(grid.endsWith("...")).toBe(true);

    expect(list).toHaveLength(123); // 120 + "..."
    expect(list.endsWith("...")).toBe(true);
  });
});

