import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import WorkingSpacePageClient from "./WorkingSpacePageClient";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { notFound, redirect } from "next/navigation";

export default async function WorkingSpacePage({
  params,
}: {
  params: any;
}) {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/signup");
  }

  // Next may pass `params` as a promise-like value depending on version/build.
  const resolvedParams = await Promise.resolve(params);
  const idParam =
    typeof resolvedParams?.id === "string"
      ? resolvedParams.id
      : Array.isArray(resolvedParams?.id) && typeof resolvedParams.id[0] === "string"
        ? resolvedParams.id[0]
        : undefined;
  if (!idParam) {
    notFound();
  }

  const workingSpaceId = idParam as Id<"workingSpaces">;
  const preloadedWorkspace = await preloadQuery(
    api.workingSpaces.getWorkingSpaceById,
    { _id: workingSpaceId },
    { token },
  );
  const preloadedTables = await preloadQuery(
    api.notesTables.getTables,
    { workingSpaceId },
    { token },
  );

  return (
    <WorkingSpacePageClient
      workingSpaceId={workingSpaceId}
      preloadedWorkspace={preloadedWorkspace}
      preloadedTables={preloadedTables}
    />
  );
}
