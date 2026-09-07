import { NotepadText } from "lucide-react";
import CreateNoteBtn from "./CreateNoteBtn";
import MaxWContainer from "../ui/MaxWContainer";
import type { Id } from "@/convex/_generated/dataModel";
import { FileX } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";

interface NoteNotFoundProps {
  notesTableId: string | any;
  workingSpacesSlug: string | any;
  workingSpaceId: Id<"workingSpaces">;
}
export default function NoteNotFound({
  notesTableId,
  workingSpacesSlug,
  workingSpaceId,
}: NoteNotFoundProps) {
  return (
    <MaxWContainer>
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center app-radius-full bg-muted">
            <FileX className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Note not found
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The note you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/home">Return to home</Link>
          </Button>
        </div>
      </div>
    </MaxWContainer>
  );
}
