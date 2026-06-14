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
import { useState, useEffect, useRef } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [plusMenuPos, setPlusMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [plusMenuInsertAt, setPlusMenuInsertAt] = useState<number | null>(null);
  const [plusSearchQuery, setPlusSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { resolvedTheme } = useTheme();
  const isMobile = useMediaQuery({ maxWidth: 640 });

  useEffect(() => {
    if (resolvedTheme !== "dark") {
      setDragHandleColor("#B4B4B4");
    } else {
      setDragHandleColor("#646464");
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (!plusMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        plusMenuRef.current &&
        !plusMenuRef.current.contains(e.target as Node)
      ) {
        setPlusMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlusMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [plusMenuOpen]);

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

  const openPlusMenu = (editor: EditorInstance, buttonEl: HTMLElement) => {
    const dragHandleEl =
      buttonEl.closest("[data-drag-handle]")?.parentElement ??
      buttonEl.closest(".novel-drag-handle")?.parentElement ??
      buttonEl.parentElement?.parentElement;

    const rect = buttonEl.getBoundingClientRect();
    const editorView = (editor as any).view;

    const posAtCoords = editorView.posAtCoords({
      left: rect.right + 30,
      top: rect.top + rect.height / 2,
    });

    let insertAt: number | null = null;
    if (posAtCoords) {
      const $pos = editor.state.doc.resolve(posAtCoords.pos);
      const depth = $pos.depth >= 1 ? 1 : $pos.depth;
      const nodeStart = $pos.before(depth);
      const node = editor.state.doc.nodeAt(nodeStart);
      if (node) {
        insertAt = nodeStart + node.nodeSize;
      } else {
        insertAt = $pos.after(depth);
      }
    }

    setPlusMenuInsertAt(insertAt);
    setPlusMenuPos({ x: rect.left, y: rect.bottom + 4 });
    setPlusSearchQuery("");
    setSelectedIndex(0);
    setPlusMenuOpen(true);
  };

  const executePlusMenuItem = (editor: EditorInstance, item: any) => {
    if (plusMenuInsertAt === null) return;
    setPlusMenuOpen(false);

    editor
      .chain()
      .focus()
      .insertContentAt(plusMenuInsertAt, { type: "paragraph" })
      .setTextSelection(plusMenuInsertAt + 1)
      .run();

    const from = plusMenuInsertAt + 1;
    const to = plusMenuInsertAt + 1;
    item.command({ editor, range: { from, to } });
  };

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
                  <Tooltip delayDuration={150} disableHoverableContent>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Insert block below"
                        className="flex h-5 w-5 mt-0.5 items-center justify-center text-muted-foreground rounded-none opacity-50 transition-colors hover:bg-border"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openPlusMenu(
                            editorInstance,
                            event.currentTarget as HTMLElement,
                          );
                        }}
                      >
                        <Plus className="h-4 w-4 " />
                      </button>
                    </TooltipTrigger>

                    <TooltipContent
                      side="left"
                      align="center"
                      className=" text-xs font-bold py-0.5 px-1.5 !rounded-none "
                    >
                      <p> Click to insert block below </p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={150} disableHoverableContent>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      align="center"
                      className=" text-xs font-bold py-0.5 px-1.5 !rounded-none "
                    >
                      <p>Drag</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </DragHandle>
            </>
          )}
          <EditorContent
            initialContent={initialContent}
            extensions={extensions}
            autofocus={true}
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
            <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-tl-lg border border-border bg-muted px-1 py-1 transition-all scroll-smooth [&::-webkit-scrollbar]:w-1.5 scrollbar-thumb-border scrollbar-track-transparent">
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

      {/* Plus button block-insert dropdown */}
      {plusMenuOpen && editorInstance && (
        <div
          ref={plusMenuRef}
          style={{
            position: "fixed",
            left: plusMenuPos.x,
            top: plusMenuPos.y,
            zIndex: 9999,
          }}
          className=" relative w-64 max-h-[330px] overflow-y-auto rounded-tl-lg border border-border bg-muted px-1 py-1 shadow-lg scroll-smooth [&::-webkit-scrollbar]:w-1.5 scrollbar-thumb-border scrollbar-track-transparent"
        >
          <input
            autoFocus
            type="text"
            placeholder="Search..."
            value={plusSearchQuery}
            onChange={(e) => {
              setPlusSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              const filtered = suggestionItems.filter(
                (item: any) =>
                  item.title
                    .toLowerCase()
                    .includes(plusSearchQuery.toLowerCase()) ||
                  (item.searchTerms ?? []).some((t: string) =>
                    t.includes(plusSearchQuery.toLowerCase()),
                  ),
              );
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[selectedIndex])
                  executePlusMenuItem(editorInstance, filtered[selectedIndex]);
              }
            }}
            className=" sticky -top-1.5 left-0 w-full px-2 py-1 m-0 text-xs bg-muted border-b border-border rounded-tl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
          />
          {(() => {
            const filtered = suggestionItems.filter(
              (item: any) =>
                item.title
                  .toLowerCase()
                  .includes(plusSearchQuery.toLowerCase()) ||
                (item.searchTerms ?? []).some((t: string) =>
                  t.includes(plusSearchQuery.toLowerCase()),
                ),
            );
            if (filtered.length === 0) {
              return (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  No results
                </p>
              );
            }
            return filtered.map((item: any, idx: number) => (
              <button
                key={item.title}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executePlusMenuItem(editorInstance, item);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-center space-x-2.5 rounded-tl-lg my-0.5 px-1 py-1 text-left text-sm text-foreground transition-colors ${
                  idx === selectedIndex ? "bg-border" : "hover:bg-border"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border rounded-tl-lg text-muted-foreground">
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
              </button>
            ));
          })()}
        </div>
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
