import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { linkPlatformValidator, linkMetadataFields } from "./linkValidators";
import {
  extractYoutubeVideoId,
  youtubeThumbnailUrl,
} from "../lib/link-platform";

const FETCH_TIMEOUT_MS = 12000;
const MAX_HTML_LENGTH = 800_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type FetchedLinkMetadata = {
  title?: string;
  metadata: {
    thumbnailUrl?: string;
    authorName?: string;
    authorHandle?: string;
    authorAvatarUrl?: string;
    publishedAt?: number;
    duration?: string;
    embedVideoId?: string;
    siteName?: string;
  };
};

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/json,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtmlEntities(input: string): string {
  if (!input) return input;
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return input
    .replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (match, code: string) => {
      if (code[0] === "#") {
        const n =
          code[1]?.toLowerCase() === "x"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        if (!Number.isNaN(n)) {
          try {
            return String.fromCodePoint(n);
          } catch {
            return match;
          }
        }
        return match;
      }
      return named[code] ?? match;
    })
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&");
}

function extractMeta(html: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${escapedKey}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${escapedKey}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return undefined;
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
}

async function fetchOgTags(url: string) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const rawHtml = await response.text();
  const html = rawHtml.slice(0, MAX_HTML_LENGTH);
  return {
    html,
    title:
      extractMeta(html, "og:title") ??
      extractMeta(html, "twitter:title") ??
      extractTitleTag(html),
    image: extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image"),
    siteName: extractMeta(html, "og:site_name"),
    author:
      extractMeta(html, "twitter:creator") ??
      extractMeta(html, "article:author") ??
      extractMeta(html, "author"),
  };
}

// Preferred path: YouTube's official Data API v3. Requires a
// YOUTUBE_API_KEY environment variable (free tier — set it in the Convex
// dashboard under Settings > Environment Variables, or `npx convex env set
// YOUTUBE_API_KEY <key>`). This is reliable because it's a normal signed
// API call, not scraping — Google does not consent-wall or CAPTCHA
// server-to-server API traffic the way it does plain HTML requests coming
// from a datacenter IP (which is exactly what makes the HTML-scrape
// fallback below unreliable in production).
async function fetchYoutubeChannelInfoViaApi(
  videoId: string,
): Promise<{ avatarUrl?: string; handle?: string; channelName?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return {};

  try {
    const videoRes = await fetchWithTimeout(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(
        videoId,
      )}&key=${apiKey}`,
    );
    if (!videoRes.ok) {
      console.error(
        `YouTube Data API videos.list failed: ${videoRes.status} ${await videoRes.text().catch(() => "")}`,
      );
      return {};
    }
    const videoData = (await videoRes.json()) as {
      items?: { snippet?: { channelId?: string } }[];
    };
    const channelId = videoData.items?.[0]?.snippet?.channelId;
    if (!channelId) return {};

    const channelRes = await fetchWithTimeout(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(
        channelId,
      )}&key=${apiKey}`,
    );
    if (!channelRes.ok) {
      console.error(
        `YouTube Data API channels.list failed: ${channelRes.status} ${await channelRes.text().catch(() => "")}`,
      );
      return {};
    }
    const channelData = (await channelRes.json()) as {
      items?: {
        snippet?: {
          title?: string;
          customUrl?: string;
          thumbnails?: {
            default?: { url?: string };
            medium?: { url?: string };
          };
        };
      }[];
    };
    const snippet = channelData.items?.[0]?.snippet;
    if (!snippet) return {};

    const rawHandle = snippet.customUrl;
    return {
      avatarUrl:
        snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url,
      handle: rawHandle
        ? rawHandle.startsWith("@")
          ? rawHandle
          : `@${rawHandle}`
        : undefined,
      channelName: snippet.title,
    };
  } catch (error) {
    console.error("YouTube Data API channel lookup failed:", error);
    return {};
  }
}

// Fallback for when YOUTUBE_API_KEY isn't set: scrape the channel page's
// <meta> tags / canonical link the same way `fetchOgTags` does for other
// platforms. Less reliable than the Data API above — Google frequently
// serves a consent/CAPTCHA page instead of the real HTML to non-browser
// traffic from server IPs, so this may silently return nothing.
async function fetchYoutubeChannelExtras(
  channelUrl: string,
): Promise<{ avatarUrl?: string; handle?: string }> {
  try {
    const response = await fetchWithTimeout(channelUrl, {
      headers: {
        // Bypasses the EU cookie-consent interstitial that would otherwise
        // replace the real channel page with a consent screen.
        Cookie: "CONSENT=YES+1",
      },
    });
    if (!response.ok) return {};

    const rawHtml = await response.text();
    const html = rawHtml.slice(0, MAX_HTML_LENGTH);

    const avatarUrl =
      extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image");

    let handle: string | undefined;
    const canonicalMatch = html.match(
      /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
    );
    if (canonicalMatch?.[1]) {
      try {
        const canonicalPath = new URL(canonicalMatch[1]).pathname;
        const segment = canonicalPath.split("/").filter(Boolean).pop();
        if (segment?.startsWith("@")) handle = segment;
      } catch {
        // Malformed canonical URL — just skip the handle.
      }
    }

    return { avatarUrl, handle };
  } catch (error) {
    console.error("YouTube channel page fetch failed:", error);
    return {};
  }
}

