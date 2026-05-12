import type { Id } from "@/convex/_generated/dataModel";
import WorkingspaceNewDropdownBtn from "./workingspace-new-dropdown-btn";

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
  return (
    <WorkingspaceNewDropdownBtn
      notesTableId={CNBP_notesTableId}
      workingSpacesSlug={workingSpacesSlug}
      workingSpaceId={workingSpaceId}
      className={className}
    />
  );
}
