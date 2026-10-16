import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateSlug } from "../lib/generateSlug";
import { ConvexError } from "convex/values";

export const createTable = mutation({
  args: {
    name: v.string(),
    folderId: v.optional(v.id("folders")),
    workingSpaceId: v.optional(v.id("workingSpaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const folderId = args.folderId ?? (args.workingSpaceId as any);
    if (!folderId) {
      throw new ConvexError("Folder ID is required");
    }

    // Verify ownership
    const folder = (await ctx.db.get(folderId)) as Doc<"folders"> | null;
    if (!folder) {
      throw new ConvexError("Folder not found");
    }

    if (folder.userId !== userId) {
      throw new ConvexError("Not authorized to create tables in this folder");
    }

    const generateSlugName = generateSlug(args.name);
    let slug = generateSlugName;
    let existingTableBySlug = await ctx.db
      .query("tables")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingTableBySlug) {
      slug = `${generateSlugName}-${counter}`;
      existingTableBySlug = await ctx.db
        .query("tables")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }

    const table = {
      name: args.name,
      folderId: folderId as any,
      slug: slug,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newTable = await ctx.db.insert("tables", table);
    return newTable;
  },
});

export const getOrCreateTable = mutation({
  args: {
    name: v.string(),
    folderId: v.optional(v.id("folders")),
    workingSpaceId: v.optional(v.id("workingSpaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const folderId = args.folderId ?? (args.workingSpaceId as any);
    if (!folderId) {
      throw new Error("Folder ID is required");
    }

    const normalizedName = args.name.trim().toLowerCase();

    const folder = (await ctx.db.get(folderId)) as Doc<"folders"> | null;
    if (!folder) {
      throw new Error("Folder not found");
    }

    if (folder.userId !== userId) {
      throw new Error("Not authorized to create tables in this folder");
    }

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_folderId", (q) => q.eq("folderId", folderId as any))
      .collect();

    const existingTable = tables.find(
      (table) => table.name?.trim().toLowerCase() === normalizedName,
    );

    if (existingTable) {
      await ctx.db.patch(existingTable._id, {
        updatedAt: Date.now(),
      });
      return existingTable._id;
    }

    const generateSlugName = generateSlug(args.name);
    let slug = generateSlugName;
    let existingTableBySlug = await ctx.db
      .query("tables")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingTableBySlug) {
      slug = `${generateSlugName}-${counter}`;
      existingTableBySlug = await ctx.db
        .query("tables")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }

    return ctx.db.insert("tables", {
      name: args.name,
      folderId: folderId as any,
      slug,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateTable = mutation({
  args: {
    _id: v.id("tables"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id, name } = args;
    const table = await ctx.db.get(_id);
    if (!table) {
      throw new ConvexError("Table not found");
    }

    const folder = table.folderId
      ? ((await ctx.db.get(table.folderId)) as Doc<"folders"> | null)
      : null;
    if (!folder || folder.userId !== userId) {
      throw new ConvexError("Not authorized to update tables in this folder");
    }

    const generateSlugName = generateSlug(name ?? table.name ?? "Untitled");
    let slug = generateSlugName;
    let existingTable = await ctx.db
      .query("tables")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingTable && existingTable._id !== _id) {
      slug = `${generateSlugName}-${counter}`;
      existingTable = await ctx.db
        .query("tables")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }

    const update = {
      name: name ?? table.name,
      folderId: table.folderId,
      slug: slug,
      createdAt: table.createdAt,
      updatedAt: Date.now(),
    };

    const updatedTable = await ctx.db.replace(_id, update);
    return updatedTable;
  },
});

export const deleteTable = mutation({
  args: {
    _id: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { _id } = args;
    const table = await ctx.db.get(_id);
    if (!table) {
      throw new Error("Table not found");
    }

    const folder = table.folderId
      ? ((await ctx.db.get(table.folderId)) as Doc<"folders"> | null)
      : null;
    if (!folder || folder.userId !== userId) {
      throw new ConvexError("Not authorized to delete tables in this folder");
    }

    const documentsToDelete = await ctx.db
      .query("documents")
      .withIndex("by_tableId", (q) => q.eq("tableId", _id))
      .collect();

    const pdfsToDelete = await ctx.db
      .query("pdfs")
      .withIndex("by_tableId", (q) => q.eq("tableId", _id))
      .collect();
    const whiteboardsToDelete = await ctx.db
      .query("whiteboards")
      .withIndex("by_tableId", (q) => q.eq("tableId", _id))
      .collect();
    const linksToDelete = await ctx.db
      .query("links")
      .withIndex("by_tableId", (q) => q.eq("tableId", _id))
      .collect();

    for (const doc of documentsToDelete) {
      if (doc.tags) {
        for (const tagId of doc.tags) {
          try {
            await ctx.db.delete(tagId);
          } catch {}
        }
      }
      await ctx.db.delete(doc._id);
    }

    for (const pdf of pdfsToDelete) {
      try {
        await ctx.storage.delete(pdf.storageId);
      } catch {}
      await ctx.db.delete(pdf._id);
    }

    for (const whiteboard of whiteboardsToDelete) {
      await ctx.db.delete(whiteboard._id);
    }

    for (const link of linksToDelete) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(_id);
    return true;
  },
});

export const getTables = query({
  args: {
    folderId: v.optional(v.id("folders")),
    workingSpaceId: v.optional(v.id("workingSpaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const folderId = args.folderId ?? (args.workingSpaceId as any);
    if (!folderId) {
      return [];
    }

    const folder = (await ctx.db.get(folderId)) as Doc<"folders"> | null;
    if (!folder || folder.userId !== userId) {
      return [];
    }

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_folderId", (q) => q.eq("folderId", folderId as any))
      .collect();

    return tables;
  },
});

export const getTableById = query({
  args: {
    _id: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const table = await ctx.db.get(args._id);
    if (!table) {
      throw new ConvexError("Table not found");
    }

    if (table.folderId) {
      const folder = await ctx.db.get(table.folderId);
      if (folder && folder.userId !== userId) {
        throw new ConvexError("Not authorized to view this table");
      }
    }

    return table;
  },
});

export const getFoldersForMove = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { searchQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const normalizedQuery = normalizeSearchText(searchQuery?.trim());
    if (!normalizedQuery) {
      return folders;
    }

    return folders.filter((folder) =>
      normalizeSearchText(folder.name).includes(normalizedQuery),
    );
  },
});

export const getWorkspacesForMove = getFoldersForMove;

export const moveTable = mutation({
  args: {
    _id: v.id("tables"),
    targetFolderId: v.optional(v.id("folders")),
    targetWorkingSpaceId: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id } = args;
    const targetFolderId = (args.targetFolderId ?? args.targetWorkingSpaceId) as any;
    if (!targetFolderId) {
      throw new ConvexError("Target folder ID is required");
    }

    const table = await ctx.db.get(_id);
    if (!table) {
      throw new ConvexError("Table not found");
    }

    const targetFolder = (await ctx.db.get(targetFolderId)) as Doc<"folders"> | null;
    if (!targetFolder || targetFolder.userId !== userId) {
      throw new ConvexError("Target folder not found or unauthorized");
    }

    if (table.folderId === targetFolderId) {
      return {
        tableId: _id,
        folderId: targetFolderId,
        folderSlug: targetFolder.slug,
      };
    }

    await ctx.db.patch(_id, {
      folderId: targetFolderId,
      updatedAt: Date.now(),
    });

    const [documentsInTable, pdfsInTable, linksInTable, whiteboardsInTable] =
      await Promise.all([
        ctx.db
          .query("documents")
          .withIndex("by_tableId", (q) => q.eq("tableId", _id))
          .collect(),
        ctx.db
          .query("pdfs")
          .withIndex("by_tableId", (q) => q.eq("tableId", _id))
          .collect(),
        ctx.db
          .query("links")
          .withIndex("by_tableId", (q) => q.eq("tableId", _id))
          .collect(),
        ctx.db
          .query("whiteboards")
          .withIndex("by_tableId", (q) => q.eq("tableId", _id))
          .collect(),
      ]);

    await Promise.all([
      ...documentsInTable.map((doc) =>
        ctx.db.patch(doc._id, {
          folderId: targetFolderId,
          folderSlug: targetFolder.slug ?? doc.folderSlug,
          updatedAt: Date.now(),
        }),
      ),
      ...pdfsInTable.map((pdf) =>
        ctx.db.patch(pdf._id, {
          folderId: targetFolderId,
          updatedAt: Date.now(),
        }),
      ),
      ...linksInTable.map((link) =>
        ctx.db.patch(link._id, {
          folderId: targetFolderId,
          updatedAt: Date.now(),
        }),
      ),
      ...whiteboardsInTable.map((whiteboard) =>
        ctx.db.patch(whiteboard._id, {
          folderId: targetFolderId,
          updatedAt: Date.now(),
        }),
      ),
    ]);

    return {
      tableId: _id,
      folderId: targetFolderId,
      folderSlug: targetFolder.slug,
    };
  },
});

function normalizeSearchText(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
