import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    let title = searchParams.get("title") || "Untitled note.";
    let preview =
      searchParams.get("description") ||
      "No Description. This is a shared note on Notevo. View and read this note on Notevo";

    // Fetch live note from Convex database
    if (id) {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (convexUrl) {
        try {
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
              preview = note.preview.slice(0, 70).trim() + "...";
            }
          }
        } catch (err) {
          console.error("Failed to query Convex for OG route:", err);
        }
      }
    }

    return new ImageResponse(renderOGCard({ title, preview }), {
      width: 1200,
      height: 630,
    });
  } catch (e: any) {
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}
