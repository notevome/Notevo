"use client";

import TailwindAdvancedEditor from "@/components/advanced-editor";
import NoteLoadingSkeletonUI from "@/components/ui/NoteLoadingSkeletonUI";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useNoteWidth } from "@/hooks/useNoteWidth";
import { cn } from "@/lib/utils";
import type { JSONContent } from "@tiptap/react";
import type { Preloaded } from "convex/react";
import { useMutation, usePreloadedQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export default function NotePageClient({
  noteId,
  preloadedNote,
}: {
  noteId: Id<"notes">;
  preloadedNote: Preloaded<typeof api.notes.getNoteById>;
}) {
  const { noteWidth } = useNoteWidth();
  const getNote = usePreloadedQuery(preloadedNote) as any;

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

  useEffect(() => {
    if (getNote?.body) {
      setContent(JSON.parse(getNote.body));
    }
  }, [getNote]);

  useEffect(() => {
    if (!getNote?.title) return;

    // Store original values
    const originalTitle = document.title;

    // Update document title
    document.title = `${getNote.title} - Notevo`;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    const originalContent = metaDescription?.getAttribute("content");

    // Create better description from note content or title
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

    // Cleanup function
    return () => {
      document.title = originalTitle;
      if (createdMeta && metaDescription) {
        metaDescription.remove();
      } else if (originalContent && metaDescription) {
        metaDescription.setAttribute("content", originalContent);
      }
    };
  }, [getNote?.title, getNote?.body]);

  // `usePreloadedQuery` should make this uncommon, but keep a fallback.
  if (getNote === undefined) {
    return <NoteLoadingSkeletonUI />;
  }

  const parsedContent = getNote?.body ? JSON.parse(getNote.body) : content;

  return (
    <div className={cn(noteWidth === "false" ? "container " : "px-4", "pb-28")}>
      <TailwindAdvancedEditor
        editorBubblePlacement={false}
        initialContent={parsedContent}
        onUpdate={(editor) => {
          const updatedContent = editor.getJSON();
          setContent(updatedContent);
          debouncedUpdateNote(updatedContent);
        }}
      />
    </div>
  );
}

