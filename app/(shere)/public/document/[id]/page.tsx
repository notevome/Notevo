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
import { Moon, Sun, Slash } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { parseSlug } from "@/lib/parseSlug";
import { formatUserNoteTitle } from "@/lib/utils";
import { ReadOnlyWarning } from "@/components/readOnly-warning";
import NoteDownloadDropdown from "@/components/home-components/NoteDownloadDropdown";

export default function PublicNotePage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);

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

  useEffect(() => {
    if (getNote?.body) {
      setContent(JSON.parse(getNote.body));
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
      className="relative w-full flex flex-col h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
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
        <div className=" px-4 p-3 flex justify-between items-center bg-gradient-to-b from-background from-20% to-transparent w-full">
          <ReadOnlyWarning />
          <p className="text-sm text-foreground w-full px-1.5 py-1.5 h-8">
            {PublicNoteTitle}
          </p>
          <div className="flex justify-end items-center gap-1 w-full">
            <NoteDownloadDropdown
              noteBody={JSON.stringify(content)}
              noteTitle={getNote.title ?? "note"}
            />
            <TooltipProvider delayDuration={200} disableHoverableContent>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-8 h-8 mt-0.5"
                    size="icon"
                    onClick={cycleTheme}
                  >
                    {getThemeIcon()}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Toggle theme</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="secondary" className="text-sm px-1.5 py-1.5 h-8">
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

      <MaxWContainer className="Desktop:container Desktop:mx-auto flex-1">
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
