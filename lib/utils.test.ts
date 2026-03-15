import { describe, expect, it } from "vitest";
import {
  cn,
  formatUserEmail,
  formatUserName,
  formatUserNoteTitle,
  formatWorkspaceName,
} from "./utils";

describe("utils formatting", () => {
  it("cn merges class names", () => {
    expect(cn("p-2", false && "hidden", "p-4")).toBe("p-4");
  });

  it("formatWorkspaceName truncates to 50 chars", () => {
    const name = "a".repeat(60);
    expect(formatWorkspaceName(name)).toBe(`${"a".repeat(50)}...`);
  });

  it("formatUserName formats first name and last initial", () => {
    expect(formatUserName("John Smith")).toBe("John S.");
    expect(formatUserName("John")).toBe("John.");
    expect(formatUserName(undefined)).toBeNull();
  });

  it("formatUserEmail masks the middle of the email", () => {
    expect(formatUserEmail("abcdef@example.com")).toBe("abc...@exa");
  });

  it("formatUserNoteTitle truncates based on viewport width", () => {
    // jsdom defaults; set explicitly for determinism
    Object.defineProperty(window, "innerWidth", { value: 500, writable: true });
    expect(formatUserNoteTitle("a".repeat(30))).toBe(`${"a".repeat(23)}…`);
  });
});

