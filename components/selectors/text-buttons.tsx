import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
} from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import type { SelectorItem } from "./node-selector";
import { ShortcutBadge } from "../ui/shortcut-badge";
// Detect platform once
const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  const items = [
    {
      name: "bold",
      label: "Bold",
      shortcut: `${mod}+B`,
      isActive: (editor: any) => editor.isActive("bold"),
      command: (editor: any) => editor.chain().focus().toggleBold().run(),
      icon: BoldIcon,
    },
    {
      name: "italic",
      label: "Italic",
      shortcut: `${mod}+I`,
      isActive: (editor: any) => editor.isActive("italic"),
      command: (editor: any) => editor.chain().focus().toggleItalic().run(),
      icon: ItalicIcon,
    },
    {
      name: "underline",
      label: "Underline",
      shortcut: `${mod}+U`,
      isActive: (editor: any) => editor.isActive("underline"),
      command: (editor: any) => editor.chain().focus().toggleUnderline().run(),
      icon: UnderlineIcon,
    },
    {
      name: "strike",
      label: "Strikethrough",
      shortcut: `${mod}+Shift+S`,
      isActive: (editor: any) => editor.isActive("strike"),
      command: (editor: any) => editor.chain().focus().toggleStrike().run(),
      icon: StrikethroughIcon,
    },
    {
      name: "code",
      label: "Inline Code",
      shortcut: `${mod}+E`,
      isActive: (editor: any) => editor.isActive("code"),
      command: (editor: any) => editor.chain().focus().toggleCode().run(),
      icon: CodeIcon,
    },
  ];

  const alignItems = [
    {
      name: "alignLeft",
      align: "left",
      label: "Align Left",
      shortcut: `${mod}+Shift+L`,
      isActive: (editor: any) => editor.isActive({ textAlign: "left" }),
      icon: AlignLeftIcon,
    },
    {
      name: "alignCenter",
      align: "center",
      label: "Align Center",
      shortcut: `${mod}+Shift+E`,
      isActive: (editor: any) => editor.isActive({ textAlign: "center" }),
      icon: AlignCenterIcon,
    },
    {
      name: "alignRight",
      align: "right",
      label: "Align Right",
      shortcut: `${mod}+Shift+R`,
      isActive: (editor: any) => editor.isActive({ textAlign: "right" }),
      icon: AlignRightIcon,
    },
  ];

  return (
    <TooltipProvider delayDuration={300} disableHoverableContent>
      <div className="flex">
        {items.map((item) => (
          <EditorBubbleItem
            key={item.name}
            onSelect={(editor) => {
              item.command(editor);
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="border-none px-2 h-8"
                  variant="SidebarMenuButton"
                  type="button"
                >
                  <item.icon
                    className={cn("h-4 w-4", {
                      "text-primary": item.isActive(editor),
                      "text-foreground": !item.isActive(editor),
                    })}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className=" flex justify-center items-center px-1"
                sideOffset={6}
              >
                <span>{item.label}</span>
                <ShortcutBadge keys={item.shortcut} />
              </TooltipContent>
            </Tooltip>
          </EditorBubbleItem>
        ))}

        {alignItems.map((item) => (
          <Tooltip key={item.name}>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                className="border-none px-2 h-8"
                variant="SidebarMenuButton"
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  (editor.commands as any).setTextAlign(item.align);
                }}
              >
                <item.icon
                  className={cn("h-4 w-4", {
                    "text-primary": item.isActive(editor),
                    "text-foreground": !item.isActive(editor),
                  })}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className=" flex justify-center items-center px-1"
              sideOffset={6}
            >
              <span>{item.label}</span>
              <ShortcutBadge keys={item.shortcut} />
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
