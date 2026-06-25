import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error("User was deleted");
    }
    return user;
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    clearAvatar: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }

    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new Error("User was deleted");
    }

    const patch: {
      name?: string;
      image?: string | undefined;
    } = {};

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 1 || name.length > 80) {
        throw new Error("Name must be between 1 and 80 characters");
      }
      patch.name = name;
    }

    if (args.avatarStorageId !== undefined) {
      const imageUrl = await ctx.storage.getUrl(args.avatarStorageId);
      if (!imageUrl) {
        throw new Error("Avatar upload was not found");
      }
      patch.image = imageUrl;
    }

    if (args.clearAvatar) {
      patch.image = undefined;
    }

    if (Object.keys(patch).length === 0) {
      return user;
    }

    await ctx.db.patch(userId, patch);
    return await ctx.db.get(userId);
  },
});

export const users = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.neq(q.field("emailVerificationTime"), undefined),
          q.neq(q.field("image"), undefined),
        ),
      )
      .order("desc")
      .paginate(paginationOpts);
    return users;
  },
});
