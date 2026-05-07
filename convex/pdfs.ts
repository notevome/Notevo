import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const sendPdf = mutation({
  args: {
    storageId: v.id("_storage"),
    title: v.optional(v.string()),
    workingSpaceId: v.optional(v.id("workingSpaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    await ctx.db.insert("pdfs", {
      storageId: args.storageId,
      userId,
      workingSpaceId: args.workingSpaceId,
      title: args.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
