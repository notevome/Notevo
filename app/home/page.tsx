import { api } from "@/convex/_generated/api";
import HomePageClient from "./HomePageClient";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/signup");
  }

  // Fetch (not subscribe) to keep bandwidth low and eliminate client-side loading
  // skeletons for the home page lists.
  const recentNotesPage = await fetchQuery(
    api.notes.getNoteByUserId,
    { paginationOpts: { numItems: 5, cursor: null } },
    { token },
  );
  const pinnedNotesPage = await fetchQuery(
    api.notes.getFavNotes,
    { paginationOpts: { numItems: 5, cursor: null } },
    { token },
  );

  return (
    <HomePageClient
      initialRecentNotes={(recentNotesPage as any)?.page ?? []}
      initialPinnedNotes={(pinnedNotesPage as any)?.page ?? []}
    />
  );
}
