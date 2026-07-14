"use client";

import { useEffect, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { ChevronDown, ChevronRight, Blocks } from "lucide-react";

const DEFAULT_TOGGLE_TITLE = "toggle action";

function ToggleActionComponent({ node, updateAttributes }: NodeViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(
    node.attrs.title || DEFAULT_TOGGLE_TITLE,
  );
  const isOpen = node.attrs.open ?? true;
  const title = node.attrs.title || DEFAULT_TOGGLE_TITLE;

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  const saveTitle = () => {
    const nextTitle = draftTitle.trim() || DEFAULT_TOGGLE_TITLE;
    updateAttributes({ title: nextTitle });
    setDraftTitle(nextTitle);
    setIsEditingTitle(false);
  };

  return (
    <NodeViewWrapper
      data-toggle-action
      className="my-3 rounded-tl-lg border border-border bg-muted/20 text-foreground transition-colors"
    >
      <div
        contentEditable={false}
        className="flex min-h-10 items-center gap-2 px-3 py-2"
      >
        <button
          type="button"
          aria-label={
            isOpen ? "Collapse toggle action" : "Expand toggle action"
          }
          className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => updateAttributes({ open: !isOpen })}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isEditingTitle ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveTitle();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDraftTitle(title);
                setIsEditingTitle(false);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
          />
        ) : (
          <button
            type="button"
            title="Double click to rename"
            className="min-w-0 truncate text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onDoubleClick={() => setIsEditingTitle(true)}
            onClick={() => updateAttributes({ open: !isOpen })}
          >
            {title}
          </button>
        )}
      </div>
      <NodeViewContent
        className={`px-5 pb-4 pt-1 ${isOpen ? "block" : "hidden"}`}
      />
    </NodeViewWrapper>
  );
}

export const ToggleAction = Node.create({
  name: "toggleAction",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({
          "data-open": attributes.open ? "true" : "false",
        }),
      },
      title: {
        default: DEFAULT_TOGGLE_TITLE,
        parseHTML: (element) =>
          element.getAttribute("data-title") || DEFAULT_TOGGLE_TITLE,
        renderHTML: (attributes) => ({
          "data-title": attributes.title || DEFAULT_TOGGLE_TITLE,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='toggle-action']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "toggle-action",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleActionComponent);
  },
});
