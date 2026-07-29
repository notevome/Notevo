"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { ChevronDown, ChevronRight, Blocks, Palette, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

const DEFAULT_TOGGLE_TITLE = "toggle action";

type ToggleStyle = {
  bgColor: string | null;
  bgOpacity: number;
};

const DEFAULT_STYLE: ToggleStyle = {
  bgColor: null,
  bgOpacity: 100,
};

const SWATCHES: { name: string; light: string; dark: string }[] = [
  { name: "purple", light: "#7c3aed", dark: "#a78bfa" },
  { name: "rose", light: "#e11d48", dark: "#fb7185" },
  { name: "blue", light: "#2563eb", dark: "#60a5fa" },
  { name: "green", light: "#15803d", dark: "#4ade80" },
  { name: "orange", light: "#c2410c", dark: "#fb923c" },
  { name: "pink", light: "#be185d", dark: "#f472b6" },
  { name: "slate", light: "#475569", dark: "#94a3b8" },
];

function resolveSwatch(name: string | null, isDark: boolean) {
  if (!name) return null;
  const swatch = SWATCHES.find((entry) => entry.name === name);
  if (!swatch) return null;
  return isDark ? swatch.dark : swatch.light;
}

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toggle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function storageKey(id: string) {
  return `toggle-action-style:${id}`;
}

