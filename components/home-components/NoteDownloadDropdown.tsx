"use client";

import { Download, FileText, FileJson, FileType, FileDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNoteDownload, type DownloadFormat } from "@/hooks/useNoteDownload";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";

interface NoteDownloadDropdownProps {
  noteBody: string | undefined | null;
  noteTitle: string;
  align?: "end" | "start" | "center";
  className?: string;
}

export default function NoteDownloadDropdown({
  noteBody,
  noteTitle,
  align = "end",
  className,
}: NoteDownloadDropdownProps) {
  const { handleDownload } = useNoteDownload({ noteBody, noteTitle });
  const tooltip = useHoverTooltip(100);

  const formats: {
    label: string;
    value: DownloadFormat;
    icon: React.ReactNode;
  }[] = [
    {
      label: "Markdown (.md)",
      value: "markdown",
      icon: <FileText size={16} className="text-muted-foreground" />,
    },
    {
      label: "JSON",
      value: "json",
      icon: <FileJson size={16} className="text-muted-foreground" />,
    },
    {
      label: "Word (.docx)",
      value: "docx",
      icon: <FileType size={16} className="text-muted-foreground" />,
    },
    {
      label: "PDF",
      value: "pdf",
      icon: <FileDown size={16} className="text-muted-foreground" />,
    },
  ];

  return (
    <DropdownMenu onOpenChange={(next) => next && tooltip.hide()}>
      <Tooltip open={tooltip.open}>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`w-8 h-8 pt-0.5 ${className ?? ""}`}
              {...tooltip.triggerProps}
            >
              <Download className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Download note</span>
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <TooltipContent
          align="end"
          side="bottom"
          className=" text-xs py-0.5 px-1.5"
        >
          Download note
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align={align} side="bottom" className="w-44">
        {formats.map(({ label, value, icon }) => (
          <DropdownMenuItem
            key={value}
            className="text-sm cursor-pointer flex items-center gap-2"
            onClick={() => handleDownload(value)}
          >
            {icon}
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
