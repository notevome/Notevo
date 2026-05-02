import type { JSONContent } from "@tiptap/react";

const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function getEmptyTiptapDoc(): JSONContent {
  return structuredClone(EMPTY_TIPTAP_DOC);
}

export function parseTiptapContent(
  rawContent: unknown,
  fallback: JSONContent = EMPTY_TIPTAP_DOC,
): JSONContent {
  if (rawContent == null || rawContent === "") return getEmptyTiptapDoc();

  let parsedContent = rawContent;

  if (typeof parsedContent === "string") {
    try {
      parsedContent = JSON.parse(parsedContent);
    } catch (error) {
      console.error("Error parsing TipTap JSON string:", error);
      return fallback;
    }
  }

  if (Array.isArray(parsedContent)) {
    return {
      type: "doc",
      content: parsedContent,
    };
  }

  if (
    parsedContent &&
    typeof parsedContent === "object" &&
    "type" in parsedContent &&
    (parsedContent as JSONContent).type === "doc"
  ) {
    const rawDocContent = (parsedContent as JSONContent).content;
    const normalizedContent: JSONContent[] = Array.isArray(rawDocContent)
      ? rawDocContent
      : [];

    return {
      ...(parsedContent as JSONContent),
      type: "doc",
      content:
        normalizedContent.length > 0
          ? normalizedContent
          : [{ type: "paragraph" }],
    };
  }

  return fallback;
}

/**
 * Utility function to extract plain text from TipTap/Novel JSON content
 * This is a simplified version that handles basic text extraction
 */
export function extractTextFromTiptap(jsonContent: any): string {
  if (!jsonContent) return "";

  try {
    if (typeof jsonContent === "string") {
      try {
        jsonContent = JSON.parse(jsonContent);
      } catch {
        return jsonContent;
      }
    }

    if (jsonContent.content) {
      return extractFromNodes(jsonContent.content);
    }

    if (Array.isArray(jsonContent)) {
      return extractFromNodes(jsonContent);
    }

    return String(jsonContent);
  } catch (error) {
    console.error("Error parsing TipTap content:", error);
    return "Unable to display content preview";
  }
}

function extractFromNodes(nodes: any[]): string {
  if (!Array.isArray(nodes)) return "";

  return nodes
    .map((node) => {
      if (!node || typeof node !== "object") return "";

      if (node.text) {
        return node.text;
      }

      if (node.content && Array.isArray(node.content)) {
        return extractFromNodes(node.content);
      }

      if (node.type === "paragraph" || node.type === "heading") {
        if (node.content) {
          return `${extractFromNodes(node.content)}\n`;
        }
      }

      if (node.type) {
        switch (node.type) {
          case "image":
            return "[Image]";
          case "codeBlock":
            return "[Code Block]";
          case "bulletList":
          case "orderedList":
            return node.content ? extractFromNodes(node.content) : "";
          case "listItem":
            return node.content ? `- ${extractFromNodes(node.content)}` : "";
          default:
            return node.content ? extractFromNodes(node.content) : "";
        }
      }

      return "";
    })
    .join("");
}

/**
 * Truncates text to a specified length and adds ellipsis if needed
 */
export function truncateText(text: string, maxLength = 100): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength).trim() + "...";
}