async function fetchYoutubeMetadata(url: string): Promise<FetchedLinkMetadata> {
  const videoId = extractYoutubeVideoId(url) ?? undefined;

  let title: string | undefined;
  let authorName: string | undefined;
  let authorUrl: string | undefined;
  let thumbnailUrl: string | undefined = videoId
    ? youtubeThumbnailUrl(videoId)
    : undefined;
  let publishedAt: number | undefined;
  let duration: string | undefined;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      url,
    )}&format=json`;
    const response = await fetchWithTimeout(oembedUrl);
    if (response.ok) {
      const data = (await response.json()) as {
        title?: string;
        author_name?: string;
        author_url?: string;
        thumbnail_url?: string;
      };
      title = data.title;
      authorName = data.author_name;
      authorUrl = data.author_url;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    }
  } catch (error) {
    console.error("YouTube oEmbed failed:", error);
  }

  let authorHandle: string | undefined;
  let authorAvatarUrl: string | undefined;

  if (videoId) {
    const apiInfo = await fetchYoutubeChannelInfoViaApi(videoId);
    authorAvatarUrl = apiInfo.avatarUrl;
    authorHandle = apiInfo.handle;
    if (!authorName && apiInfo.channelName) authorName = apiInfo.channelName;
  }

  // Only fall back to scraping for whatever the API didn't cover (e.g. no
  // API key configured, or the video lookup failed for some reason).
  if ((!authorAvatarUrl || !authorHandle) && authorUrl) {
    const extras = await fetchYoutubeChannelExtras(authorUrl);
    authorAvatarUrl = authorAvatarUrl ?? extras.avatarUrl;
    authorHandle = authorHandle ?? extras.handle;
  }

  if (!videoId) {
    return {
      title,
      metadata: {
        thumbnailUrl,
        authorName,
        authorHandle,
        authorAvatarUrl,
        siteName: "YouTube",
      },
    };
  }
  return {
    title,
    metadata: {
      thumbnailUrl,
      authorName,
      authorHandle,
      authorAvatarUrl,
      publishedAt,
      duration,
      siteName: "YouTube",
      embedVideoId: videoId,
    },
  };
}

async function fetchXMetadata(url: string): Promise<FetchedLinkMetadata> {
  let authorName: string | undefined;
  let authorHandle: string | undefined;
  let thumbnailUrl: string | undefined;
  let authorAvatarUrl: string | undefined;

  // A profile link (x.com/username) has exactly one path segment; a tweet
  // permalink (x.com/username/status/123) has more. og:image only reflects
  // the account's own picture for the former — for a tweet it's the
  // attached media/card image, which isn't a safe stand-in for an avatar.
  const isProfileUrl = (() => {
    try {
      const path = new URL(url).pathname.replace(/^\/|\/$/g, "");
      return Boolean(path) && !path.includes("/");
    } catch {
      return false;
    }
  })();

  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(
      url,
    )}&omit_script=true`;
    const response = await fetchWithTimeout(oembedUrl);
    if (response.ok) {
      const data = (await response.json()) as {
        author_name?: string;
        author_url?: string;
        html?: string;
      };
      authorName = data.author_name;
      authorHandle = data.author_url?.split("/").filter(Boolean).pop();
    }
  } catch (error) {
    console.error("X oEmbed failed:", error);
  }

  try {
    const og = await fetchOgTags(url);
    thumbnailUrl = og.image;
    if (isProfileUrl) authorAvatarUrl = og.image;
    if (!authorName && og.author) authorName = og.author.replace(/^@/, "");
  } catch (error) {
    console.error("X OG failed:", error);
  }

  return {
    title: authorName ? `${authorName} on X` : undefined,
    metadata: {
      thumbnailUrl,
      authorAvatarUrl,
      authorName,
      authorHandle,
      siteName: "X",
    },
  };
}

async function fetchInstagramMetadata(
  url: string,
): Promise<FetchedLinkMetadata> {
  try {
    const og = await fetchOgTags(url);
    let authorName: string | undefined;
    let authorHandle: string | undefined;
    if (og.title) {
      const titleDecoded = decodeHtmlEntities(og.title);
      const onIg = titleDecoded.match(
        /^(.+?)\s+on\s+Instagram\s*:?\s*[“"]?(.*?)[”"]?$/i,
      );
      if (onIg) {
        authorName = onIg[1].trim();
        authorHandle = onIg[1].trim();
      }
    }

    return {
      title: og.title ? decodeHtmlEntities(og.title) : undefined,
      metadata: {
        thumbnailUrl: og.image,
        authorName,
        authorHandle,
        siteName: og.siteName ?? "Instagram",
      },
    };
  } catch (error) {
    console.error("Instagram OG failed:", error);
    return { metadata: { siteName: "Instagram" } };
  }
}

