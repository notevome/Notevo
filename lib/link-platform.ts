export type LinkPlatform =
  | "youtube"
  | "x"
  | "linkedin"
  | "instagram"
  | "generic";

export type LinkMetadata = {
  description?: string;
  thumbnailUrl?: string;
  authorName?: string;
  authorHandle?: string;
  publishedAt?: number;
  duration?: string;
  embedVideoId?: string;
  siteName?: string;
};

export function normalizeLinkUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function detectLinkPlatform(url: string): LinkPlatform {
  try {
    const parsed = new URL(normalizeLinkUrl(url));
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube";
    if (host === "x.com" || host === "twitter.com") return "x";
    if (host.endsWith("linkedin.com")) return "linkedin";
    if (host.endsWith("instagram.com")) return "instagram";
    return "generic";
  } catch {
    return "generic";
  }
}

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(normalizeLinkUrl(url));
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/watch")) {
        return parsed.searchParams.get("v");
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] ?? null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2] ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function youtubeThumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function platformLabel(platform: LinkPlatform): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "x":
      return "X";
    case "linkedin":
      return "LinkedIn";
    case "instagram":
      return "Instagram";
    default:
      return "Link";
  }
}

export function buildDefaultLinkTitle(
  url: string,
  platform: LinkPlatform,
  metadata?: LinkMetadata | null,
): string {
  if (metadata?.siteName && platform === "generic") {
    return metadata.siteName;
  }
  if (metadata?.authorName && platform !== "generic") {
    return metadata.authorName;
  }
  try {
    const parsed = new URL(normalizeLinkUrl(url));
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Saved link";
  }
}

export function enrichMetadataForPlatform(
  url: string,
  platform: LinkPlatform,
  metadata: LinkMetadata | undefined,
): LinkMetadata | undefined {
  if (platform !== "youtube") return metadata;
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return metadata;
  return {
    ...metadata,
    embedVideoId: videoId,
    thumbnailUrl: metadata?.thumbnailUrl ?? youtubeThumbnailUrl(videoId),
  };
}
