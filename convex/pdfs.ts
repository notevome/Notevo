import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

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
    notesTableId: v.optional(v.id("notesTables")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    if (args.workingSpaceId) {
      const workspace = await ctx.db.get(args.workingSpaceId);
      if (!workspace || workspace.userId !== userId) {
        throw new Error("Workspace not found or not authorized");
      }
    }

    if (args.notesTableId) {
      const table = await ctx.db.get(args.notesTableId);
      if (!table) {
        throw new Error("Table not found");
      }

      if (args.workingSpaceId && table.workingSpaceId !== args.workingSpaceId) {
        throw new Error("Table does not belong to the provided workspace");
      }
    }

    const pdfId = await ctx.db.insert("pdfs", {
      storageId: args.storageId,
      userId,
      workingSpaceId: args.workingSpaceId,
      notesTableId: args.notesTableId,
      title: args.title,
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return pdfId;
  },
});

export const getPdfsByTableId = query({
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

    const result = await ctx.db
      .query("pdfs")
      .withIndex("by_notesTableId", (q) =>
        q.eq("notesTableId", args.notesTableId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (pdf) => ({
        ...pdf,
        fileUrl: await ctx.storage.getUrl(pdf.storageId),
      })),
    );

    return { ...result, page };
  },
});

export const getPdfById = query({
  args: {
    _id: v.id("pdfs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const pdf = await ctx.db.get(args._id);
    if (!pdf || pdf.userId !== userId) {
      throw new Error("PDF not found or not authorized");
    }

    return {
      ...pdf,
      fileUrl: await ctx.storage.getUrl(pdf.storageId),
    };
  },
});

export const getFavPdfs = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    return await ctx.db
      .query("pdfs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("favorite"), true))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const updatePdf = mutation({
  args: {
    _id: v.id("pdfs"),
    title: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const pdf = await ctx.db.get(args._id);
    if (!pdf || pdf.userId !== userId) {
      throw new Error("PDF not found or not authorized");
    }

    await ctx.db.patch(args._id, {
      title: args.title ?? pdf.title,
      favorite: args.favorite ?? pdf.favorite,
      updatedAt: Date.now(),
    });
  },
});

export const movePdf = mutation({
  args: {
    _id: v.id("pdfs"),
    targetWorkingSpaceId: v.id("workingSpaces"),
    targetNotesTableId: v.id("notesTables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const pdf = await ctx.db.get(args._id);
    if (!pdf || pdf.userId !== userId) {
      throw new Error("PDF not found or not authorized");
    }

    const targetWorkspace = await ctx.db.get(args.targetWorkingSpaceId);
    if (!targetWorkspace || targetWorkspace.userId !== userId) {
      throw new Error("Target workspace not found or not authorized");
    }

    const targetTable = await ctx.db.get(args.targetNotesTableId);
    if (!targetTable) {
      throw new Error("Target table not found");
    }

    if (targetTable.workingSpaceId !== args.targetWorkingSpaceId) {
      throw new Error("Target table does not belong to this workspace");
    }

    await ctx.db.patch(args._id, {
      workingSpaceId: args.targetWorkingSpaceId,
      notesTableId: args.targetNotesTableId,
      updatedAt: Date.now(),
    });

    return {
      pdfId: args._id,
      workingSpaceId: args.targetWorkingSpaceId,
      notesTableId: args.targetNotesTableId,
      title: pdf.title,
    };
  },
});

export const deletePdf = mutation({
  args: {
    _id: v.id("pdfs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const pdf = await ctx.db.get(args._id);
    if (!pdf || pdf.userId !== userId) {
      throw new Error("PDF not found or not authorized");
    }

    await ctx.storage.delete(pdf.storageId);
    await ctx.db.delete(args._id);
    return args._id;
  },
});