async function fetchLinkedInMetadata(
  url: string,
): Promise<FetchedLinkMetadata> {
  try {
    const og = await fetchOgTags(url);
    return {
      title: og.title ? decodeHtmlEntities(og.title) : undefined,
      metadata: {
        thumbnailUrl: og.image,
        authorName: og.author,
        siteName: og.siteName ?? "LinkedIn",
      },
    };
  } catch (error) {
    console.error("LinkedIn OG failed:", error);
    return { metadata: { siteName: "LinkedIn" } };
  }
}

async function fetchGenericOgMetadata(
  url: string,
): Promise<FetchedLinkMetadata> {
  const og = await fetchOgTags(url);
  return {
    title: og.title ? decodeHtmlEntities(og.title) : undefined,
    metadata: {
      thumbnailUrl: og.image,
      authorName: og.author,
      siteName: og.siteName,
    },
  };
}

export const checkUrlEmbeddable = action({
  args: { url: v.string() },
  returns: v.object({ embeddable: v.boolean() }),
  handler: async (_ctx, args) => {
    try {
      const parsed = new URL(args.url);
      if (parsed.protocol !== "https:") {
        return { embeddable: false };
      }

      const response = await fetchWithTimeout(args.url, { method: "GET" });
      response.body?.cancel?.();

      const xfo = response.headers.get("x-frame-options")?.toLowerCase();
      if (xfo && (xfo.includes("deny") || xfo.includes("sameorigin"))) {
        // SAMEORIGIN blocks us too since we're a different origin.
        return { embeddable: false };
      }

      const csp = response.headers.get("content-security-policy");
      if (csp) {
        const match = csp.match(/frame-ancestors\s+([^;]+)/i);
        if (match) {
          const sources = match[1].trim();
          if (sources === "'none'" || !sources.includes("*")) {
            return { embeddable: false };
          }
        }
      }

      return { embeddable: true };
    } catch (error) {
      console.error("checkUrlEmbeddable failed:", error);
      return { embeddable: false };
    }
  },
});

export const fetchLinkMetadata = action({
  args: {
    url: v.string(),
    platform: linkPlatformValidator,
  },
  returns: v.object({
    title: v.optional(v.string()),
    metadata: v.object(linkMetadataFields),
  }),
  handler: async (_ctx, args): Promise<FetchedLinkMetadata> => {
    try {
      switch (args.platform) {
        case "youtube":
          return await fetchYoutubeMetadata(args.url);
        case "x":
          return await fetchXMetadata(args.url);
        case "instagram":
          return await fetchInstagramMetadata(args.url);
        case "linkedin":
          return await fetchLinkedInMetadata(args.url);
        case "generic":
        default:
          return await fetchGenericOgMetadata(args.url);
      }
    } catch (error) {
      console.error("fetchLinkMetadata failed:", error);
      return { metadata: {} };
    }
  },
});

// One-time backfill for YouTube links saved before channel avatar/handle
// lookup existed. Re-fetches each one via fetchYoutubeMetadata (which now
// prefers the YouTube Data API when YOUTUBE_API_KEY is set) and patches in
// whatever is missing. Safe to re-run — it only touches links that are
// still missing an avatar or handle, and skips a link entirely if nothing
// new was found for it.
export const backfillYoutubeChannelInfo = action({
  args: {},
  returns: v.object({
    scanned: v.number(),
    updated: v.number(),
    usingApiKey: v.boolean(),
  }),
  handler: async (
    ctx,
  ): Promise<{ scanned: number; updated: number; usingApiKey: boolean }> => {
    const usingApiKey = Boolean(process.env.YOUTUBE_API_KEY);
    if (!usingApiKey) {
      console.warn(
        "YOUTUBE_API_KEY is not set — falling back to HTML scraping, " +
          "which YouTube frequently blocks from server IPs. Results may " +
          "come back mostly empty. Set YOUTUBE_API_KEY in the Convex " +
          "dashboard (Settings > Environment Variables) for reliable results.",
      );
    }

    let cursor: string | null = null;
    let scanned = 0;
    let updated = 0;

    while (true) {
      const page: any = await ctx.runQuery(
        internal.links.internalGetYoutubeLinksMissingChannelInfo,
        { paginationOpts: { numItems: 25, cursor } },
      );

      for (const link of page.page) {
        scanned += 1;
        try {
          const result = await fetchYoutubeMetadata(link.url);
          const { authorHandle, authorAvatarUrl } = result.metadata;
          if (authorHandle || authorAvatarUrl) {
            await ctx.runMutation(internal.links.internalUpdateLinkMetadata, {
              _id: link._id,
              metadata: {
                authorHandle: authorHandle ?? link.metadata?.authorHandle,
                authorAvatarUrl:
                  authorAvatarUrl ?? link.metadata?.authorAvatarUrl,
              },
            });
            updated += 1;
          }
        } catch (error) {
          console.error(`Backfill failed for link ${link._id}:`, error);
        }
      }

      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    return { scanned, updated, usingApiKey };
  },
});
