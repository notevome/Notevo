import {
  AIHighlight,
  CharacterCount,
  Color,
  CustomKeymap,
  GlobalDragHandle,
  HighlightExtension,
  HorizontalRule,
  Mathematics,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TextStyle,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
  Twitter,
  UpdatedImage,
  Youtube,
} from "novel";
import { UploadImagesPlugin } from "novel";
import { cx } from "class-variance-authority";
import { common, createLowlight } from "lowlight";
import typescript from "highlight.js/lib/languages/typescript";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Highlight from "@tiptap/extension-highlight";
import { mergeAttributes } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CodeBlockComponent } from "./code-block-component";
import TextAlign from "@tiptap/extension-text-align";

const aiHighlight = AIHighlight;

const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: cx(
      "novel-link text-blue-800 dark:text-blue-200 underline underline-offset-[3px] hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer",
    ),
  },
});

const tiptapImage = TiptapImage.extend({
  addProseMirrorPlugins() {
    return [
      UploadImagesPlugin({
        imageClass: cx("opacity-40 rounded-lg border border-stone-200"),
      }),
    ];
  },
}).configure({
  allowBase64: true,
  HTMLAttributes: {
    class: cx("rounded-lg border border-muted"),
  },
});

const updatedImage = UpdatedImage.configure({
  HTMLAttributes: {
    class: cx("rounded-lg"),
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: "list-none p-0 m-0",
  },
});

const taskItem = TaskItem.configure({
  nested: true,
  HTMLAttributes: {
    class: "flex gap-2 items-start",
  },
});

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: cx("mt-4 mb-6 border-t border-muted-foreground"),
  },
});

// Custom Heading extension that adds data-toc-id attribute
const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        rendered: true,
        parseHTML: (element) => element.getAttribute("data-toc-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            "data-toc-id": attributes.id,
          };
        },
      },
    };
  },
}).configure({
  levels: [1, 2, 3, 4, 5, 6],
  HTMLAttributes: {
    class: cx("scroll-mt-24"),
  },
});

const starterKit = StarterKit.configure({
  codeBlock: false,
  heading: false, // Disable the default heading extension
  bulletList: {
    HTMLAttributes: {
      class: cx("list-disc list-outside leading-3 -mt-2"),
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: cx("list-decimal list-outside leading-3 -mt-2"),
    },
  },
  listItem: {
    HTMLAttributes: {
      class: cx("leading-normal -mb-2"),
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: cx("border-l-4 border-primary"),
    },
  },
  code: {
    HTMLAttributes: {
      class: cx(
        "rounded-sm text-secondary-foreground bg-secondary px-1.5 py-0.5 font-mono text-[0.875em]",
      ),
      spellcheck: "false",
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: "#DBEAFE",
    width: 4,
  },
  gapcursor: false,
});

const lowlight = createLowlight(common);
lowlight.register("typescript", typescript);

const customCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
}).configure({
  lowlight,
  HTMLAttributes: {
    class: "code-block-wrapper",
  },
});

const youtube = Youtube.configure({
  HTMLAttributes: {
    class: cx("rounded-lg border border-muted my-4"),
  },
  inline: false,
  width: 640,
  height: 480,
});

// Table Extensions with proper styling
const table = Table.configure({
  resizable: true,
  lastColumnResizable: true,
  allowTableNodeSelection: true,
  HTMLAttributes: {
    class: cx("border-collapse table-auto w-full my-4"),
  },
});

const tableRow = TableRow.configure({
  HTMLAttributes: {
    class: cx("border-t border-border"),
  },
});

const tableHeader = TableHeader.configure({
  HTMLAttributes: {
    class: cx(
      "border border-border bg-muted font-semibold text-left p-3 min-w-[100px]",
    ),
  },
});

const TipTapExtensionTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
        parseHTML: (element) => {
          return element.style.backgroundColor.replace(/['"]+/g, "");
        },
      },
    };
  },
});

const textAlign = TextAlign.configure({
  types: ["heading", "paragraph"],
  alignments: ["left", "center", "right", "justify"],
  defaultAlignment: "left",
});

export const defaultExtensions = [
  starterKit,
  CustomHeading,
  TiptapUnderline,
  GlobalDragHandle,
  tiptapLink,
  tiptapImage,
  updatedImage,
  taskList,
  taskItem,
  horizontalRule,
  aiHighlight,
  customCodeBlock,
  youtube,
  table,
  tableRow,
  tableHeader,
  TipTapExtensionTableCell,
  textAlign,
];
