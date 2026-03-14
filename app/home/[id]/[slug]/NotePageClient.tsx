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
import { useEffect, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

const noteMemoryCache = new Map<string, unknown>();

export default function NotePageClient({
  noteId,
}: {
  noteId: Id<"notes">;
}) {
  const { noteWidth } = useNoteWidth();
  const note = useQuery(api.notes.getNoteById, { _id: noteId });
  const [lastNote, setLastNote] = useState<typeof note>(() => {
    return noteMemoryCache.get(noteId as unknown as string) as typeof note;
  });

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

      // Update single note query (for the current note being edited)
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

  const debouncedUpdateNote = useDebouncedCallback(
    (updatedContent: JSONContent) => {
      updateNote({
        _id: noteId,
        body: JSON.stringify(updatedContent),
      });
    },
    500,
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

    // Store original values
    const originalTitle = document.title;

    // Update document title
    document.title = `${stableNote.title} - Notevo`;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    const originalContent = metaDescription?.getAttribute("content");

    // Create better description from note content or title
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

    // Cleanup function
    return () => {
      document.title = originalTitle;
      if (createdMeta && metaDescription) {
        metaDescription.remove();
      } else if (originalContent && metaDescription) {
        metaDescription.setAttribute("content", originalContent);
      }
    };
  }, [stableNote?.title, stableNote?.body]);

  // Show loading only when we have no cached value to show.
  if (stableNote === undefined) {
    return <NoteLoadingSkeletonUI />;
  }

  return (
    <div className={cn(noteWidth === "false" ? "container " : "px-4", "pb-28")}>
      <TailwindAdvancedEditor
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
