import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { linkMetadataValidator, linkPlatformValidator } from "./linkValidators";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";

async function assertTableAccess(
  ctx: { db: any },
  userId: string,
  notesTableId: string | undefined,
  workingSpaceId: string | undefined,
) {
  if (workingSpaceId) {
    const workspace = await ctx.db.get(workingSpaceId);
    if (!workspace || workspace.userId !== userId) {
      throw new Error("Workspace not found or not authorized");
    }
  }

  if (notesTableId) {
    const table = await ctx.db.get(notesTableId);
    if (!table) {
      throw new Error("Table not found");
    }

    const workspace = await ctx.db.get(table.workingSpaceId);
    if (!workspace || workspace.userId !== userId) {
      throw new Error("Workspace not found or not authorized");
    }

    if (workingSpaceId && table.workingSpaceId !== workingSpaceId) {
      throw new Error("Table does not belong to the provided workspace");
    }
  }
}

export const createLink = mutation({
  args: {
    url: v.string(),
    platform: linkPlatformValidator,
    metadata: linkMetadataValidator,
    title: v.optional(v.string()),
    workingSpaceId: v.optional(v.id("workingSpaces")),
    notesTableId: v.optional(v.id("notesTables")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    await assertTableAccess(
      ctx,
      userId,
      args.notesTableId,
      args.workingSpaceId,
    );

    const now = Date.now();
    return await ctx.db.insert("links", {
      url: args.url,
      platform: args.platform,
      metadata: args.metadata,
      title: args.title,
      userId,
      workingSpaceId: args.workingSpaceId,
      notesTableId: args.notesTableId,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getLinksByTableId = query({
  args: {
    notesTableId: v.id("notesTables"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const table = await ctx.db.get(args.notesTableId);
    if (!table) {
      throw new Error("Table not found");
    }

    const workspace = await ctx.db.get(table.workingSpaceId);
    if (!workspace || workspace.userId !== userId) {
      throw new Error("Workspace not found or not authorized");
    }

    return await ctx.db
      .query("links")
      .withIndex("by_notesTableId", (q) =>
        q.eq("notesTableId", args.notesTableId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getLinkById = query({
  args: {
    _id: v.id("links"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const link = await ctx.db.get(args._id);
    if (!link || link.userId !== userId) {
      throw new ConvexError("Link not found or not authorized");
    }

    return link;
  },
});

export const getFavLinks = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    return await ctx.db
      .query("links")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("favorite"), true))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const updateLink = mutation({
  args: {
    _id: v.id("links"),
    favorite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const link = await ctx.db.get(args._id);
    if (!link || link.userId !== userId) {
      throw new ConvexError("Link not found or not authorized");
    }

    await ctx.db.patch(args._id, {
      favorite: args.favorite ?? link.favorite,
    });
  },
});

export const deleteLink = mutation({
  args: {
    _id: v.id("links"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const link = await ctx.db.get(args._id);
    if (!link || link.userId !== userId) {
      throw new ConvexError("Link not found or not authorized");
    }

    await ctx.db.delete(args._id);
    return args._id;
  },
});
// Internal — used by the one-time backfillYoutubeChannelInfo admin action,
// not exposed to the client. Runs without a user session (the dashboard's
// "Run action" / a CLI-triggered run has no signed-in user attached), and
// covers links for every user since it's a maintenance task, not a
// per-user request.
export const internalUpdateLinkMetadata = internalMutation({
  args: {
    _id: v.id("links"),
    title: v.optional(v.string()),
    metadata: linkMetadataValidator,
  },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args._id);
    if (!link) return;

    await ctx.db.patch(args._id, {
      title: args.title ?? link.title,
      metadata: {
        ...link.metadata,
        ...args.metadata,
      },
      updatedAt: Date.now(),
    });
  },
});

// Internal — same rationale as internalUpdateLinkMetadata above. Scans
// across all users' YouTube links (not scoped to a single userId) for
// links still missing a channel avatar/handle.
export const internalGetYoutubeLinksMissingChannelInfo = internalQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("links")
      .filter((q) => q.eq(q.field("platform"), "youtube"))
      .paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.filter(
        (link) =>
          !link.metadata?.authorAvatarUrl || !link.metadata?.authorHandle,
      ),
    };
  },
});

export const moveLink = mutation({
  args: {
    _id: v.id("links"),
    targetWorkingSpaceId: v.id("workingSpaces"),
    targetNotesTableId: v.id("notesTables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id, targetWorkingSpaceId, targetNotesTableId } = args;

    const link = await ctx.db.get(_id);
    if (!link) {
      throw new ConvexError("Link not found");
    }

    if (link.userId !== userId) {
      throw new ConvexError("Not authorized to move this link");
    }

    const targetWorkspace = await ctx.db.get(targetWorkingSpaceId);
    if (!targetWorkspace) {
      throw new ConvexError("Target workspace not found");
    }
    if (targetWorkspace.userId !== userId) {
      throw new ConvexError("Not authorized to use this workspace");
    }

    const targetTable = await ctx.db.get(targetNotesTableId);
    if (!targetTable) {
      throw new ConvexError("Target table not found");
    }
    if (targetTable.workingSpaceId !== targetWorkingSpaceId) {
      throw new ConvexError("Target table does not belong to this workspace");
    }

    await ctx.db.patch(_id, {
      workingSpaceId: targetWorkingSpaceId,
      notesTableId: targetNotesTableId,
      updatedAt: Date.now(),
    });

    return {
      linkId: _id,
      workingSpaceId: targetWorkingSpaceId,
      notesTableId: targetNotesTableId,
      title: link.title,
    };
  },
});