function hexToRgbComponents(hex: string) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function hexToRgba(hex: string, opacityPercent: number) {
  const { r, g, b } = hexToRgbComponents(hex);
  const alpha = Math.min(100, Math.max(0, opacityPercent)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const MAX_BG_OPACITY = 70;

function getReadableTextColor(
  hex: string,
  opacityPercent: number,
  isDark: boolean,
) {
  const { r, g, b } = hexToRgbComponents(hex);
  const alpha = Math.min(100, Math.max(0, opacityPercent)) / 100;
  const base = isDark ? 0 : 255;
  const blendedR = r * alpha + base * (1 - alpha);
  const blendedG = g * alpha + base * (1 - alpha);
  const blendedB = b * alpha + base * (1 - alpha);
  const luminance =
    (0.299 * blendedR + 0.587 * blendedG + 0.114 * blendedB) / 255;
  return luminance > 0.55 ? "#1a1a1a" : "#f5f5f5";
}

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

function ColorRow({
  label,
  value,
  isDark,
  onChange,
}: {
  label: string;
  value: string | null;
  isDark: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="No color"
          onClick={() => onChange(null)}
          className={cn(
            "h-5 w-5 !rounded text-muted-foreground hover:bg-transparent hover:text-foreground",
            value === null && "outline-1 outline-muted-foreground",
          )}
        >
          <Ban className="h-5 w-5" />
        </Button>
        {SWATCHES.map((swatch) => (
          <Button
            key={swatch.name}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={swatch.name}
            onClick={() => onChange(swatch.name)}
            style={{ backgroundColor: isDark ? swatch.dark : swatch.light }}
            className={cn(
              "h-5 w-5 !rounded p-0 transition-transform hover:scale-110",
              value === swatch.name && " outline-1 outline-muted-foreground",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function ToggleActionComponent({ node, updateAttributes }: NodeViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(
    node.attrs.title || DEFAULT_TOGGLE_TITLE,
  );
  const isOpen = node.attrs.open ?? true;
  const title = node.attrs.title || DEFAULT_TOGGLE_TITLE;

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleTooltip = useHoverTooltip(100);
  const toggleTooltip = useHoverTooltip(100);
  const customTooltip = useHoverTooltip(100);
  const isDark = useIsDarkMode();

  const [style, setStyle] = useState<ToggleStyle>(DEFAULT_STYLE);

  useEffect(() => {
    if (!node.attrs.id) {
      updateAttributes({ id: generateId() });
    }
  }, [node.attrs.id, updateAttributes]);

  // Load any previously saved appearance for this toggle.
  useEffect(() => {
    const id = node.attrs.id;
    if (!id || typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(storageKey(id));
      if (raw) {
        setStyle({ ...DEFAULT_STYLE, ...JSON.parse(raw) });
      }
    } catch {
      // Ignore malformed or inaccessible storage.
    }
  }, [node.attrs.id]);

  const persistStyle = useCallback(
    (next: ToggleStyle) => {
      setStyle(next);
      const id = node.attrs.id;
      if (!id || typeof window === "undefined") return;

      try {
        window.localStorage.setItem(storageKey(id), JSON.stringify(next));
      } catch {
        // Ignore storage errors (quota exceeded, private mode, etc.).
      }
    },
    [node.attrs.id],
  );

  const resolvedBgColor = resolveSwatch(style.bgColor, isDark);
  const effectiveOpacity = (style.bgOpacity / 100) * MAX_BG_OPACITY;

  const wrapperStyle = {
    backgroundColor: resolvedBgColor
      ? hexToRgba(resolvedBgColor, effectiveOpacity)
      : undefined,
  };

  const contrastColor = resolvedBgColor
    ? getReadableTextColor(resolvedBgColor, effectiveOpacity, isDark)
    : undefined;
  const contrastStyle = contrastColor ? { color: contrastColor } : undefined;

  const saveTitle = () => {
    const nextTitle = draftTitle.trim() || DEFAULT_TOGGLE_TITLE;
    updateAttributes({ title: nextTitle });
    setDraftTitle(nextTitle);
    setIsEditingTitle(false);
  };
  const handleDoubleClick = useCallback(() => {
    setIsEditingTitle(true);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.select();
      input.scrollLeft = 0;
    });
    titleTooltip.hide();
  }, [isEditingTitle, titleTooltip.open]);

  return (
    <NodeViewWrapper
      data-toggle-action
      style={wrapperStyle}
      className="my-3 rounded-tl-lg border border-border bg-muted/20 text-foreground transition-colors group"
    >
      <div
        contentEditable={false}
        className="flex min-h-10 items-center gap-2 px-3 py-2"
      >
        <Tooltip open={toggleTooltip.open} disableHoverableContent>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="Trigger"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              style={contrastStyle}
              onClick={() => {
                updateAttributes({ open: !isOpen });
                toggleTooltip.hide();
              }}
              aria-label="toggle action"
              {...toggleTooltip.triggerProps}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>

          <TooltipContent
            side="bottom"
            align="start"
            sideOffset={10}
            className="text-xs font-bold py-0.5 px-1.5 !rounded-none"
          >
            <p>{isOpen ? "Collapse toggle action" : "Expand toggle action"}</p>
          </TooltipContent>
        </Tooltip>

        {isEditingTitle ? (
          <Input
            ref={inputRef}
            autoFocus
            value={draftTitle}
            onChange={(event) => {
              setDraftTitle(event.target.value);
              titleTooltip.hide();
            }}
            onBlur={saveTitle}
            placeholder="Rename"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveTitle();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDraftTitle(title);
                setIsEditingTitle(false);
              }
              titleTooltip.hide();
            }}
            style={contrastStyle}
            className="min-w-0 h-6 !p-0 !m-0 !border-0 focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
          />
        ) : (
          <Tooltip open={titleTooltip.open} disableHoverableContent>
            <TooltipTrigger asChild>
              <button
                type="button"
                style={contrastStyle}
                className="min-w-0 truncate text-left text-sm cursor-text font-medium text-muted-foreground"
                onDoubleClick={handleDoubleClick}
                aria-label="Double click to rename"
                {...titleTooltip.triggerProps}
              >
                {title}
              </button>
            </TooltipTrigger>

            <TooltipContent
              side="bottom"
              align="start"
              sideOffset={10}
              className="text-xs font-bold py-0.5 px-1.5 !rounded-none"
            >
              <p>Double click to rename</p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="ml-auto flex items-center transition-opacity duration-150 ease-in-out opacity-0 group-hover:opacity-100">
          <Popover>
            <PopoverTrigger>
              <Tooltip open={customTooltip.open} disableHoverableContent>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="Trigger"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    style={contrastStyle}
                    aria-label=""
                    {...customTooltip.triggerProps}
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent
                  side="bottom"
                  align="center"
                  sideOffset={5}
                  className="text-xs font-bold py-0.5 px-1.5 !rounded-none"
                >
                  <p>Customize toggle appearance</p>
                </TooltipContent>
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="w-64 space-y-3 p-2 bg-muted"
            >
              <ColorRow
                label="Background color"
                value={style.bgColor}
                isDark={isDark}
                onChange={(value) => persistStyle({ ...style, bgColor: value })}
              />
              <Separator />
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Background opacity
                </p>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[style.bgOpacity]}
                    min={0}
                    max={100}
                    step={1}
                    disabled={!style.bgColor}
                    onValueChange={([value]) =>
                      persistStyle({ ...style, bgOpacity: value })
                    }
                    className={cn("flex-1", !style.bgColor && "opacity-40")}
                  />
                  <span className="w-8 text-right text-xs text-muted-foreground">
                    {style.bgOpacity}%
                  </span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <NodeViewContent
        className={`px-5 pb-4 pt-1 ${isOpen ? "block" : "hidden"}`}
      />
    </NodeViewWrapper>
  );
}

export const ToggleAction = Node.create({
  name: "toggleAction",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) =>
          attributes.id ? { "data-id": attributes.id } : {},
      },
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({
          "data-open": attributes.open ? "true" : "false",
        }),
      },
      title: {
        default: DEFAULT_TOGGLE_TITLE,
        parseHTML: (element) =>
          element.getAttribute("data-title") || DEFAULT_TOGGLE_TITLE,
        renderHTML: (attributes) => ({
          "data-title": attributes.title || DEFAULT_TOGGLE_TITLE,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='toggle-action']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "toggle-action",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleActionComponent);
  },
});
