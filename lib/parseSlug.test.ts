import { describe, expect, it } from "vitest";
import { parseSlug } from "./parseSlug";

describe("parseSlug", () => {
  it("removes a trailing numeric suffix like -123", () => {
    expect(parseSlug("my-workspace-123")).toBe("My Workspace");
    expect(parseSlug("my-workspace-0")).toBe("My Workspace");
  });

  it("keeps digits that are not a trailing numeric suffix", () => {
    expect(parseSlug("note2-test")).toBe("Note2 Test");
    expect(parseSlug("note-2-test")).toBe("Note 2 Test");
  });
});

