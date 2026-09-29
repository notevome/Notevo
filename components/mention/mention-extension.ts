import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export interface MentionPluginState {
  isOpen: boolean;
  query: string;
  range: { from: number; to: number };
  clientRect: (() => DOMRect | null) | null;
  command: (item: any) => void;
}

export type MentionListener = (state: MentionPluginState | null) => void;
export type MentionKeyHandler = (event: KeyboardEvent) => boolean;

class MentionRegistry {
  private listener: MentionListener | null = null;
  private keyHandler: MentionKeyHandler | null = null;

  setListener(listener: MentionListener | null) {
    this.listener = listener;
  }

  setKeyHandler(handler: MentionKeyHandler | null) {
    this.keyHandler = handler;
  }

  notify(state: MentionPluginState | null) {
    this.listener?.(state);
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (this.keyHandler) {
      return this.keyHandler(event);
    }
    return false;
  }
}

export const mentionRegistry = new MentionRegistry();

export const MentionPluginKey = new PluginKey("mention");

const MentionTriggerKey = new PluginKey<number | null>("mention-trigger");

const NoLinkInheritKey = new PluginKey("mention-no-link-inherit");

export function dismissMention(view: EditorView) {
  try {
    view.dispatch(
      view.state.tr
        .setMeta(MentionPluginKey, { exit: true })
        .setMeta(MentionTriggerKey, { clear: true }),
    );
  } catch {
    // editor already destroyed
  }
}

const MAX_QUERY_LENGTH = 60;

const MENTION_PLACEHOLDER = "Search notes, PDFs, whiteboards or links…";
const MENTION_EMPTY_CLASS = "mention-query-empty";
const PLACEHOLDER_STYLE_ID = "mention-placeholder-style";

function ensurePlaceholderStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(PLACEHOLDER_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PLACEHOLDER_STYLE_ID;
  style.textContent = `
.mention-query-active.${MENTION_EMPTY_CLASS}::after {
  content: attr(data-decoration-content);
  margin-left: 0.4em;
  opacity: 0.55;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}`;
  document.head.appendChild(style);
}

function charAt(doc: any, pos: number): string {
  try {
    return doc.textBetween(pos, pos + 1);
  } catch {
    return "";
  }
}

export const MentionExtension = Extension.create({
  name: "mention-command",

  addOptions() {
    return {
      suggestion: {
        char: "@",
        allowSpaces: true,
        allowedPrefixes: [" ", "\n"],
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },

  onCreate() {
    ensurePlaceholderStyle();
  },

  addProseMirrorPlugins() {
    const userAllow = (
      this.options.suggestion as { allow?: (props: any) => boolean }
    ).allow;

    const triggerPlugin = new Plugin<number | null>({
      key: MentionTriggerKey,
      state: {
        init: () => null,
        apply: (tr, prev, _oldState, newState) => {
          if (tr.getMeta(MentionTriggerKey)?.clear) return null;
          if (tr.getMeta("pointer")) return null; // mouse click / drag
          if (!tr.docChanged) return prev;

          // Did this transaction type a single "@"?
          let typedAt: number | null = null;
          tr.mapping.maps.forEach((map, i) => {
            map.forEach((oldStart, oldEnd, newStart, newEnd) => {
              if (oldStart === oldEnd && newEnd - newStart === 1) {
                const pos = tr.mapping.slice(i + 1).map(newStart, -1);
                if (charAt(newState.doc, pos) === "@") typedAt = pos;
              }
            });
          });
          if (typedAt !== null) return typedAt;

          if (prev === null) return null;
          const mapped = tr.mapping.mapResult(prev, -1);
          if (mapped.deleted) return null;
          return charAt(newState.doc, mapped.pos) === "@" ? mapped.pos : null;
        },
      },
    });

    const noLinkInheritPlugin = new Plugin({
      key: NoLinkInheritKey,
      appendTransaction: (transactions, oldState, newState) => {
        const linkType = newState.schema.marks.link;
        if (!linkType) return null;

        const changed = transactions.filter((t) => t.docChanged);
        if (changed.length !== 1) return null;
        const tr = changed[0];
        if (tr.steps.length !== 1) return null;
        if (tr.getMeta("paste") || tr.getMeta("uiEvent") === "paste") {
          return null;
        }

        let insertedAt: number | null = null;
        let oldPos = 0;
        tr.mapping.maps[0].forEach((oldStart, oldEnd, newStart, newEnd) => {
          if (oldStart === oldEnd && newEnd - newStart === 1) {
            insertedAt = newStart;
            oldPos = oldStart;
          }
        });
        if (insertedAt === null) return null;

        const node = newState.doc.resolve(insertedAt).nodeAfter;
        if (!node || !node.isText || !linkType.isInSet(node.marks)) return null;

        const before = oldState.doc.resolve(oldPos).marks();
        if (linkType.isInSet(before)) return null;

        return newState.tr
          .removeMark(insertedAt, insertedAt + 1, linkType)
          .setStoredMarks(
            (newState.storedMarks ?? []).filter((m) => m.type !== linkType),
          )
          .setMeta("addToHistory", false);
      },
    });

    return [
      noLinkInheritPlugin,
      triggerPlugin,
      Suggestion({
        editor: this.editor,
        pluginKey: MentionPluginKey,
        decorationTag: "span",
        decorationClass: "mention-query-active",
        decorationEmptyClass: MENTION_EMPTY_CLASS,
        decorationContent: MENTION_PLACEHOLDER,
        ...this.options.suggestion,

        allow: (props: any) => {
          const { state, range } = props;

          const trigger = MentionTriggerKey.getState(state);
          if (trigger !== undefined && trigger !== range.from) return false;

          const linkType = state.schema.marks.link;
          if (
            linkType &&
            state.doc.rangeHasMark(range.from, range.from + 1, linkType)
          ) {
            return false;
          }

          const text = state.doc.textBetween(range.from, range.to, "\n", "\n");
          const query = text.slice(1);

          if (query.length > MAX_QUERY_LENGTH) return false;

          if (query.includes("\n") || query.includes("  ")) return false;

          return userAllow ? userAllow(props) : true;
        },

        render: () => ({
          onStart: (props) => {
            mentionRegistry.notify({
              isOpen: true,
              query: props.query,
              range: props.range,
              clientRect: props.clientRect || null,
              command: props.command,
            });
          },
          onUpdate: (props) => {
            mentionRegistry.notify({
              isOpen: true,
              query: props.query,
              range: props.range,
              clientRect: props.clientRect || null,
              command: props.command,
            });
          },
          onKeyDown: (props) => {
            if (props.event.key === "Escape") {
              dismissMention(props.view);
              mentionRegistry.notify(null);
              return true;
            }
            return mentionRegistry.handleKeyDown(props.event);
          },
          onExit: () => {
            mentionRegistry.notify(null);
          },
        }),
      }),
    ];
  },
});
