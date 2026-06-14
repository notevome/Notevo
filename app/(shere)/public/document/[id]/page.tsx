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
  Slash,
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
export default function PublicNotePage() {
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
      return <Sun className="h-[1.2rem] w-[1.2rem]" />;
    return <Moon className="h-[1.2rem] w-[1.2rem]" />;
  };

  const params = useParams();
  const noteid = params.id as Id<"notes">;
  const getNote = useQuery(api.notes.getNoteById, {
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

  useEffect(() => {
    if (!getNote?.title) return;
    const originalTitle = document.title;
    document.title = `${getNote.title} - Notevo`;

    let metaDescription = document.querySelector('meta[name="description"]');
    const originalContent = metaDescription?.getAttribute("content");
    const descriptionText = getNote.body
      ? `${getNote.title}: ${getNote.body.substring(0, 150)}...`
      : `View and edit "${getNote.title}" on Notevo`;

    let createdMeta = false;
    if (metaDescription) {
      metaDescription.setAttribute("content", descriptionText);
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "description";
      newMeta.content = descriptionText;
      document.head.appendChild(newMeta);
      createdMeta = true;
      metaDescription = newMeta;
    }

    return () => {
      document.title = originalTitle;
      if (createdMeta && metaDescription) {
        metaDescription.remove();
      } else if (originalContent && metaDescription) {
        metaDescription.setAttribute("content", originalContent);
      }
    };
  }, [getNote?.title, getNote?.body]);

  if (getNote === undefined) return <NoteLoadingSkeletonUI />;
  if (getNote === null) return <p>Note not found!</p>;

  const PublicNoteTitle = formatUserNoteTitle(
    `${parseSlug(`${getNote.title}`)}`,
  );
  const parsedContent = getNote.body ? JSON.parse(getNote.body) : content;

  return (
    <div
      className="relative w-full flex flex-col h-screen overflow-y-auto [&::-webkit-scrollbar]:w-1.5 scrollbar-thumb-border scrollbar-track-transparent"
      onScroll={(e) => {
        setIsScrolled(e.currentTarget.scrollTop > 0);
      }}
    >
      <div
        aria-hidden
        className="sticky top-0 z-40 pointer-events-none h-0 overflow-visible"
      >
        <div
          className="sticky top-0 z-40 pointer-events-none h-24 bg-gradient-to-b from-background from-20% to-transparent transition-opacity duration-150"
          style={{ opacity: isScrolled ? 1 : 0 }}
        />
      </div>

      <header className=" sticky top-0 left-0 w-full z-[10000]">
        <div className=" px-2 py-2.5 flex justify-between items-center bg-gradient-to-b from-background from-20% to-transparent w-full">
          <ReadOnlyWarning />
          <p className=" flex flex-col justify-center items-start text-md text-foreground w-full px-1.5 mt-1.5 h-8">
            {PublicNoteTitle}
            <span className="px-0.5 pt-0.5 text-[10px] leading-4 text-nowrap text-muted-foreground ">
              Created {formatNoteTimestamp(getNote.createdAt)} - Last updated{" "}
              {formatNoteTimestamp(getNote.updatedAt)}
            </span>
          </p>
          <div className="flex justify-end items-center gap-0 w-full">
            {!isMobile && (
              <>
                <Tooltip open={noteWidthTooltip.open}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-8 h-8 pt-0.5"
                      size="icon"
                      onClick={toggleWidth}
                      aria-label="toggle-note-width"
                      {...noteWidthTooltip.triggerProps}
                    >
                      {noteWidth === "false" ? (
                        <>
                          <ChevronsLeftRightEllipsis className="h-[1.4rem] w-[1.4rem]" />
                        </>
                      ) : (
                        <>
                          <ChevronsRightLeft className="h-[1.4rem] w-[1.4rem]" />
                        </>
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
                  className=" !rounded-none"
                  noteBody={JSON.stringify(content)}
                  noteTitle={getNote.title ?? "note"}
                />
              </>
            )}

            <Tooltip open={themeTooltip.open}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-8 h-8 pt-0.5 !rounded-none"
                  size="icon"
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
              variant="outline"
              className="text-sm px-1.5 py-1.5 h-8 bg-secondary/70 hover:bg-secondary !rounded-none"
            >
              <Link
                href="https://notevo.me/"
                target="_blank"
                className="flex justify-between items-center gap-2 group"
              >
                Get Notevo
              </Link>
            </Button>
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
              placeholder="Untitled Note"
              autoFocus={true}
              rows={1}
              style={{ resize: "none", overflow: "hidden" }}
              className="px-0.5 py-6 my-0 field-sizing-content min-h-0 min-w-0 w-full max-w-full max-h-fit whitespace-pre-wrap [overflow-wrap:anywhere] text-2xl md:!text-5xl font-bold placeholder:text-muted-foreground/50 !rounded-none focus:shadow-none shadow-none focus-visible:outline-none border-0 border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <TailwindAdvancedEditor
          editorBubblePlacement={true}
          initialContent={parsedContent}
          onUpdate={(editor) => {
            setContent(editor.getJSON());
          }}
        />
      </MaxWContainer>
    </div>
  );
}
