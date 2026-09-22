import { describe, expect, it } from "vitest";
import { parseSlug } from "./parseSlug";

describe("parseSlug", () => {
  it.each([
    ["my-workspace-123", "My Workspace"],
    ["my-workspace-0", "My Workspace"],
    ["project-plan-2026", "Project Plan"],
  ])("removes a trailing numeric suffix from %s", (slug, expected) => {
    expect(parseSlug(slug)).toBe(expected);
  });

  it.each([
    ["note2-test", "Note2 Test"],
    ["note-2-test", "Note 2 Test"],
    ["v2-launch-plan-alpha", "V2 Launch Plan Alpha"],
  ])("keeps non-trailing digits in %s", (slug, expected) => {
    expect(parseSlug(slug)).toBe(expected);
  });

  it("converts hyphen-separated words into title case", () => {
    expect(parseSlug("team-meeting-notes")).toBe("Team Meeting Notes");
  });
});
