import { beforeEach, describe, expect, it } from "vitest";
import {
  cn,
  formatNoteTimestamp,
  formatTableName,
  formatUserEmail,
  formatUserName,
  formatUserNoteTitle,
  formatWorkspaceName,
  formatWorkspaceNameForCreateSideBarBtn,
} from "./utils";

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

describe("cn", () => {
  it("merges conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("p-2 text-sm", false && "hidden", "p-4", ["font-bold"])).toBe(
      "text-sm p-4 font-bold",
    );
  });
});

describe("name and email formatting", () => {
  it("truncates workspace names for the places they appear", () => {
    expect(formatWorkspaceName("a".repeat(51))).toBe(`${"a".repeat(50)}...`);
    expect(formatWorkspaceNameForCreateSideBarBtn("a".repeat(21))).toBe(
      `${"a".repeat(20)}...`,
    );
  });

  it("keeps short workspace names unchanged", () => {
    expect(formatWorkspaceName("Product notes")).toBe("Product notes");
    expect(formatWorkspaceNameForCreateSideBarBtn("Inbox")).toBe("Inbox");
  });

  it("formats display names with a first name and optional last initial", () => {
    expect(formatUserName("John Smith")).toBe("John S.");
    expect(formatUserName("John")).toBe("John.");
    expect(formatUserName("Longfirstname Smith")).toBe("Longfirstn... S.");
    expect(formatUserName(undefined)).toBeNull();
  });

  it("masks the middle of valid emails and handles empty values", () => {
    expect(formatUserEmail("abcdef@example.com")).toBe("abc...@exa");
    expect(formatUserEmail(undefined)).toBe("");
  });
});

describe("responsive labels", () => {
  beforeEach(() => {
    setViewportWidth(1280);
  });

  it.each([
    { width: 500, visibleChars: 23 },
    { width: 800, visibleChars: 35 },
    { width: 1280, visibleChars: 60 },
  ])("truncates note titles for a $width px viewport", ({ width, visibleChars }) => {
    setViewportWidth(width);
    expect(formatUserNoteTitle("a".repeat(80))).toBe(
      `${"a".repeat(visibleChars)}…`,
    );
  });

  it.each([
    { width: 500, visibleChars: 10 },
    { width: 800, visibleChars: 15 },
    { width: 1280, visibleChars: 20 },
  ])("truncates table names for a $width px viewport", ({ width, visibleChars }) => {
    setViewportWidth(width);
    expect(formatTableName("a".repeat(30))).toBe(
      `${"a".repeat(visibleChars)}...`,
    );
  });

  it("returns empty strings for empty responsive labels", () => {
    expect(formatUserNoteTitle("")).toBe("");
    expect(formatTableName("")).toBe("");
  });
});

describe("date formatting", () => {
  it("formats timestamps as compact calendar dates", () => {
    expect(formatNoteTimestamp(Date.UTC(2026, 0, 2))).toMatch(/^Jan 2, 2026$/);
  });

  it("returns an empty string when no timestamp is available", () => {
    expect(formatNoteTimestamp()).toBe("");
    expect(formatNoteTimestamp(0)).toBe("");
  });
});
