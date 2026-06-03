"use client";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import { useState, useEffect } from "react";
import { defaultExtensions } from "./extensions";
import { slashCommand, suggestionItems } from "./slash-command";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { Separator } from "./ui/separator";
import { LinkSelector } from "./selectors/link-selector";
import { NodeSelector } from "./selectors/node-selector";
import { TextButtons } from "./selectors/text-buttons";
import { uploadFn } from "./image-upload";
import { ColorSelector } from "./selectors/color-selector";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { TableControls } from "./table-controls";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { useTheme } from "next-themes";
import {
  getHierarchicalIndexes,
  TableOfContents,
} from "@tiptap/extension-table-of-contents";
import { CompactFloatingToC } from "./ToC";
import { useMediaQuery } from "react-responsive";
import { Dialog, DialogContent } from "./ui/dialog";
import { Plus } from "lucide-react";
import { LinkHoverCard } from "./link-hover-card";
const TailwindAdvancedEditor = ({
  initialContent,
  onUpdate,
  editorBubblePlacement,
}: {
  initialContent: any;
  onUpdate: (editor: EditorInstance) => void;
  editorBubblePlacement: Boolean;
}) => {
  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);
  const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(
    null,
  );
  const [items, setItems] = useState<any[]>([]);
  const [dragHandleColor, setDragHandleColor] = useState<string>();
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isMobile = useMediaQuery({ maxWidth: 640 });

  useEffect(() => {
    if (resolvedTheme !== "dark") {
      setDragHandleColor("#B4B4B4");
    } else {
      setDragHandleColor("#646464");
    }
  }, [resolvedTheme]);

  const handleOpenNode = (open: boolean) => {
    if (open) {
      setOpenColor(false);
      setOpenLink(false);
    }
    setOpenNode(open);
  };

  const handleOpenColor = (open: boolean) => {
    if (open) {
      setOpenNode(false);
      setOpenLink(false);
    }
    setOpenColor(open);
  };

  const handleOpenLink = (open: boolean) => {
    if (open) {
      setOpenNode(false);
      setOpenColor(false);
    }
    setOpenLink(open);
  };

  const insertBlockBelowWithSlashMenu = (editor: EditorInstance) => {
    const { $from } = editor.state.selection;

    if ($from.depth < 1) {
      return;
    }
    const insertAt = $from.after(1);

    editor
      .chain()
      .focus()
      .insertContentAt(insertAt, {
        type: "paragraph",
        content: [{ type: "text", text: "/" }],
      })
      .setTextSelection(insertAt + 2)
      .run();
  };

  // Create extensions array with ToC configuration
  const extensions = [
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      onUpdate(content) {
        setItems(content);
      },
    }),
    Placeholder.configure({
      placeholder: "Press '/' for commands, or start writing...",
      showOnlyWhenEditable: true,
      includeChildren: true,
    }),
    ...defaultExtensions,
    slashCommand,
  ];
  return (
    <>
      <EditorRoot>
        <div className="relative">
          {editorInstance && (
            <>
              <LinkHoverCard editor={editorInstance} disabled={openLink} />
              <TableControls editor={editorInstance} />
              <DragHandle editor={editorInstance}>
                <div className="flex items-center justify-center ">
                  <button
                    type="button"
                    aria-label="Insert block below"
                    className="flex h-5 w-5 mt-0.5 items-center justify-center text-muted-foreground rounded-md opacity-50 transition-colors hover:bg-border"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      insertBlockBelowWithSlashMenu(editorInstance);
                    }}
                  >
                    <Plus className="h-4 w-4 " />
                  </button>
                  <div className="flex h-5 w-5 items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="3"
                      className="h-4 w-4 opacity-90"
                      stroke={dragHandleColor}
                    >
                      <path
                        d="
                          M9 6
                          a1.25 1.25 0 1 0 0.01 0
                          M15 6
                          a1.25 1.25 0 1 0 0.01 0
                          M9 12
                          a1.25 1.25 0 1 0 0.01 0
                          M15 12
                          a1.25 1.25 0 1 0 0.01 0
                          M9 18
                          a1.25 1.25 0 1 0 0.01 0
                          M15 18
                          a1.25 1.25 0 1 0 0.01 0
                        "
                      />
                    </svg>
                  </div>
                </div>
              </DragHandle>
            </>
          )}
          <EditorContent
            initialContent={initialContent}
            autofocus={true}
            extensions={extensions}
            className="advanced-editor-shell relative w-full bg-transparent text-foreground placeholder"
            editorProps={{
              handleDOMEvents: {
                keydown: (_view, event) => handleCommandNavigation(event),
              },
              handleClickOn: (view, _pos, node, nodePos, _event, direct) => {
                if (!direct || node.type.name !== "image") {
                  return false;
                }
                const isImageSelected =
                  view.state.selection.from === nodePos &&
                  view.state.selection.to === nodePos + node.nodeSize;

                if (!isImageSelected || !node.attrs.src) {
                  return false;
                }
                setImagePreviewSrc(node.attrs.src);
                return true;
              },
              handlePaste: (view, event) =>
                handleImagePaste(view, event, uploadFn),
              handleDrop: (view, event, _slice, moved) =>
                handleImageDrop(view, event, moved, uploadFn),
              attributes: {
                class:
                  "text-foreground py-6 prose-stone prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none w-full",
              },
            }}
            onUpdate={({ editor }) => {
              onUpdate(editor);
            }}
            onCreate={({ editor }) => {
              setEditorInstance(editor);
            }}
            slotAfter={<ImageResizer />}
          >
            <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-tl-lg border border-border bg-muted px-1 py-1 transition-all scroll-smooth scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <EditorCommandEmpty className="px-2 text-muted-foreground">
                No results
              </EditorCommandEmpty>
              <EditorCommandList>
                {suggestionItems.map((item: any) => (
                  <EditorCommandItem
                    value={item.title}
                    onCommand={(val) => item.command(val)}
                    className="flex w-full items-center space-x-2.5 rounded-tl-lg my-1 px-1 py-1 text-left text-sm text-foreground hover:bg-border aria-selected:bg-border"
                    key={item.title}
                  >
                    <div className="flex h-8 w-8 items-center justify-center border border-border rounded-tl-lg text-muted-foreground">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-medium text-xs text-foreground">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </EditorCommandItem>
                ))}
              </EditorCommandList>
            </EditorCommand>
            <GenerativeMenuSwitch
              editorBubblePlacement={editorBubblePlacement}
              open={openAI}
              onOpenChange={setOpenAI}
            >
              <NodeSelector open={openNode} onOpenChange={handleOpenNode} />
              <Separator orientation="vertical" />
              <LinkSelector open={openLink} onOpenChange={handleOpenLink} />
              <Separator orientation="vertical" />
              <TextButtons />
              <Separator orientation="vertical" />
              <ColorSelector open={openColor} onOpenChange={handleOpenColor} />
            </GenerativeMenuSwitch>
          </EditorContent>
        </div>
      </EditorRoot>
      {/* Compact Floating ToC */}
      {!isMobile && (
        <CompactFloatingToC items={items} editor={editorInstance} />
      )}
      <Dialog
        open={Boolean(imagePreviewSrc)}
        onOpenChange={(open) => {
          if (!open) {
            setImagePreviewSrc(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl border border-border bg-background/96 p-1 shadow-2xl backdrop-blur">
          {imagePreviewSrc && (
            <img
              src={imagePreviewSrc}
              alt="Expanded editor image"
              className="overflow-hidden rounded-none rounded-tl-lg border border-border/70 max-h-[80vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TailwindAdvancedEditor;
