import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import NotePageClient from "./NotePageClient";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { notFound, redirect } from "next/navigation";

function getSearchParam(
  searchParams: unknown,
  key: string,
): string | undefined {
  const sp: any = searchParams as any;
  if (sp && typeof sp.get === "function") {
    const v = sp.get(key);
    return typeof v === "string" ? v : undefined;
  }
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function NotePage({
  searchParams,
}: {
  searchParams: any;
}) {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/signup");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const noteIdParam = getSearchParam(resolvedSearchParams, "id");
  if (!noteIdParam) {
    notFound();
  }

  const noteId = noteIdParam as Id<"notes">;
  const preloadedNote = await preloadQuery(
    api.notes.getNoteById,
    { _id: noteId },
    { token },
  );

  return <NotePageClient noteId={noteId} preloadedNote={preloadedNote} />;
}
