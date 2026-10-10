"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pin, PinOff } from "lucide-react";
import { FaRegTrashCan } from "react-icons/fa6";

type SidebarItemContextMenuProps = {
  children: React.ReactNode;
  itemName: string;
  itemLabel: string;
  favorite?: boolean;
  onRename?: (name: string) => Promise<unknown> | void;
  onToggleFavorite?: () => Promise<unknown> | void;
  onDelete: () => Promise<unknown> | void;
};

/** A pointer-positioned context menu shared by non-note sidebar entries. */
export default function SidebarItemContextMenu({
  children,
  itemName,
  itemLabel,
  favorite,
  onRename,
  onToggleFavorite,
  onDelete,
}: SidebarItemContextMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(itemName);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => setName(itemName), [itemName]);
  useEffect(() => {
    if (!open || !onRename) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open, onRename]);

  const saveName = async () => {
    const trimmed = name.trim();
    if (!onRename || !trimmed || trimmed === itemName) {
      setName(itemName);
      return;
    }
    await onRename(trimmed);
  };

  return (
    <>
      <div
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPosition({ x: event.clientX, y: event.clientY });
          setOpen(false);
          requestAnimationFrame(() => setOpen(true));
        }}
      >
        {children}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <span
              aria-hidden
              style={{
                position: "fixed",
                left: position.x,
                top: position.y,
                width: 0,
                height: 0,
                pointerEvents: "none",
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="z-[10000] w-48 space-y-3 px-1.5 pb-1.5 pt-0 text-muted-foreground"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            {onRename && (
              <DropdownMenuGroup>
                <Label className="text-xs text-muted-foreground">Rename</Label>
                <Input
                  ref={inputRef}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => void saveName()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveName();
                      setOpen(false);
                    }
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="h-7 text-foreground"
                  aria-label={`Rename ${itemLabel}`}
                />
              </DropdownMenuGroup>
            )}
            <DropdownMenuGroup>
              {onToggleFavorite && (
                <DropdownMenuItem onClick={() => void onToggleFavorite()}>
                  {favorite ? (
                    <PinOff size={14} className="mr-2" />
                  ) : (
                    <Pin size={14} className="mr-2" />
                  )}
                  {favorite ? `Unpin ${itemLabel}` : `Pin ${itemLabel}`}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="hover:text-destructive"
                onClick={() => {
                  setOpen(false);
                  setDeleteOpen(true);
                }}
              >
                <FaRegTrashCan size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {itemLabel} deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this {itemLabel.toLowerCase()}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => void onDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
