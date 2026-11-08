"use client";
import MaxWContainer from "@/components/ui/MaxWContainer";
import { api } from "@/convex/_generated/api";
import { useQuery } from "@/cache/useQuery";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { JSONContent } from "@tiptap/react";
import TailwindAdvancedEditor from "@/components/advanced-editor";
import type { Id } from "@/convex/_generated/dataModel";
import NoteLoadingSkeletonUI from "@/components/ui/NoteLoadingSkeletonUI";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  Moon,
  Sun,
  ChevronsLeftRightEllipsis,
  ChevronsRightLeft,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { parseSlug } from "@/lib/parseSlug";
import { cn, formatNoteTimestamp, formatUserNoteTitle } from "@/lib/utils";
import { ReadOnlyWarning } from "@/components/readOnly-warning";
import NoteDownloadDropdown from "@/components/home-components/NoteDownloadDropdown";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { useNoteWidth } from "@/hooks/useNoteWidth";
import { useMediaQuery } from "react-responsive";
import { Textarea } from "@/components/ui/textarea";

export default function PublicDocumentView() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const themeTooltip = useHoverTooltip(100);
  const noteWidthTooltip = useHoverTooltip(100);
  const { noteWidth, toggleWidth } = useNoteWidth();
  const isMobile = useMediaQuery({ maxWidth: 640 });

  const cycleTheme = () => {
    if (resolvedTheme === "light") setTheme("dark");
    else setTheme("light");
  };

  const getThemeIcon = () => {
    if (resolvedTheme === "light")
      return <Sun className="h-4 w-4" />;
    return <Moon className="h-4 w-4" />;
  };

  const params = useParams();
  const noteid = params.id as Id<"documents">;
  const getNote = useQuery(api.documents.getNoteById, {
    _id: noteid,
    isPublish: true,
  });

  const [content, setContent] = useState<JSONContent | undefined>(undefined);
  const [editedTitle, setEditedTitle] = useState(getNote?.title || "");

  useEffect(() => {
    if (getNote?.body) {
      setContent(JSON.parse(getNote.body));
    }
    if (getNote?.title) {
      setEditedTitle(getNote.title);
    }
  }, [getNote]);

  if (getNote === undefined) return <NoteLoadingSkeletonUI />;
  if (getNote === null) return <p>Document not found!</p>;

  const PublicNoteTitle = formatUserNoteTitle(
    `${parseSlug(`${getNote.title}`)}`,
  );
  const parsedContent = getNote.body ? JSON.parse(getNote.body) : content;

  return (
    <div
      className="relative w-full flex flex-col h-screen overflow-y-auto scrollbar-gutter-stable [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
      onScroll={(e) => {
        setIsScrolled(e.currentTarget.scrollTop > 0);
      }}
    >
      <ReadOnlyWarning />

      <div
        aria-hidden
        className="sticky top-0 z-20 pointer-events-none h-0 overflow-visible"
      >
        <div
          className="sticky top-0 pointer-events-none h-[4rem] bg-gradient-to-b from-background from-0% via-background/65 via-45% to-100% to-transparent transition-opacity duration-150"
          style={{ opacity: isScrolled ? 1 : 0 }}
        />
      </div>

      <header className=" sticky top-0 left-0 w-full z-30">
        <div className=" px-2 py-2.5 flex justify-between items-center bg-gradient-to-b from-background from-20% to-transparent w-full">
          <p className=" flex flex-col justify-center items-start text-md text-foreground min-w-0 flex-1 px-1.5 mt-1.5 h-8">
            <span className="truncate w-full">{PublicNoteTitle}</span>
            <span className="px-0.5 pt-0.5 text-[10px] leading-4 text-nowrap text-muted-foreground truncate w-full">
              Created {formatNoteTimestamp(getNote.createdAt)} - Last updated{" "}
              {formatNoteTimestamp(getNote.updatedAt)}
            </span>
          </p>
          <div className="flex items-center w-auto justify-end shrink-0">
            <div className="flex h-9 items-center border border-border app-radius-lg overflow-hidden">
              {!isMobile && (
                <>
                  <Tooltip open={noteWidthTooltip.open}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="SidebarMenuButton"
                        size="sm"
                        className="h-9 px-3 justify-center app-radius-l-lg bg-background hover:bg-muted"
                        onClick={toggleWidth}
                        aria-label="toggle-note-width"
                        {...noteWidthTooltip.triggerProps}
                      >
                        {noteWidth === "false" ? (
                          <ChevronsLeftRightEllipsis className="h-4 w-4" />
                        ) : (
                          <ChevronsRightLeft className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      align="end"
                      side="bottom"
                      className=" text-xs py-0.5 px-1.5"
                    >
                      {noteWidth === "false" ? <>Full width</> : <>Max width</>}
                    </TooltipContent>
                  </Tooltip>
                  <NoteDownloadDropdown
                    variant="SidebarMenuButton"
                    size="sm"
                    className="h-9 px-3 justify-center border-l border-border app-radius-none bg-background hover:bg-muted"
                    noteBody={JSON.stringify(content)}
                    noteTitle={getNote.title ?? "note"}
                  />
                </>
              )}

              <Tooltip open={themeTooltip.open}>
                <TooltipTrigger asChild>
                  <Button
                    variant="SidebarMenuButton"
                    size="sm"
                    className={cn(
                      "h-9 px-3 justify-center bg-background hover:bg-muted app-radius-none",
                      isMobile && "app-radius-l-lg",
                      !isMobile && "border-l border-border",
                    )}
                    onClick={cycleTheme}
                    {...themeTooltip.triggerProps}
                  >
                    {getThemeIcon()}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  align="end"
                  side="bottom"
                  className=" text-xs py-0.5 px-1.5"
                >
                  Toggle theme
                </TooltipContent>
              </Tooltip>

              <Button
                variant="SidebarMenuButton"
                size="sm"
                className="h-9 px-2.5 justify-center app-radius-r-lg border-l border-border bg-secondary/70 hover:bg-secondary text-sm"
                asChild
              >
                <Link
                  href="https://oraizive.com/"
                  target="_blank"
                >
                  Get oraizive
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <MaxWContainer
        className={cn(
          noteWidth === "false" ? " Desktop:w-[900px] w-full px-4" : "px-6",
          " pb-28 mx-auto",
        )}
      >
        <div className="advanced-editor-shell relative w-full bg-transparent text-foreground placeholder">
          <div className="tiptap ProseMirror text-foreground pt-6 prose-stone prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none w-full">
            <Textarea
              value={editedTitle}
              onChange={(e: any) => {
                setEditedTitle(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const editor = document.querySelector<HTMLElement>(
                    ".tiptap.ProseMirror.py-6",
                  );
                  editor?.focus();
                }
              }}
              aria-label="note title"
              placeholder="Untitled Document"
              autoFocus={true}
              rows={1}
              style={{ resize: "none", overflow: "hidden" }}
              className="px-0.5 py-6 my-0 field-sizing-content min-h-0 min-w-0 w-full max-w-full max-h-fit whitespace-pre-wrap [overflow-wrap:anywhere] text-2xl md:!text-5xl font-bold placeholder:text-muted-foreground/50 !app-radius-none focus:shadow-none shadow-none focus-visible:outline-none border-0 border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <TailwindAdvancedEditor
          editorBubblePlacement={true}
          initialContent={parsedContent}
          disableWikiLinks
          onUpdate={(editor) => {
            setContent(editor.getJSON());
          }}
        />
      </MaxWContainer>
    </div>
  );
}
