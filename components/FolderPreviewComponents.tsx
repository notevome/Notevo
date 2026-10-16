"use client";

import { useEffect, useState } from "react";
import { Link2, PanelTop } from "lucide-react";
import { cn } from "@/lib/utils";
import { platformLabel, type LinkPlatform } from "@/lib/link-platform";
import {
  extractTextFromTiptap as parseTiptapContentExtractText,
  truncateText as parseTiptapContentTruncateText,
} from "@/lib/parse-tiptap-content";

export function getContentPreviewFromBody(body: any): string {
  if (!body) return "No content yet. Click to start writing...";
  try {
    const plainText = parseTiptapContentExtractText(body);
    return plainText
      ? parseTiptapContentTruncateText(plainText, 140)
      : "No content yet. Click to start writing...";
  } catch {
    return "No content yet. Click to start writing...";
  }
}

export function isGenericLinkPlatform(
  platform: LinkPlatform | string | undefined,
): boolean {
  if (!platform) return true;
  const p = String(platform).toLowerCase();
  return !(
    p.includes("youtube") ||
    p === "yt" ||
    p === "x" ||
    p.includes("twitter") ||
    p.includes("instagram") ||
    p === "ig" ||
    p.includes("linkedin")
  );
}

export function isSocialLinkPlatform(
  platform: LinkPlatform | string | undefined,
): boolean {
  return !isGenericLinkPlatform(platform);
}

export function stripImageSizeSuffix(url: string): string {
  return url.replace(
    /_(?:\d+x\d+|normal|bigger|mini|original)(?=\.[a-zA-Z0-9]+(?:\?.*)?$)/i,
    "",
  );
}

export function isAvatarFallbackThumbnail(
  thumbnailUrl: string | undefined,
  avatarUrl: string | undefined,
): boolean {
  if (!thumbnailUrl || !avatarUrl) return false;
  if (thumbnailUrl === avatarUrl) return true;
  return stripImageSizeSuffix(thumbnailUrl) === stripImageSizeSuffix(avatarUrl);
}

export function formatHandle(handle?: string | null): string | null {
  const trimmed = handle?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function formatLongDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLongDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getLinkFaviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

export function LinkFavicon({
  url,
  className,
  grayscale = true,
}: {
  url: string;
  className?: string;
  grayscale?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const faviconUrl = getLinkFaviconUrl(url);

  if (!faviconUrl || errored) {
    return <Link2 className={cn("text-foreground", className)} />;
  }

  return (
    <img
      src={faviconUrl}
      alt="favicon"
      draggable={false}
      className={cn(
        "object-contain select-none [-webkit-user-drag:none]",
        grayscale && "grayscale",
        className,
      )}
      onError={() => setErrored(true)}
    />
  );
}

export function LinkFaviconBadge({
  url,
  className,
  grayscale = true,
}: {
  url: string;
  className?: string;
  grayscale?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden",
        className,
      )}
    >
      <LinkFavicon
        url={url}
        className="h-[100%] w-[100%]"
        grayscale={grayscale}
      />
    </div>
  );
}

export function LinkAuthorAvatar({
  avatarUrl,
  authorName,
  className,
}: {
  avatarUrl?: string;
  authorName?: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  if (!avatarUrl || errored) {
    const initial = authorName?.trim().charAt(0).toUpperCase();
    return (
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-medium text-muted-foreground",
          className,
        )}
      >
        {initial ? (
          initial
        ) : (
          <Link2 className="h-1/2 w-1/2 text-muted-foreground" />
        )}
      </div>
    );
  }
  return (
    <img
      src={avatarUrl}
      alt={authorName || ""}
      draggable={false}
      onError={() => setErrored(true)}
      className={cn(
        "rounded-full object-cover flex-shrink-0 select-none [-webkit-user-drag:none]",
        className,
      )}
    />
  );
}

export function LinkThumbnail({
  link,
  showFaviconBadge = false,
}: {
  link: {
    url: string;
    platform?: LinkPlatform | string;
    metadata?: {
      thumbnailUrl?: string;
      authorAvatarUrl?: string;
    };
  };
  showFaviconBadge?: boolean;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const thumbnailUrl = link.metadata?.thumbnailUrl;
  const isPending = link.metadata === undefined;
  const showSkeleton = isPending || (Boolean(thumbnailUrl) && !imgLoaded);

  return (
    <div className="relative w-full aspect-video app-radius-md overflow-hidden bg-muted">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt="thumbnail url"
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(false)}
          className={cn(
            "w-full h-full object-cover select-none [-webkit-user-drag:none] transition-opacity duration-300 ",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {showSkeleton && (
        <div className="absolute inset-0 bg-border/60 animate-pulse" />
      )}

      {!isPending && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center gap-3 px-3 text-sm text-muted-foreground">
          <LinkFaviconBadge url={link.url} className="h-10 w-10 shrink-0" />
          <span>{platformLabel(link.platform as any) || "Link"}</span>
        </div>
      )}

      {showFaviconBadge && thumbnailUrl && imgLoaded && (
        <LinkFaviconBadge
          url={link.url}
          className="absolute bottom-2 right-2 h-8 w-8"
        />
      )}
    </div>
  );
}

export function WhiteboardPreview({
  snapshot,
  preview,
  fill = false,
}: {
  snapshot?: string;
  preview?: string;
  fill?: boolean;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshot) {
      setThumbnailUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const renderThumbnail = async () => {
      try {
        const scene = JSON.parse(snapshot);
        if (!Array.isArray(scene.elements) || scene.elements.length === 0) {
          if (!cancelled) setThumbnailUrl(null);
          return;
        }
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svg = await exportToSvg({
          elements: scene.elements,
          appState: scene.appState,
          files: scene.files,
          exportPadding: 24,
        } as any);
        objectUrl = URL.createObjectURL(
          new Blob([new XMLSerializer().serializeToString(svg)], {
            type: "image/svg+xml",
          }),
        );
        if (!cancelled) setThumbnailUrl(objectUrl);
      } catch {
        if (!cancelled) setThumbnailUrl(null);
      }
    };

    void renderThumbnail();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [snapshot]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        fill ? "h-full w-full" : "h-fit w-full",
      )}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt="Whiteboard thumbnail"
          draggable={false}
          className={cn(
            "pointer-events-none h-full w-full select-none bg-white [-webkit-user-drag:none]",
            fill ? "object-cover" : "object-contain border border-border",
          )}
        />
      ) : (
        <div className="min-h-32 w-full flex justify-center items-center">
          <PanelTop className="h-8 w-8 text-primary/70" />
        </div>
      )}
    </div>
  );
}
