import { describe, expect, it } from "vitest";
import {
  buildDefaultLinkTitle,
  detectLinkPlatform,
  enrichMetadataForPlatform,
  extractYoutubeVideoId,
  normalizeLinkUrl,
  platformLabel,
  youtubeThumbnailUrl,
} from "./link-platform";

describe("normalizeLinkUrl", () => {
  it.each([
    ["example.com", "https://example.com"],
    [" https://example.com/path ", "https://example.com/path"],
    ["http://example.com", "http://example.com"],
    ["", ""],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeLinkUrl(input)).toBe(expected);
  });
});

describe("detectLinkPlatform", () => {
  it.each([
    ["https://youtu.be/abc123", "youtube"],
    ["youtube.com/watch?v=abc123", "youtube"],
    ["https://x.com/notevo", "x"],
    ["https://twitter.com/notevo", "x"],
    ["https://www.linkedin.com/company/notevo", "linkedin"],
    ["https://instagram.com/notevo", "instagram"],
    ["https://example.com/article", "generic"],
    ["not a url", "generic"],
  ] as const)("detects %s as %s", (url, platform) => {
    expect(detectLinkPlatform(url)).toBe(platform);
  });
});

describe("youtube helpers", () => {
  it.each([
    ["https://youtu.be/video-id", "video-id"],
    ["https://www.youtube.com/watch?v=watch-id", "watch-id"],
    ["https://youtube.com/embed/embed-id", "embed-id"],
    ["https://youtube.com/shorts/short-id", "short-id"],
    ["https://example.com/watch?v=nope", null],
    ["not a url", null],
  ])("extracts YouTube video ids from %s", (url, expected) => {
    expect(extractYoutubeVideoId(url)).toBe(expected);
  });

  it("builds a high quality YouTube thumbnail URL", () => {
    expect(youtubeThumbnailUrl("abc123")).toBe(
      "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    );
  });

  it("adds YouTube embed metadata without overwriting an existing thumbnail", () => {
    expect(enrichMetadataForPlatform("youtu.be/abc123", "youtube", {})).toEqual({
      embedVideoId: "abc123",
      thumbnailUrl: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    });

    expect(
      enrichMetadataForPlatform("youtu.be/abc123", "youtube", {
        thumbnailUrl: "https://cdn.example.com/thumb.png",
      }),
    ).toEqual({
      embedVideoId: "abc123",
      thumbnailUrl: "https://cdn.example.com/thumb.png",
    });
  });

  it("leaves non-YouTube metadata unchanged", () => {
    const metadata = { siteName: "Example" };
    expect(enrichMetadataForPlatform("https://example.com", "generic", metadata)).toBe(
      metadata,
    );
  });
});

describe("link display labels", () => {
  it.each([
    ["youtube", "YouTube"],
    ["x", "X"],
    ["linkedin", "LinkedIn"],
    ["instagram", "Instagram"],
    ["generic", "Link"],
  ] as const)("labels %s links", (platform, label) => {
    expect(platformLabel(platform)).toBe(label);
  });

  it("prefers metadata when building default link titles", () => {
    expect(
      buildDefaultLinkTitle("https://example.com/post", "generic", {
        siteName: "Example News",
      }),
    ).toBe("Example News");
    expect(
      buildDefaultLinkTitle("https://youtube.com/watch?v=abc", "youtube", {
        authorName: "Notevo",
      }),
    ).toBe("Notevo");
  });

  it("falls back to a hostname or generic title", () => {
    expect(buildDefaultLinkTitle("https://www.example.com/post", "generic")).toBe(
      "example.com",
    );
    expect(buildDefaultLinkTitle("not a url", "generic")).toBe("Saved link");
  });
});
