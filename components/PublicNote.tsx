"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  EyeClosed,
  Copy,
  CheckSquare,
  Globe2Icon,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useMediaQuery } from "react-responsive";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";

interface PublicNoteProp {
  noteId: Id<"notes">;
  noteTitle: string | any;
  BtnClassName?: string;
}

export default function PublicNote({
  noteId,
  noteTitle,
  BtnClassName,
}: PublicNoteProp) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isMobile = useMediaQuery({ maxWidth: 640 });
  const [open, setOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const tooltip = useHoverTooltip(300);
  const copyTooltip = useHoverTooltip(300);

  const updateNote = useMutation(api.notes.updateNote).withOptimisticUpdate(
    (local, args) => {
      const { _id, title, body, published } = args;

      const note = local.getQuery(api.notes.getNoteById, { _id });
      if (note) {
        local.setQuery(
          api.notes.getNoteById,
          { _id },
          {
            ...note,
            title: title ?? note.title,
            body: body ?? note.body,
            published: published !== undefined ? published : note.published,
            updatedAt: Date.now(),
          },
        );
      }
    },
  );

  const getNote = useQuery(api.notes.getNoteById, { _id: noteId });
  if (!getNote) return null;

  const handlePublished = async () => {
    if (getNote === undefined || getNote === null) {
      return null;
    }
    await updateNote({
      _id: noteId,
      published: !getNote.published,
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `https://notevo.me/public/document/${noteId}`,
      );
      setIsCopied(true);
      copyTooltip.hide();
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) tooltip.hide();
      }}
    >
      <Tooltip open={tooltip.open}>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn("h-8 px-2 text-sm mt-0.5 gap-1", BtnClassName)}
              {...tooltip.triggerProps}
            >
              {getNote?.published ? (
                <>
                  <EyeClosed size={14} />
                  {!isMobile && "Unpublish"}
                </>
              ) : (
                <>
                  <Eye size={14} />
                  {!isMobile && " Publish"}
                </>
              )}
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <TooltipContent side="bottom" alignOffset={0} align="end">
          {getNote?.published
            ? "Take a look at your published note"
            : "Publish your note to the web"}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        side="bottom"
        alignOffset={0}
        align="end"
        className=" min-w-[18.5rem] px-3 pb-3 pt-2 space-y-4 text-muted-foreground z-[10000]"
      >
        <DropdownMenuGroup className="relative">
          {getNote?.published ? (
            <header className="w-full text-start flex flex-col justify-center items-start gap-3">
              <span className="px-1 space-y-2">
                <h1 className="flex justify-start items-center gap-2 text-base text-foreground font-bold">
                  <CheckSquare
                    size={16}
                    className="text-muted-foreground mt-px"
                  />
                  Published to the web
                </h1>
                <p className="text-xs font-medium text-muted-foreground">
                  Copy the link, share notes with the world
                </p>
              </span>
              <span className="w-full relative">
                <Input
                  type="text"
                  value={`https://notevo.me/public/document/${noteId}`}
                  className="h-9 truncate flex-grow bg-gradient-to-r from-foreground from-50% via-transparent via-85% to-transparent to-80% text-transparent bg-clip-text"
                  disabled
                />
                <Tooltip open={copyTooltip.open}>
                  <TooltipTrigger asChild>
                    <Button
                      onMouseDown={handleCopy}
                      onPointerMove={(e) => e.stopPropagation()}
                      {...copyTooltip.triggerProps}
                      className={`w-fit h-8 absolute top-1/2 -translate-y-1/2 right-0  text-primary hover:text-primary`}
                      disabled={isCopied && true}
                      variant="Trigger"
                    >
                      {isCopied ? (
                        "Copied!"
                      ) : (
                        <Copy size={14} className="text-primary" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    className=" rounded-tl-sm px-1.5"
                    side="bottom"
                  >
                    Copy link
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="w-full flex justify-between items-center gap-2">
                <Button
                  onMouseDown={handlePublished}
                  className="w-full h-8 gap-2 bg-transparent"
                  variant="outline"
                >
                  <EyeClosed size={14} />
                  Unpublish
                </Button>
                <Button
                  className="w-full h-8 !rounded-none "
                  variant="secondary"
                >
                  <Link
                    target="_blank"
                    className="flex justify-center items-center gap-2 "
                    href={`https://notevo.me/public/document/${noteId}`}
                  >
                    <ExternalLink size={14} />
                    View site
                  </Link>
                </Button>
              </span>
            </header>
          ) : (
            <header className="w-full text-start flex flex-col justify-center items-center gap-6">
              <span className="px-1 space-y-2">
                <h1 className="flex justify-start items-center gap-2 text-base text-foreground font-bold">
                  <Globe2Icon
                    size={16}
                    className="text-muted-foreground mt-px"
                  />
                  Publish to the web
                </h1>
                <p className="text-xs font-medium text-muted-foreground">
                  Publish a static webpage of this document, read only
                  <br />
                  and anyone with the link can view or duplicate it.
                </p>
              </span>
              <Button
                variant="revDefault"
                onMouseDown={handlePublished}
                className="w-full h-8 gap-2"
              >
                <Eye size={14} />
                Publish
              </Button>
            </header>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
