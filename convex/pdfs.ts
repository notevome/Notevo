import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
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

      if (folderId && table.folderId && table.folderId !== folderId) {
        throw new Error("Table does not belong to the provided folder");
      }
    }

    const pdfId = await ctx.db.insert("pdfs", {
      storageId: args.storageId,
      userId,
      folderId,
      tableId,
      title: args.title,
      favorite: false,
      status: "backlog",
      priority: "no_priority",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return pdfId;
  },
});

export const getPdfsByTableId = query({
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
      const folder = (await ctx.db.get(
        table.folderId,
      )) as Doc<"folders"> | null;
      if (!folder || folder.userId !== userId) {
        throw new Error("Folder not found or not authorized");
      }
    }

    const result = await ctx.db
      .query("pdfs")
      .withIndex("by_tableId", (q) => q.eq("tableId", tableId))
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

    const folderId = pdf.folderId ?? (pdf as any).workingSpaceId;
    const tableId = pdf.tableId ?? (pdf as any).notesTableId;
    return {
      ...pdf,
      folderId,
      workingSpaceId: folderId,
      tableId,
      notesTableId: tableId,
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

    const result = await ctx.db
      .query("pdfs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("favorite"), true))
      .order("desc")
      .paginate(paginationOpts);

    const validPage = (
      await Promise.all(
        result.page.map(async (pdf) => {
          if (pdf.folderId) {
            const folder = await ctx.db.get(pdf.folderId);
            if (!folder) return null;
          }
          if (pdf.tableId) {
            const table = await ctx.db.get(pdf.tableId);
            if (!table) return null;
          }
          const folderId = pdf.folderId ?? (pdf as any).workingSpaceId;
          const tableId = pdf.tableId ?? (pdf as any).notesTableId;
          return {
            ...pdf,
            folderId,
            workingSpaceId: folderId,
            tableId,
            notesTableId: tableId,
          };
        }),
      )
    ).filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      ...result,
      page: validPage,
    };
  },
});

export const updatePdf = mutation({
  args: {
    _id: v.id("pdfs"),
    title: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    deadline: v.optional(v.union(v.number(), v.null())),
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
      status: args.status ?? (pdf as any).status ?? "backlog",
      priority: args.priority ?? (pdf as any).priority ?? "no_priority",
      ...(args.deadline !== undefined
        ? { deadline: args.deadline ?? undefined }
        : {}),
      updatedAt: Date.now(),
    });
  },
});

export const movePdf = mutation({
  args: {
    _id: v.id("pdfs"),
    targetFolderId: v.optional(v.id("folders")),
    targetTableId: v.optional(v.id("tables")),
    targetWorkingSpaceId: v.optional(v.any()),
    targetNotesTableId: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const targetFolderId = (args.targetFolderId ??
      args.targetWorkingSpaceId) as any;
    const targetTableId = (args.targetTableId ??
      args.targetNotesTableId) as any;

    const pdf = await ctx.db.get(args._id);
    if (!pdf || pdf.userId !== userId) {
      throw new Error("PDF not found or not authorized");
    }

    const targetFolder = (await ctx.db.get(
      targetFolderId,
    )) as Doc<"folders"> | null;
    if (!targetFolder || targetFolder.userId !== userId) {
      throw new Error("Target folder not found or not authorized");
    }

    const targetTable = (await ctx.db.get(
      targetTableId,
    )) as Doc<"tables"> | null;
    if (!targetTable) {
      throw new Error("Target table not found");
    }

    if (targetTable.folderId && targetTable.folderId !== targetFolderId) {
      throw new Error("Target table does not belong to this folder");
    }

    await ctx.db.patch(args._id, {
      folderId: targetFolderId,
      tableId: targetTableId,
      updatedAt: Date.now(),
    });

    return {
      pdfId: args._id,
      folderId: targetFolderId,
      workingSpaceId: targetFolderId,
      tableId: targetTableId,
      notesTableId: targetTableId,
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
