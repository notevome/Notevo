import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  Text,
  TextQuote,
  Youtube,
  Table,
  ToggleLeft,
} from "lucide-react";
import { createSuggestionItems } from "novel";
import { Command, renderItems } from "novel";
import { uploadFn } from "./image-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { z } from "zod";

const youtubeUrlSchema = z
  .string()
  .refine(
    (url) =>
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[-\w]{11}/.test(
        url,
      ),
    { message: "Please enter a valid YouTube URL." },
  );

function YoutubeDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = (value: string): boolean => {
    const result = youtubeUrlSchema.safeParse(value);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    if (validate(url)) {
      onConfirm(url);
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className=" px-4 pt-4 pb-2.5">
        <DialogHeader>
          <DialogTitle>Embed YouTube Video</DialogTitle>
          <DialogDescription>
            Paste a YouTube URL to embed it in the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) validate(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className={` h-8
             ${error ? "border-destructive focus-visible:ring-destructive" : ""} 
            `}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose} className="h-8">
            Cancel
          </Button>
          <Button
            disabled={!youtubeUrlSchema.safeParse(url).success}
            onClick={handleSubmit}
            className=" h-8 !rounded-none before:!rounded-none before:inset-[-2px]"
          >
            Embed
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function openYoutubeDialog(onConfirm: (url: string) => void) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    root.unmount();
    container.remove();
  };

  root.render(<YoutubeDialog onConfirm={onConfirm} onClose={cleanup} />);
}
export const suggestionItems = createSuggestionItems([
  {
    title: "Text",
    description: "Plain text.",
    searchTerms: ["p", "paragraph"],
    icon: <Text size={18} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode("paragraph", "paragraph")
        .run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with a to-do list.",
    searchTerms: ["todo", "task", "list", "check", "checkbox"],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Heading 1",
    description: "Big section heading.",
    searchTerms: ["title", "big", "large"],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading.",
    searchTerms: ["subtitle", "medium"],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading.",
    searchTerms: ["subtitle", "small"],
    icon: <Heading3 size={18} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list.",
    searchTerms: ["unordered", "point"],
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a list with numbering.",
    searchTerms: ["ordered"],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote.",
    searchTerms: ["blockquote"],
    icon: <TextQuote size={18} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode("paragraph", "paragraph")
        .toggleBlockquote()
        .run(),
  },
  {
    title: "Code",
    description: "Capture a code snippet.",
    searchTerms: ["codeblock"],
    icon: <Code size={18} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Image",
    description: "Upload an image.",
    searchTerms: ["photo", "picture", "media"],
    icon: <ImageIcon size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // upload image
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        if (input.files?.length) {
          const file = input.files[0];
          const pos = editor.view.state.selection.from;
          uploadFn(file, editor.view, pos);
        }
      };
      input.click();
    },
  },
  {
    title: "Toggle Action",
    description: "Create a collapsible action block.",
    searchTerms: ["toggle", "collapse", "accordion", "action", "atomic"],
    icon: <ToggleLeft size={18} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "toggleAction",
          attrs: {
            title: "toggle action",
            open: true,
          },
          content: [
            {
              type: "paragraph",
            },
          ],
        })
        .run();
    },
  },
  {
    title: "YouTube",
    description: "Embed a YouTube video",
    searchTerms: ["youtube", "video", "embed"],
    icon: <Youtube className="w-5 h-5" />,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).run();
      openYoutubeDialog((url) => {
        editor.chain().focus().setYoutubeVideo({ src: url }).run();
      });
    },
  },
  {
    title: "Table",
    description: "Insert a 3 × 3 table",
    searchTerms: ["table", "grid", "spreadsheet"],
    icon: <Table size={18} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
]);
export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});
