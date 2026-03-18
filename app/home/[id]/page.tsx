"use client";

import type { Id } from "@/convex/_generated/dataModel";
import WorkingSpacePageClient from "./WorkingSpacePageClient";
import { useConvexAuth } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function WorkingSpacePage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const workingSpaceId = useMemo(() => {
    const raw = (params as any)?.id;
    if (typeof raw === "string") return raw as Id<"workingSpaces">;
    if (Array.isArray(raw) && typeof raw[0] === "string")
      return raw[0] as Id<"workingSpaces">;
    return null;
  }, [params]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/signup");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (workingSpaceId === null) router.replace("/home");
  }, [router, workingSpaceId]);

  if (isLoading || !isAuthenticated || workingSpaceId === null) return null;

  return <WorkingSpacePageClient workingSpaceId={workingSpaceId} />;
}
