import { redirect } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import PdfViewerPageClient from "./PdfViewerPageClient";

export default async function PdfViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ pdfId?: string }>;
  searchParams: Promise<{ pdfId?: string | string[] }>;
}) {
  const { pdfId: routeSegment } = await params;
  const { pdfId } = await searchParams;
  const resolvedPdfId =
    typeof pdfId === "string" ? pdfId : Array.isArray(pdfId) ? pdfId[0] : routeSegment;

  if (!resolvedPdfId) {
    redirect("/");
  }

  return <PdfViewerPageClient pdfId={resolvedPdfId as Id<"pdfs">} />;
}
