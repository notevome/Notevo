"use client";

import { useEffect } from "react";
import type { JSONContent } from "@tiptap/react";
import { usePathname, useRouter } from "next/navigation";
import TailwindAdvancedEditor from "@/components/advanced-editor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNoteWidth } from "@/hooks/useNoteWidth";
import { buildItemSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";
import {
  usePendingNoteDraft,
  usePendingNoteDraftContext,
} from "@/components/home-components/PendingNoteDraftProvider";

export default function PendingNoteDraftPageClient({
  token,
}: {
  token: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { noteWidth } = useNoteWidth();
  const draft = usePendingNoteDraft(token);
  const { isHydrated, updateDraft, retryDraft } = usePendingNoteDraftContext();

  useEffect(() => {
    if (
      draft?.phase !== "ready" ||
      !draft.noteId ||
      pathname !== `/home/${draft.workingSpaceId}/draft-${token}`
    ) {
      return;
    }
    router.replace(
      `/home/${draft.workingSpaceId}/${buildItemSlug(draft.title, draft.noteId)}`,
    );
  }, [draft, pathname, router, token]);

  if (!draft && !isHydrated) {
    return null;
  }

  if (!draft) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12 text-sm text-muted-foreground">
        This draft is no longer available. Go back and create a new note.
      </div>
    );
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
            value={draft.title}
            onChange={(event) =>
              updateDraft(token, { title: event.target.value })
            }
            maxLength={60}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                document
                  .querySelector<HTMLElement>(
                    ".tiptap.ProseMirror[contenteditable='true']",
                  )
                  ?.focus();
              }
            }}
            aria-label="note title"
            placeholder="Untitled Note"
            rows={1}
            style={{ resize: "none", overflow: "hidden", width: "100%" }}
            className="px-0 py-2 my-0 mx-0 field-sizing-content !min-h-0 min-w-0 w-full max-w-full [white-space:pre-wrap] [overflow-wrap:break-word] [word-break:break-word] !text-4xl md:!text-5xl !leading-tight font-bold placeholder:text-muted-foreground/50 !app-radius-none focus:shadow-none shadow-none focus-visible:outline-none border-0 border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>
      <TailwindAdvancedEditor
        editorBubblePlacement={false}
        initialContent={draft.content as JSONContent | undefined}
        workingSpaceId={draft.workingSpaceId}
        onUpdate={(editor) => updateDraft(token, { content: editor.getJSON() })}
      />
      {draft.phase === "error" ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-3 text-sm text-destructive"
        >
          <span>{draft.error || "Could not save this note."}</span>
          <Button size="sm" variant="outline" onClick={() => retryDraft(token)}>
            Retry save
          </Button>
        </div>
      ) : null}
    </div>
  );
}
