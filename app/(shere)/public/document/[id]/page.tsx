import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  extractTextFromTiptap,
  truncateText,
} from "@/lib/parse-tiptap-content";
import PublicDocumentView from "./PublicDocumentView";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams?.id;
  const siteUrl = process.env.SITE_URL || "https://notevo.me";

  let title = "Document - Notevo";
  let description = "View and read this shared note on Notevo.";

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl && id) {
      const convex = new ConvexHttpClient(convexUrl);
      const note = await convex.query(api.notes.getNoteById, {
        _id: id as Id<"notes">,
        isPublish: true,
      });

      if (note) {
        if (note.title && note.title.trim()) {
          title = `${note.title.trim()} - Notevo`;
        }
        if (note.preview && note.preview.trim()) {
          description = note.preview.slice(0, 70).trim() + "...";
        }
      }
    }
  } catch (error) {
    console.error("Error generating metadata in page.tsx:", error);
  }

  const documentUrl = `/public/document/${id}`;
  const ogImageUrl = `/api/og?id=${id}`;

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: documentUrl,
    },
    openGraph: {
      title,
      description,
      url: documentUrl,
      siteName: "Notevo",
      type: "article",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function PublicNotePage() {
  return <PublicDocumentView />;
}
