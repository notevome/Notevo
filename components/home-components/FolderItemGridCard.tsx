"use client";

import { File as EmptyFileIcon, FileText, PenTool } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LinkAuthorAvatar,
  LinkFaviconBadge,
  LinkThumbnail,
  WhiteboardPreview,
  formatHandle,
  formatLongDate,
  formatLongDateTime,
  isAvatarFallbackThumbnail,
  isSocialLinkPlatform,
} from "@/components/FolderPreviewComponents";

export type FolderItemCardItem = {
  _id: string;
  kind: "note" | "document" | "link" | "pdf" | "whiteboard";
  title?: string;
  body?: string;
  preview?: string;
  snapshot?: string;
  url?: string;
  platform?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    description?: string;
    thumbnailUrl?: string;
    authorName?: string;
    authorHandle?: string;
    authorAvatarUrl?: string;
    publishedAt?: number;
    siteName?: string;
  };
};

export const folderItemGridCardClassName =
  "group relative flex cursor-pointer select-none flex-col overflow-hidden border border-border bg-card text-card-foreground transition-colors hover:border-muted-foreground/50 app-radius-lg";

function isEmptyWhiteboard(snapshot?: string) {
  if (!snapshot) return true;
  try {
    const scene = JSON.parse(snapshot);
    return (
      !Array.isArray(scene.elements) ||
      !scene.elements.some(
        (element: { isDeleted?: boolean }) => !element.isDeleted,
      )
    );
  } catch {
    return true;
  }
}

export function FolderItemGridCardContent({
  item,
  title,
  subtitle,
  action,
  renderText = (text) => text,
}: {
  item: FolderItemCardItem;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  renderText?: (text: string) => React.ReactNode;
}) {
  const link =
    item.kind === "link" && item.url
      ? (item as FolderItemCardItem & { url: string })
      : undefined;
  const isSocialLink = Boolean(link && isSocialLinkPlatform(link.platform));
  const authorName = link?.metadata?.authorName?.trim();
  const authorHandle = formatHandle(link?.metadata?.authorHandle);
  const postDate = link?.metadata?.publishedAt ?? link?.createdAt;
  const hasRealThumbnail = Boolean(
    link?.metadata?.thumbnailUrl &&
      !isAvatarFallbackThumbnail(
        link.metadata.thumbnailUrl,
        link.metadata.authorAvatarUrl,
      ),
  );
  const isEmptyDocument =
    (item.kind === "note" || item.kind === "document") &&
    subtitle === "No content yet. Click to start writing...";

  return (
    <>
      {isSocialLink && !hasRealThumbnail && link?.url && (
        <LinkFaviconBadge
          url={link.url}
          className="absolute bottom-2 right-2 z-10 h-7 w-7"
        />
      )}
      <CardHeader className="pb-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          {isSocialLink ? (
            <div className="flex min-w-0 items-start gap-2.5">
              <LinkAuthorAvatar
                avatarUrl={link?.metadata?.authorAvatarUrl}
                authorName={authorName || title}
                className="mt-0.5 h-9 w-9"
              />
              <div className="min-w-0">
                <CardTitle className="line-clamp-1 max-w-full break-words text-base font-semibold text-foreground [overflow-wrap:anywhere]">
                  {renderText(authorName || title)}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {authorHandle}
                  {authorHandle && postDate ? " · " : ""}
                  {postDate ? formatLongDateTime(postDate) : null}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-start gap-3">
              {item.kind === "whiteboard" ? (
                <PenTool className="mt-3 h-6 w-6 shrink-0 text-muted-foreground" />
              ) : item.kind !== "link" && item.kind !== "pdf" ? (
                isEmptyDocument ? (
                  <EmptyFileIcon className="mt-3 h-6 w-6 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="mt-3 h-6 w-6 shrink-0 text-muted-foreground" />
                )
              ) : null}
              <CardTitle className="max-w-full break-words text-lg font-semibold leading-[1.4rem] text-foreground [overflow-wrap:anywhere]">
                {renderText(title)}
                {item.kind !== "link" && (
                  <span className="mt-1.5 block text-xs text-muted-foreground">
                    Created {formatLongDate(item.createdAt)} · Last updated{" "}
                    {formatLongDate(item.updatedAt)}
                  </span>
                )}
              </CardTitle>
            </div>
          )}
          {action}
        </div>
      </CardHeader>
      <CardContent
        className={`flex flex-1 flex-col ${isSocialLink ? "gap-2" : ""}`}
      >
        {isSocialLink ? (
          <>
            <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm text-foreground/90">
              {renderText(link?.metadata?.description || "")}
            </p>
            {hasRealThumbnail && link?.url && (
              <LinkThumbnail link={link} showFaviconBadge />
            )}
          </>
        ) : (
          <>
            {item.kind === "whiteboard" &&
              !isEmptyWhiteboard(item.snapshot) && (
                <div className="min-h-0 w-full flex-1 overflow-hidden">
                  <WhiteboardPreview
                    snapshot={item.snapshot}
                    preview={item.preview}
                    fill
                  />
                </div>
              )}
            {item.kind === "link" && link?.url && (
              <div className="w-full shrink-0 overflow-hidden">
                <LinkThumbnail link={link} showFaviconBadge />
              </div>
            )}
            <p
              className={`line-clamp-2 text-sm text-muted-foreground ${subtitle ? "mt-2" : ""}`}
            >
              {renderText(subtitle || "")}
            </p>
          </>
        )}
      </CardContent>
    </>
  );
}
