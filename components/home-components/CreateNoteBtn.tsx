import type { Id } from "@/convex/_generated/dataModel";
import FolderNewDropdownBtn from "./folder-new-dropdown-btn";

interface CreateNoteBtnProps {
  CNBP_notesTableId: Id<"tables"> | undefined;
  workingSpacesSlug: string | any;
  workingSpaceId: Id<"folders"> | any;
  className?: string;
  variant?: "outline" | "default";
}

export default function CreateNoteBtn({
  CNBP_notesTableId,
  workingSpacesSlug,
  workingSpaceId,
  className,
  variant = "outline",
}: CreateNoteBtnProps) {
  return (
    <FolderNewDropdownBtn
      notesTableId={CNBP_notesTableId}
      workingSpacesSlug={workingSpacesSlug}
      workingSpaceId={workingSpaceId}
      className={className}
      variant={variant}
    />
  );
}
