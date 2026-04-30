import { describe, expect, it } from "vitest";
import {
  extractTextFromTiptap,
  getEmptyTiptapDoc,
  parseTiptapContent,
  truncateText,
} from "./parse-tiptap-content";

describe("truncateText", () => {
  it("returns empty string for empty input", () => {
    expect(truncateText("")).toBe("");
  });

  it("returns the original string when within maxLength", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis when longer than maxLength", () => {
    expect(truncateText("hello world", 5)).toBe("hello...");
  });
});

describe("extractTextFromTiptap", () => {
  it("returns empty string for null/undefined", () => {
    expect(extractTextFromTiptap(null)).toBe("");
    expect(extractTextFromTiptap(undefined)).toBe("");
  });

  it("returns raw string when input is a non-JSON string", () => {
    expect(extractTextFromTiptap("plain text")).toBe("plain text");
  });

  it("extracts text from a basic TipTap JSON structure", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "World" }],
        },
      ],
    };

    expect(extractTextFromTiptap(doc)).toBe("HelloWorld");
  });

  it("handles a JSON string input that parses to TipTap content", () => {
    const asString = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
    });

    expect(extractTextFromTiptap(asString)).toBe("Hi");
  });

  it("renders placeholders for nodes without text/content (e.g. image)", () => {
    const doc = {
      type: "doc",
      content: [{ type: "image" }],
    };

    expect(extractTextFromTiptap(doc)).toBe("[Image]");
  });
});

describe("parseTiptapContent", () => {
  it("returns an empty doc for empty input", () => {
    expect(parseTiptapContent(undefined)).toEqual(getEmptyTiptapDoc());
    expect(parseTiptapContent("")).toEqual(getEmptyTiptapDoc());
  });

  it("normalizes array content into a TipTap doc", () => {
    expect(parseTiptapContent([{ type: "paragraph", content: [] }])).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    });
  });

  it("falls back when the parsed value is not a TipTap doc", () => {
    expect(parseTiptapContent('{"foo":"bar"}')).toEqual(getEmptyTiptapDoc());
  });

  it("fills in a missing content array on doc nodes", () => {
    expect(parseTiptapContent({ type: "doc" })).toEqual({
      type: "doc",
      content: [],
    });
  });
});
