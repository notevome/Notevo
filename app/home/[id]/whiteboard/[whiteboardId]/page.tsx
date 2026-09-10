import { redirect } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import WhiteboardPageClient from "./WhiteboardPageClient";

export default async function WhiteboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ whiteboardId?: string }>;
  searchParams: Promise<{ whiteboardId?: string | string[] }>;
}) {
  const { whiteboardId: routeId } = await params;
  const { whiteboardId } = await searchParams;
  const resolvedId =
    typeof whiteboardId === "string"
      ? whiteboardId
      : Array.isArray(whiteboardId)
        ? whiteboardId[0]
        : routeId;

  if (!resolvedId) redirect("/");
  return <WhiteboardPageClient whiteboardId={resolvedId as Id<"whiteboards">} />;
}
