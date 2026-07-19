"use client";

import TailwindAdvancedEditor from "@/components/advanced-editor";
import NoteLoadingSkeletonUI from "@/components/ui/NoteLoadingSkeletonUI";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "@/cache/useQuery";
import { useNoteWidth } from "@/hooks/useNoteWidth";
import { cn } from "@/lib/utils";
import type { JSONContent } from "@tiptap/react";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import z from "zod";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { generateSlug } from "@/lib/generateSlug";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
const noteMemoryCache = new Map<string, unknown>();

const noteTitleSchema = z
  .string()
  .min(1, "Title cannot be empty")
  .max(60, "Title must be 60 characters or less");

export default function NotePageClient({
  noteId,
  renderedInPane = false,
}: {
  noteId: Id<"notes">;
  renderedInPane?: boolean;
}) {
  const { noteWidth } = useNoteWidth();
  const note = useQuery(api.notes.getNoteById, { _id: noteId });
  const [lastNote, setLastNote] = useState<typeof note>(() => {
    return noteMemoryCache.get(noteId as unknown as string) as typeof note;
  });

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    setLastNote(
      noteMemoryCache.get(noteId as unknown as string) as typeof note,
    );
    setContent(undefined);
  }, [noteId]);

  useEffect(() => {
    if (note === undefined) return;
    noteMemoryCache.set(noteId as unknown as string, note);
    setLastNote(note);
  }, [note, noteId]);

  const stableNote = note ?? lastNote;

  const updateNote = useMutation(api.notes.updateNote).withOptimisticUpdate(
    (local, args) => {
      const { _id, body } = args;
      const note = local.getQuery(api.notes.getNoteById, { _id });
      if (note) {
        local.setQuery(
          api.notes.getNoteById,
          { _id },
          {
            ...note,
            body: body ?? note.body,
            updatedAt: Date.now(),
          },
        );
      }
    },
  );

  const [content, setContent] = useState<JSONContent>();
  const [editedTitle, setEditedTitle] = useState(stableNote?.title || "");

  useEffect(() => {
    if (stableNote?.title && !editedTitle) {
      setEditedTitle(stableNote.title);
    }
  }, [stableNote?.title]);

  useEffect(() => {
    if (titleElRef.current) syncHeight(titleElRef.current);
  }, [noteId, editedTitle]);

  const syncHeight = (el: HTMLTextAreaElement) => {
    el.style.minHeight = "0";
    el.style.height = "0";
    el.style.height = `${el.scrollHeight}px`;
  };

  const titleElRef = useRef<HTMLTextAreaElement | null>(null);
  const setTitleRef = useCallback((el: HTMLTextAreaElement | null) => {
    titleElRef.current = el;
    if (!el) return;
    syncHeight(el);
    el.addEventListener("input", () => syncHeight(el));
  }, []);

  const debouncedUpdateNote = useDebouncedCallback(
    (updatedContent: JSONContent) => {
      updateNote({
        _id: noteId,
        body: JSON.stringify(updatedContent),
      });
    },
    500,
  );

  const debouncedUpdateNoteTitle = useDebouncedCallback(
    (trimmedTitle: string) => {
      const currentTitle = stableNote?.title || "";
      const result = noteTitleSchema.safeParse(trimmedTitle);

      if (!result.success) {
        const issue = result.error.issues[0];
        if (issue.code === "too_small") {
          setEditedTitle("");
          toast({
            title: "Naming failed",
            description: "Title must not be empty.",
            variant: "destructive",
          });
        } else if (issue.code === "too_big") {
          setEditedTitle(stableNote?.title || "");
          toast({
            title: "Naming failed",
            description: "Title must be 60 characters or less",
            variant: "destructive",
          });
        }

        return;
      }
      const currentUrl = new URL(window.location.href);
      const nextSlug = generateSlug(trimmedTitle);

      if (renderedInPane) {
        currentUrl.searchParams.set("paneTitle", nextSlug);
      } else {
        const segments = currentUrl.pathname.split("/");
        segments[3] = nextSlug;
        currentUrl.pathname = segments.join("/");
      }

      window.history.replaceState({}, "", currentUrl.href);

      if (trimmedTitle !== currentTitle) {
        try {
          updateNote({ _id: noteId, title: trimmedTitle });
        } catch (error) {
          console.error("Error updating note title:", error);
          setEditedTitle(currentTitle);
        }
      }
    },
    100,
  );

  const serverContent = useMemo(() => {
    if (!stableNote?.body) return undefined;
    try {
      return JSON.parse(stableNote.body) as JSONContent;
    } catch {
      return undefined;
    }
  }, [stableNote?.body]);

  useEffect(() => {
    if (content !== undefined) return;
    if (serverContent !== undefined) setContent(serverContent);
  }, [content, serverContent]);

  useEffect(() => {
    if (!stableNote?.title) return;

    const originalTitle = document.title;
    document.title = `${stableNote.title} - Notevo`;

    let metaDescription = document.querySelector('meta[name="description"]');
    const originalContent = metaDescription?.getAttribute("content");

    const descriptionText = stableNote.body
      ? `${stableNote.title}: ${stableNote.body.substring(0, 150)}...`
      : `View and edit "${stableNote.title}" on Notevo`;

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
  }, [stableNote?.title, stableNote?.body]);

  if (stableNote === undefined) {
    return <NoteLoadingSkeletonUI />;
  }

  return (
    <div
      className={cn(
        noteWidth === "false" ? "Desktop:w-[900px] w-full px-4" : "px-6",
        "pb-28 mx-auto",
      )}
    >
      <div className="advanced-editor-shell relative w-full bg-transparent text-foreground placeholder overflow-hidden">
        <div className="tiptap ProseMirror text-foreground pt-6 prose-stone prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none w-full">
          <Textarea
            ref={setTitleRef}
            value={editedTitle}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setEditedTitle(e.target.value);
              debouncedUpdateNoteTitle(e.target.value.trim());
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
            rows={1}
            style={{ resize: "none", overflow: "hidden", width: "100%" }}
            className="px-0 py-2 my-0 mx-0 field-sizing-content !min-h-0 min-w-0 w-full max-w-full [white-space:pre-wrap] [overflow-wrap:break-word] [word-break:break-word] text-2xl md:!text-5xl font-bold placeholder:text-muted-foreground/50 !rounded-none focus:shadow-none shadow-none focus-visible:outline-none border-0 border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>
      <TailwindAdvancedEditor
        renderedInPane
        editorBubblePlacement={false}
        initialContent={content ?? serverContent}
        onUpdate={(editor) => {
          const updatedContent = editor.getJSON();
          setContent(updatedContent);
          debouncedUpdateNote(updatedContent);
        }}
      />
    </div>
  );
}
