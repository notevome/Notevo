import { v } from "convex/values";

export const linkPlatformValidator = v.union(
  v.literal("youtube"),
  v.literal("x"),
  v.literal("linkedin"),
  v.literal("instagram"),
  v.literal("generic"),
);

export const linkMetadataFields = {
  description: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  authorName: v.optional(v.string()),
  authorHandle: v.optional(v.string()),
  authorAvatarUrl: v.optional(v.string()),
  publishedAt: v.optional(v.number()),
  viewCount: v.optional(v.string()),
  likeCount: v.optional(v.number()),
  repostCount: v.optional(v.number()),
  commentCount: v.optional(v.number()),
  duration: v.optional(v.string()),
  embedVideoId: v.optional(v.string()),
  siteName: v.optional(v.string()),
};

export const linkMetadataValidator = v.optional(v.object(linkMetadataFields));
