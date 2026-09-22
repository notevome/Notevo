import { describe, expect, it, vi } from "vitest";
import {
  extractTextFromTiptap,
  getEmptyTiptapDoc,
  parseTiptapContent,
  truncateText,
} from "./parse-tiptap-content";

describe("truncateText", () => {
  it("returns an empty string for empty input", () => {
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
  it("returns an empty string for nullish content", () => {
    expect(extractTextFromTiptap(null)).toBe("");
    expect(extractTextFromTiptap(undefined)).toBe("");
  });

  it("returns raw string when input is a non-JSON string", () => {
    expect(extractTextFromTiptap("plain text")).toBe("plain text");
  });

  it("handles a JSON string input that parses to TipTap content", () => {
    const asString = JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
    });

    expect(extractTextFromTiptap(asString)).toBe("Hi");
  });

  it("extracts text from paragraph and heading nodes", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
        {
          type: "heading",
          content: [{ type: "text", text: "World" }],
        },
      ],
    };

    expect(extractTextFromTiptap(doc)).toBe("HelloWorld");
  });

  it("renders placeholders for rich nodes without text content", () => {
    const doc = {
      type: "doc",
      content: [{ type: "image" }, { type: "codeBlock" }],
    };

    expect(extractTextFromTiptap(doc)).toBe("[Image][Code Block]");
  });

  it("adds list markers for list item content", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ text: "Task" }] }],
            },
          ],
        },
      ],
    };

    expect(extractTextFromTiptap(doc)).toBe("- Task");
  });

  it("returns a fallback preview when extraction throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const content = {
      get content() {
        throw new Error("broken content");
      },
    };

    expect(extractTextFromTiptap(content)).toBe(
      "Unable to display content preview",
    );
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("parseTiptapContent", () => {
  it("returns an empty TipTap doc for empty input", () => {
    expect(parseTiptapContent(undefined)).toEqual(getEmptyTiptapDoc());
    expect(parseTiptapContent("")).toEqual(getEmptyTiptapDoc());
  });

  it("returns a fresh empty doc each time", () => {
    const firstDoc = getEmptyTiptapDoc();
    firstDoc.content?.push({ type: "heading" });

    expect(getEmptyTiptapDoc()).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("normalizes array content into a TipTap doc", () => {
    expect(parseTiptapContent([{ type: "paragraph", content: [] }])).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    });
  });

  it("parses valid JSON string docs", () => {
    expect(parseTiptapContent('{"type":"doc","content":[{"type":"heading"}]}')).toEqual({
      type: "doc",
      content: [{ type: "heading" }],
    });
  });

  it("uses the provided fallback for invalid JSON and unsupported objects", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const fallback = { type: "doc", content: [{ type: "heading" }] };

    expect(parseTiptapContent("{", fallback)).toBe(fallback);
    expect(parseTiptapContent({ foo: "bar" }, fallback)).toBe(fallback);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("fills in an empty paragraph when doc content is missing or empty", () => {
    expect(parseTiptapContent({ type: "doc" })).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    expect(parseTiptapContent({ type: "doc", content: [] })).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });
});
