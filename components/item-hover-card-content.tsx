"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import {
  FileText,
  File,
  PanelTop,
  Globe,
  Copy,
  Check,
  Unlink,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import IntentPrefetchLink from "@/components/IntentPrefetchLink";
import {
  WhiteboardPreview,
  LinkThumbnail,
  LinkAuthorAvatar,
  LinkFaviconBadge,
  formatLongDate,
  formatLongDateTime,
  formatHandle,
  isSocialLinkPlatform,
  isAvatarFallbackThumbnail,
} from "@/components/WorkspacePreviewComponents";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function ThumbnailFrame({
  src,
  children,
}: {
  src?: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(!src);

  useEffect(() => {
    if (!src) {
      setReady(true);
      return;
    }

    let cancelled = false;
    const done = () => {
      if (!cancelled) setReady(true);
    };

    const img = new window.Image();
    img.onload = done;
    img.onerror = done;
    img.src = src;
    if (img.complete) done();

    const timer = window.setTimeout(done, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [src]);

  return (
    <div className="relative aspect-video w-full overflow-hidden app-radius-md bg-muted">
      {!ready && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-muted-foreground/10"
        />
      )}
      <div className="absolute inset-0 transition-opacity duration-200">
        {children}
      </div>
    </div>
  );
}

export function HoverCardSkeleton({
  kind,
}: {
  kind?: "note" | "whiteboard" | "pdf" | "link";
}) {
  const isNote = kind === "note";
  return (
    <div
      aria-busy="true"
      className={cn(
        "flex flex-col max-w-[90vw] overflow-hidden app-radius-xl border border-border bg-card ",
        isNote ? "w-[360px]" : "w-[380px]",
      )}
    >
      <div className="p-2 border-b border-border animate-pulse">
        <div className="flex items-start gap-2">
          <div className="h-6 w-6 shrink-0 mt-0.5 app-radius-md bg-muted" />
          <div className="flex-1 space-y-1.5 pt-1">
            <div className="h-3 w-2/3 app-radius-sm bg-muted" />
            <div className="h-2.5 w-1/3 app-radius-sm bg-muted/70" />
          </div>
        </div>
      </div>
      <div className="p-2 space-y-3 animate-pulse">
        <div className="space-y-1.5">
          <div className="h-2.5 w-full app-radius-sm bg-muted/70" />
          <div className="h-2.5 w-full app-radius-sm bg-muted/70" />
          <div className="h-2.5 w-3/4 app-radius-sm bg-muted/70" />
        </div>
        {!isNote && (
          <div className="aspect-video w-full app-radius-md bg-muted" />
        )}
      </div>
    </div>
  );
}

export interface ResolvedHoverItem {
  kind: "note" | "whiteboard" | "pdf" | "link";
  _id?: string;
  title: string;
  subtitle?: string;
  preview?: string;
  body?: string;
  snapshot?: string;
  url?: string;
  platform?: string;
  metadata?: any;
  href: string;
  tableName?: string;
  workingSpaceId?: string;
  workingSpaceName?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface ItemHoverCardContentProps {
  item: ResolvedHoverItem | null;
  fallbackUrl: string;
  onUnlink?: () => void;
  canUnlink?: boolean;
}

export function ItemHoverCardContent({
  item,
  fallbackUrl,
  onUnlink,
  canUnlink = true,
}: ItemHoverCardContentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const targetUrl = item?.href || item?.url || fallbackUrl;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy link");
    }
  }, [item?.href, item?.url, fallbackUrl]);

  if (!item) {
    let domain = "";
    try {
      domain = new URL(fallbackUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = fallbackUrl;
    }

    const isInternal =
      fallbackUrl.startsWith("/") ||
      fallbackUrl.startsWith(
        typeof window !== "undefined" ? window.location.origin : "",
      );

    return (
      <div className="flex flex-col w-[340px] max-w-[90vw] overflow-hidden app-radius-xl border border-border bg-card text-card-foreground">
        <div className="p-2 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <LinkFaviconBadge url={fallbackUrl} className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">
              {domain || "Link"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isInternal ? (
              <IntentPrefetchLink
                href={fallbackUrl}
                className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground app-radius-md hover:bg-accent transition-colors"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </IntentPrefetchLink>
            ) : (
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground app-radius-md hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground app-radius-md"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            {canUnlink && onUnlink && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive app-radius-md"
                onClick={onUnlink}
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="p-2">
          <p className="text-xs text-muted-foreground break-all leading-relaxed">
            {fallbackUrl}
          </p>
        </div>
      </div>
    );
  }

  if (item.kind === "note") {
    return (
      <div className="flex flex-col w-[360px] max-w-[90vw] overflow-hidden app-radius-xl border border-border bg-card text-card-foreground">
        <div className="p-2 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1 min-w-0">
              <div className="h-8 w-8 text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 [overflow-wrap:anywhere]">
                  {item.title}
                </p>
                {(item.createdAt || item.updatedAt) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.createdAt
                      ? `Created ${formatLongDate(item.createdAt)}`
                      : ""}
                    {item.createdAt &&
                    item.updatedAt &&
                    item.updatedAt !== item.createdAt
                      ? ` · Updated ${formatLongDate(item.updatedAt)}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground app-radius-md"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              {canUnlink && onUnlink && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive app-radius-md"
                  onClick={onUnlink}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-2 space-y-3">
          <div className="text-xs text-muted-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-4 app-radius-md ">
            {item.preview || "No content written yet."}
          </div>

          <IntentPrefetchLink
            href={item.href}
            className="inline-flex w-full items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium app-radius-md bg-border text-muted-foreground hover:brightness-150 transition-colors shadow-sm"
          >
            <span>Open note</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </IntentPrefetchLink>
        </div>
      </div>
    );
  }

  if (item.kind === "whiteboard") {
    return (
      <div className="flex flex-col w-[380px] max-w-[90vw] overflow-hidden app-radius-xl border border-border bg-card text-card-foreground">
        <div className="p-2 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1 min-w-0">
              <div className="h-8 w-8 text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <PanelTop className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 [overflow-wrap:anywhere]">
                  {item.title}
                </p>
                {(item.createdAt || item.updatedAt) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.createdAt
                      ? `Created ${formatLongDate(item.createdAt)}`
                      : ""}
                    {item.createdAt &&
                    item.updatedAt &&
                    item.updatedAt !== item.createdAt
                      ? ` · Updated ${formatLongDate(item.updatedAt)}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground app-radius-md"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              {canUnlink && onUnlink && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive app-radius-md"
                  onClick={onUnlink}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-2 space-y-3">
          <div className="overflow-hidden app-radius-md border border-border bg-white aspect-video flex items-center justify-center shadow-inner">
            <WhiteboardPreview
              snapshot={item.snapshot}
              preview={item.preview}
              fill
            />
          </div>

          <IntentPrefetchLink
            href={item.href}
            className="inline-flex w-full items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium app-radius-md bg-border text-muted-foreground hover:brightness-150 transition-colors shadow-sm"
          >
            <span>Open whiteboard</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </IntentPrefetchLink>
        </div>
      </div>
    );
  }

  if (item.kind === "pdf") {
    return (
      <div className="flex flex-col w-[360px] max-w-[90vw] overflow-hidden app-radius-xl border border-border bg-card text-card-foreground">
        <div className="p-2 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1 min-w-0">
              <div className="h-8 w-8 text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <File className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 [overflow-wrap:anywhere]">
                  {item.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  PDF document
                  {item.createdAt ? ` · ${formatLongDate(item.createdAt)}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground app-radius-md"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              {canUnlink && onUnlink && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive app-radius-md"
                  onClick={onUnlink}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-2 space-y-3">
          <div className="flex items-center justify-center h-28 bg-muted/30 border border-border/60 app-radius-md">
            <File className="h-10 w-10 text-muted-foreground/70" />
          </div>

          <IntentPrefetchLink
            href={item.href}
            className="inline-flex w-full items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium app-radius-md bg-border text-muted-foreground hover:brightness-150 transition-colors shadow-sm"
          >
            <span>Open PDF</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </IntentPrefetchLink>
        </div>
      </div>
    );
  }

  const linkObj = {
    url: item.url || item.href || fallbackUrl,
    platform: item.platform,
    metadata: item.metadata,
  };
  const isSocial = Boolean(
    item.platform && isSocialLinkPlatform(item.platform),
  );
  const authorName = item.metadata?.authorName?.trim();
  const authorHandle = formatHandle(item.metadata?.authorHandle);
  const postDate = item.metadata?.publishedAt ?? item.createdAt;

  const hasRealThumbnail = Boolean(
    item.metadata?.thumbnailUrl &&
      !isAvatarFallbackThumbnail(
        item.metadata.thumbnailUrl,
        item.metadata?.authorAvatarUrl,
      ),
  );

  return (
    <div className="flex flex-col w-[380px] max-w-[90vw] overflow-hidden app-radius-xl border border-border bg-card text-card-foreground">
      <div className="p-2 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          {isSocial ? (
            <div className="flex items-start gap-2 min-w-0">
              <LinkAuthorAvatar
                avatarUrl={item.metadata?.authorAvatarUrl}
                authorName={authorName || item.title}
                className="mt-0.5 h-9 w-9 shrink-0"
              />
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                  {authorName || item.title}
                </p>
                <span className="text-xs text-muted-foreground">
                  {authorHandle}
                  {authorHandle && postDate ? " · " : ""}
                  {postDate ? formatLongDateTime(postDate) : null}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 min-w-0">
              <LinkFaviconBadge
                url={linkObj.url}
                className="h-6 w-6 shrink-0 mt-0.5"
              />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                  {item.title}
                </p>
                {item.metadata?.siteName && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {item.metadata.siteName}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <a
              href={linkObj.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground app-radius-md hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground app-radius-md"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            {canUnlink && onUnlink && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive app-radius-md"
                onClick={onUnlink}
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-2 space-y-3">
        {item.metadata?.description && (
          <p className="line-clamp-3 text-xs text-muted-foreground/90 leading-relaxed whitespace-pre-wrap">
            {item.metadata.description}
          </p>
        )}

        {hasRealThumbnail ? (
          <ThumbnailFrame src={item.metadata?.thumbnailUrl}>
            <LinkThumbnail link={linkObj} showFaviconBadge />
          </ThumbnailFrame>
        ) : !isSocial ? (
          <LinkThumbnail link={linkObj} showFaviconBadge />
        ) : null}
      </div>
    </div>
  );
}
