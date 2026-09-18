import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  extractTextFromTiptap,
  truncateText,
} from "@/lib/parse-tiptap-content";
import { renderOGCard } from "@/lib/og-card-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const alt = "Notevo Document Preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function Image({ params }: Props) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  let title = "Untitled note.";
  let preview =
    "No Description. This is a shared note on Notevo. View and read this note on Notevo.";

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
          title = note.title.trim();
        }

        if (note.preview && note.preview.trim()) {
          preview = note.preview.slice(0, 120).trim() + "...";
        }
      }
    }
  } catch (error) {
    console.error("Error generating OG image for public note:", error);
  }

  return new ImageResponse(renderOGCard({ title, preview }), {
    ...size,
  });
}
