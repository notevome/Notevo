import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
    workingSpaceId: v.id("workingSpaces"),
    notesTableId: v.id("notesTables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const [workspace, table] = await Promise.all([
      ctx.db.get(args.workingSpaceId),
      ctx.db.get(args.notesTableId),
    ]);
    if (!workspace || workspace.userId !== userId) {
      throw new ConvexError("Workspace not found or not authorized");
    }
    if (!table || table.workingSpaceId !== args.workingSpaceId) {
      throw new ConvexError("Table does not belong to the provided workspace");
    }

    const now = Date.now();
    return await ctx.db.insert("whiteboards", {
      userId,
      workingSpaceId: args.workingSpaceId,
      notesTableId: args.notesTableId,
      title: args.title.trim() || "Untitled whiteboard",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getWhiteboardsByTableId = query({
  args: { notesTableId: v.id("notesTables"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const table = await ctx.db.get(args.notesTableId);
    const workspace = table && (await ctx.db.get(table.workingSpaceId));
    if (!table || !workspace || workspace.userId !== userId) {
      throw new ConvexError("Table not found or not authorized");
    }
    return await ctx.db
      .query("whiteboards")
      .withIndex("by_notesTableId", (q) => q.eq("notesTableId", args.notesTableId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getWhiteboardById = query({
  args: { _id: v.id("whiteboards") },
  handler: async (ctx, args) => await requireOwner(ctx, args._id),
});

export const updateWhiteboard = mutation({
  args: {
    _id: v.id("whiteboards"),
    title: v.optional(v.string()),
    snapshot: v.optional(v.string()),
    preview: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const whiteboard = await requireOwner(ctx, args._id);
    await ctx.db.patch(args._id, {
      title: args.title === undefined ? whiteboard.title : args.title.trim() || "Untitled whiteboard",
      snapshot: args.snapshot === undefined ? whiteboard.snapshot : args.snapshot,
      preview: args.preview === undefined ? whiteboard.preview : args.preview,
      updatedAt: Date.now(),
    });
  },
});

export const deleteWhiteboard = mutation({
  args: { _id: v.id("whiteboards") },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args._id);
    await ctx.db.delete(args._id);
  },
});
