import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

const RECENT_ITEM_LIMIT = 20;

/**
 * The home carousel needs one chronology across every workspace item type.
 * Fetching the newest `RECENT_ITEM_LIMIT` from each type guarantees that the
 * final combined list contains the newest `RECENT_ITEM_LIMIT` overall.
 */
export const getRecentItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const [documents, links, pdfs, whiteboards] = await Promise.all([
      ctx.db
        .query("documents")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(RECENT_ITEM_LIMIT),
      ctx.db
        .query("links")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(RECENT_ITEM_LIMIT),
      ctx.db
        .query("pdfs")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(RECENT_ITEM_LIMIT),
      ctx.db
        .query("whiteboards")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(RECENT_ITEM_LIMIT),
    ]);

    return [
      ...documents.map((item) => ({ ...item, kind: "document" as const })),
      ...links.map((item) => ({ ...item, kind: "link" as const })),
      ...pdfs.map((item) => ({ ...item, kind: "pdf" as const })),
      ...whiteboards.map((item) => ({ ...item, kind: "whiteboard" as const })),
    ]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, RECENT_ITEM_LIMIT);
  },
});
