import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { linkMetadataValidator, linkPlatformValidator } from "./linkValidators";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";

async function assertTableAccess(
  ctx: { db: any },
  userId: string,
  tableId: string | undefined,
  folderId: string | undefined,
) {
  if (folderId) {
    const folder = (await ctx.db.get(folderId)) as Doc<"folders"> | null;
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found or not authorized");
    }
  }

  if (tableId) {
    const table = (await ctx.db.get(tableId)) as Doc<"tables"> | null;
    if (!table) {
      throw new Error("Table not found");
    }

    if (table.folderId) {
      const folder = (await ctx.db.get(table.folderId)) as Doc<"folders"> | null;
      if (!folder || folder.userId !== userId) {
        throw new Error("Folder not found or not authorized");
      }
    }

    if (folderId && table.folderId && table.folderId !== folderId) {
      throw new Error("Table does not belong to the provided folder");
    }
  }
}

export const createLink = mutation({
  args: {
    url: v.string(),
    platform: linkPlatformValidator,
    metadata: linkMetadataValidator,
    title: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    tableId: v.optional(v.id("tables")),
    workingSpaceId: v.optional(v.any()),
    notesTableId: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const folderId = (args.folderId ?? args.workingSpaceId) as any;
    const tableId = (args.tableId ?? args.notesTableId) as any;

    await assertTableAccess(ctx, userId, tableId, folderId);

    const now = Date.now();
    return await ctx.db.insert("links", {
      url: args.url,
      platform: args.platform,
      metadata: args.metadata,
      title: args.title,
      userId,
      folderId,
      tableId,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getLinksByTableId = query({
  args: {
    tableId: v.optional(v.id("tables")),
    notesTableId: v.optional(v.any()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const tableId = (args.tableId ?? args.notesTableId) as any;
    const table = (await ctx.db.get(tableId)) as Doc<"tables"> | null;
    if (!table) {
      throw new Error("Table not found");
    }

    if (table.folderId) {
      const folder = (await ctx.db.get(table.folderId)) as Doc<"folders"> | null;
      if (!folder || folder.userId !== userId) {
        throw new Error("Folder not found or not authorized");
      }
    }

    return await ctx.db
      .query("links")
      .withIndex("by_tableId", (q) => q.eq("tableId", tableId))
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

    const result = await ctx.db
      .query("links")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("favorite"), true))
      .order("desc")
      .paginate(paginationOpts);

    const validPage = (
      await Promise.all(
        result.page.map(async (link) => {
          if (link.folderId) {
            const folder = await ctx.db.get(link.folderId);
            if (!folder) return null;
          }
          if (link.tableId) {
            const table = await ctx.db.get(link.tableId);
            if (!table) return null;
          }
          return link;
        }),
      )
    ).filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      ...result,
      page: validPage,
    };
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

export const internalGetLinksMissingChannelInfo = internalQuery({
  args: {
    platform: linkPlatformValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("links")
      .filter((q) => q.eq(q.field("platform"), args.platform))
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

export const internalGetLinksByPlatform = internalQuery({
  args: {
    platform: linkPlatformValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("links")
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .paginate(args.paginationOpts);
  },
});

export const moveLink = mutation({
  args: {
    _id: v.id("links"),
    targetFolderId: v.optional(v.id("folders")),
    targetTableId: v.optional(v.id("tables")),
    targetWorkingSpaceId: v.optional(v.any()),
    targetNotesTableId: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id } = args;
    const targetFolderId = (args.targetFolderId ?? args.targetWorkingSpaceId) as any;
    const targetTableId = (args.targetTableId ?? args.targetNotesTableId) as any;

    const link = await ctx.db.get(_id);
    if (!link) {
      throw new ConvexError("Link not found");
    }

    if (link.userId !== userId) {
      throw new ConvexError("Not authorized to move this link");
    }

    const targetFolder = (await ctx.db.get(targetFolderId)) as Doc<"folders"> | null;
    if (!targetFolder || targetFolder.userId !== userId) {
      throw new ConvexError("Target folder not found or unauthorized");
    }

    const targetTable = (await ctx.db.get(targetTableId)) as Doc<"tables"> | null;
    if (!targetTable) {
      throw new ConvexError("Target table not found");
    }
    if (targetTable.folderId && targetTable.folderId !== targetFolderId) {
      throw new ConvexError("Target table does not belong to this folder");
    }

    await ctx.db.patch(_id, {
      folderId: targetFolderId,
      tableId: targetTableId,
      updatedAt: Date.now(),
    });

    return {
      linkId: _id,
      folderId: targetFolderId,
      workingSpaceId: targetFolderId,
      tableId: targetTableId,
      notesTableId: targetTableId,
      title: link.title,
    };
  },
});
