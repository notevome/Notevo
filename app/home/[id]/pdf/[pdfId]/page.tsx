import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import PdfViewerPageClient from "./PdfViewerPageClient";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ pdfId?: string }>;
  searchParams: Promise<{ pdfId?: string | string[] }>;
}): Promise<Metadata> {
  const { pdfId: routeSegment } = await params;
  const { pdfId } = await searchParams;
  const resolvedPdfId =
    typeof pdfId === "string"
      ? pdfId
      : Array.isArray(pdfId)
        ? pdfId[0]
        : routeSegment;

  if (!resolvedPdfId) {
    return generateSEOMetadata({
      title: "PDF - Notevo",
      description: "View PDF uploads in Notevo.",
    });
  }

  try {
    const token = await convexAuthNextjsToken();
    const pdf = await fetchQuery(
      api.pdfs.getPdfById,
      { _id: resolvedPdfId as Id<"pdfs"> },
      { token },
    );

    return generateSEOMetadata({
      title: `${pdf.title || "Untitled PDF"} - Notevo`,
      description: `View ${pdf.title || "this PDF"} in Notevo.`,
    });
  } catch {
    return generateSEOMetadata({
      title: "PDF - Notevo",
      description: "View PDF uploads in Notevo.",
    });
  }
}

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
