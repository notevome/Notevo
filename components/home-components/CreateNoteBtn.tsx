import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useMutation, insertAtTop } from "convex/react";
import { Plus } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";

interface CreateNoteBtnProps {
  CNBP_notesTableId: Id<"notesTables"> | undefined;
  workingSpacesSlug: string | any;
  workingSpaceId: Id<"workingSpaces"> | any;
  className?: string;
}

export default function CreateNoteBtn({
  CNBP_notesTableId,
  workingSpacesSlug,
  workingSpaceId,
  className,
}: CreateNoteBtnProps) {
  const router = useRouter();

  const createNote = useMutation(api.notes.createNote).withOptimisticUpdate(
    (local, args) => {
      const { notesTableId, title, workingSpacesSlug, workingSpaceId } = args;

      if (!CNBP_notesTableId || notesTableId !== CNBP_notesTableId) return;

      const now = Date.now();
      const uuid = crypto.randomUUID();
      const tempId = `${uuid}-${now}` as Id<"notes">;
      insertAtTop({
        localQueryStore: local,
        paginatedQuery: api.notes.getNotesByTableId,
        argsToMatch: { notesTableId: CNBP_notesTableId },
        item: {
          _id: tempId,
          _creationTime: now,
          title: title || "Untitled",
          body: undefined,
          slug: "untitled",
          workingSpaceId,
          workingSpacesSlug,
          notesTableId: CNBP_notesTableId,
          favorite: false,
          createdAt: now,
          updatedAt: now,
        },
      });
    },
  );

  const handleCreateNote = async () => {
    try {
      const newNoteId = await createNote({
        title: "Untitled",
        notesTableId: CNBP_notesTableId,
        workingSpacesSlug,
        workingSpaceId,
      });
    } catch (error) {
      console.error("Failed to create note:", error);
      // Optional: show toast/error if creation fails
    }
  };

  return (
    <Button
      className={cn(
        "flex items-center justify-between gap-2 h-9 px-2",
        className,
      )}
      variant="outline"
      onClick={handleCreateNote}
    >
      <Plus size="20" />
      <p>New Note</p>
    </Button>
  );
}
