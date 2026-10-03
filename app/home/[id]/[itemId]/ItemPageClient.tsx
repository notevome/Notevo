"use client";

import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { extractIdFromSlug } from "@/lib/slug";
import NotePageClient from "./NotePageClient";
import WhiteboardPageClient from "./WhiteboardPageClient";
import PdfViewerPageClient from "./PdfViewerPageClient";
import PendingNoteDraftPageClient from "./PendingNoteDraftPageClient";

interface ItemPageClientProps {
  rawItemId: string;
}

export default function ItemPageClient({ rawItemId }: ItemPageClientProps) {
  const draftToken = rawItemId.startsWith("draft-")
    ? rawItemId.slice("draft-".length)
    : null;
  const resolvedId = extractIdFromSlug(rawItemId) || rawItemId;
  const itemType = useQuery(
    api.notes.getItemType,
    draftToken ? "skip" : { id: resolvedId },
  );

  if (draftToken) {
    return <PendingNoteDraftPageClient token={draftToken} />;
  }

  if (itemType === undefined) {
    return <div className="h-full min-h-[60vh] w-full animate-pulse bg-card" />;
  }

  if (itemType === "whiteboard") {
    return (
      <WhiteboardPageClient whiteboardId={resolvedId as Id<"whiteboards">} />
    );
  }

  if (itemType === "pdf") {
    return <PdfViewerPageClient pdfId={resolvedId as Id<"pdfs">} />;
  }

  return <NotePageClient noteId={resolvedId as Id<"notes">} />;
}
