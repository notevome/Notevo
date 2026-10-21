import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

async function requireOwner(ctx: any, whiteboardId: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");

  const whiteboard = await ctx.db.get(whiteboardId);
  if (!whiteboard || whiteboard.userId !== userId) {
    throw new ConvexError("Whiteboard not found or not authorized");
  }
  return whiteboard;
}

export const createWhiteboard = mutation({
  args: {
    title: v.string(),
    folderId: v.optional(v.id("folders")),
    tableId: v.optional(v.id("tables")),
    workingSpaceId: v.optional(v.any()),
    notesTableId: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const folderId = (args.folderId ?? args.workingSpaceId) as any;
    const tableId = (args.tableId ?? args.notesTableId) as any;

    const [folder, table] = (await Promise.all([
      ctx.db.get(folderId),
      ctx.db.get(tableId),
    ])) as [Doc<"folders"> | null, Doc<"tables"> | null];
    if (!folder || folder.userId !== userId) {
      throw new ConvexError("Folder not found or not authorized");
    }
    if (!table || (table.folderId && table.folderId !== folderId)) {
      throw new ConvexError("Table does not belong to the provided folder");
    }

    const now = Date.now();
    return await ctx.db.insert("whiteboards", {
      userId,
      folderId,
      tableId,
      title: args.title.trim() || "Untitled whiteboard",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getWhiteboardsByTableId = query({
  args: {
    tableId: v.optional(v.id("tables")),
    notesTableId: v.optional(v.any()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const tableId = (args.tableId ?? args.notesTableId) as any;
    const table = (await ctx.db.get(tableId)) as Doc<"tables"> | null;
    if (table?.folderId) {
      const folder = (await ctx.db.get(table.folderId)) as Doc<"folders"> | null;
      if (!folder || folder.userId !== userId) {
        throw new ConvexError("Table not found or not authorized");
      }
    }
    return await ctx.db
      .query("whiteboards")
      .withIndex("by_tableId", (q) => q.eq("tableId", tableId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getFavWhiteboards = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const result = await ctx.db
      .query("whiteboards")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("favorite"), true))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((wb) => {
        const folderId = wb.folderId ?? (wb as any).workingSpaceId;
        const tableId = wb.tableId ?? (wb as any).notesTableId;
        return {
          ...wb,
          folderId,
          workingSpaceId: folderId,
          tableId,
          notesTableId: tableId,
        };
      }),
    };
  },
});

export const getWhiteboardById = query({
  args: { _id: v.id("whiteboards") },
  handler: async (ctx, args) => {
    const wb = await requireOwner(ctx, args._id);
    const folderId = wb.folderId ?? (wb as any).workingSpaceId;
    const tableId = wb.tableId ?? (wb as any).notesTableId;
    return {
      ...wb,
      folderId,
      workingSpaceId: folderId,
      tableId,
      notesTableId: tableId,
    };
  },
});

export const updateWhiteboard = mutation({
  args: {
    _id: v.id("whiteboards"),
    title: v.optional(v.string()),
    snapshot: v.optional(v.string()),
    preview: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const whiteboard = await requireOwner(ctx, args._id);
    await ctx.db.patch(args._id, {
      title:
        args.title === undefined
          ? whiteboard.title
          : args.title.trim() || "Untitled whiteboard",
      snapshot:
        args.snapshot === undefined ? whiteboard.snapshot : args.snapshot,
      preview: args.preview === undefined ? whiteboard.preview : args.preview,
      favorite:
        args.favorite === undefined ? whiteboard.favorite : args.favorite,
      updatedAt: Date.now(),
    });
  },
});

export const moveWhiteboard = mutation({
  args: {
    _id: v.id("whiteboards"),
    targetFolderId: v.optional(v.id("folders")),
    targetTableId: v.optional(v.id("tables")),
    targetWorkingSpaceId: v.optional(v.any()),
    targetNotesTableId: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args._id);
    const userId = await getAuthUserId(ctx);
    const targetFolderId = (args.targetFolderId ?? args.targetWorkingSpaceId) as any;
    const targetTableId = (args.targetTableId ?? args.targetNotesTableId) as any;

    const [folder, table] = (await Promise.all([
      ctx.db.get(targetFolderId),
      ctx.db.get(targetTableId),
    ])) as [Doc<"folders"> | null, Doc<"tables"> | null];
    if (!folder || folder.userId !== userId) {
      throw new ConvexError("Target folder not found or not authorized");
    }
    if (!table || (table.folderId && table.folderId !== targetFolderId)) {
      throw new ConvexError("Target table does not belong to this folder");
    }
    await ctx.db.patch(args._id, {
      folderId: targetFolderId,
      tableId: targetTableId,
      updatedAt: Date.now(),
    });
    return { folderId: targetFolderId, workingSpaceId: targetFolderId };
  },
});

export const deleteWhiteboard = mutation({
  args: { _id: v.id("whiteboards") },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args._id);
    await ctx.db.delete(args._id);
  },
});
