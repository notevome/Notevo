import { redirect } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import FolderPageClient from "./FolderPageClient";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    redirect("/");
  }

  return <FolderPageClient workingSpaceId={id as any} />;
}
