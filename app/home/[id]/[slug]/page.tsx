"use client";

import type { Id } from "@/convex/_generated/dataModel";
import NotePageClient from "./NotePageClient";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useConvexAuth } from "convex/react";

export default function NotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const noteId = useMemo(() => {
    const id = searchParams.get("id");
    return (id ?? null) as Id<"notes"> | null;
  }, [searchParams]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/signup");
      router.refresh();
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (noteId === null) {
      router.replace("/home");
      router.refresh();
    }
  }, [noteId, router]);

  if (noteId === null || isLoading || !isAuthenticated) return null;

  return <NotePageClient noteId={noteId} />;
}
