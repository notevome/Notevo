import { redirect } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import NotePageClient from "./NotePageClient";
import PdfViewerPageClient from "./PdfViewerPageClient";
import WhiteboardPageClient from "./WhiteboardPageClient";

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id?: string; itemId?: string }>;
  searchParams: Promise<{
    id?: string | string[];
    pdfId?: string | string[];
    whiteboardId?: string | string[];
  }>;
}) {
  const { itemId: routeSegment } = await params;
  const { id, pdfId, whiteboardId } = await searchParams;

  const resolvedPdfId =
    typeof pdfId === "string"
      ? pdfId
      : Array.isArray(pdfId)
        ? pdfId[0]
        : null;
  if (resolvedPdfId) {
    return <PdfViewerPageClient pdfId={resolvedPdfId as Id<"pdfs">} />;
  }

  const resolvedWhiteboardId =
    typeof whiteboardId === "string"
      ? whiteboardId
      : Array.isArray(whiteboardId)
        ? whiteboardId[0]
        : null;
  if (resolvedWhiteboardId) {
    return (
      <WhiteboardPageClient whiteboardId={resolvedWhiteboardId as Id<"whiteboards">} />
    );
  }

  const resolvedNoteId =
    typeof id === "string"
      ? id
      : Array.isArray(id)
        ? id[0]
        : routeSegment;

  if (!resolvedNoteId) {
    redirect("/");
  }

  return <NotePageClient noteId={resolvedNoteId as Id<"notes">} />;
}
