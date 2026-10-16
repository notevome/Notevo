import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateSlug } from "../lib/generateSlug";

// Add every new folder-owned content table here so empty-folder cleanup stays safe.
const FOLDER_CONTENT_TABLES = [
  "documents",
  "pdfs",
  "whiteboards",
  "links",
] as const;

export const createFolder = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    const { name } = args;
    const generateSlugName = generateSlug(name);

    let slug = generateSlugName;
    let existingFolder = await ctx.db
      .query("folders")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingFolder) {
      slug = `${generateSlugName}-${counter}`;
      existingFolder = await ctx.db
        .query("folders")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }
    const folder = {
      name,
      userId,
      slug: slug,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const newFolder = await ctx.db.insert("folders", folder);

    const tableName = "Documents";
    const tableSlugBase = `${generateSlug(tableName)}-${slug || String(newFolder)}`;
    let tableSlug = tableSlugBase;
    let existingTable = await ctx.db
      .query("tables")
      .withIndex("by_slug", (q) => q.eq("slug", tableSlug))
      .first();
    let tableCounter = 1;
    while (existingTable) {
      tableSlug = `${tableSlugBase}-${tableCounter}`;
      existingTable = await ctx.db
        .query("tables")
        .withIndex("by_slug", (q) => q.eq("slug", tableSlug))
        .first();
      tableCounter++;
    }

    const now = Date.now();
    await ctx.db.insert("tables", {
      name: tableName,
      folderId: newFolder,
      slug: tableSlug,
      createdAt: now,
      updatedAt: now,
    });

    return newFolder;
  },
});

export const updateFolder = mutation({
  args: {
    _id: v.id("folders"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    const { _id, name } = args;
    const folder = await ctx.db.get(_id);
    if (!folder) {
      throw new ConvexError("Folder not found");
    }

    // Authorization check: verify the folder belongs to the authenticated user
    if (folder.userId !== userId) {
      throw new ConvexError("Not authorized to update this folder");
    }

    const generateSlugName = generateSlug(name ?? "Untitled");
    // Check if the slug already exists and add incremental number if it does
    let slug = generateSlugName;
    let existingFolder = await ctx.db
      .query("folders")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingFolder && existingFolder._id !== _id) {
      slug = `${generateSlugName}-${counter}`;
      existingFolder = await ctx.db
        .query("folders")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }
    const update = {
      name: name ?? folder.name,
      userId: folder.userId, // Preserve the original user ID
      slug: slug,
      createdAt: folder.createdAt,
      updatedAt: Date.now(),
    };
    const updatedFolder = await ctx.db.replace(_id, update);
    return updatedFolder;
  },
});

export const deleteFolder = mutation({
  args: {
    _id: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id } = args;
    const folder = await ctx.db.get(_id);

    if (!folder) {
      throw new ConvexError("Folder not found");
    }

    if (folder.userId !== userId) {
      throw new ConvexError("Not authorized to delete this folder");
    }

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_folderId", (q) => q.eq("folderId", _id))
      .collect();

    const documentsByFolder = await ctx.db
      .query("documents")
      .withIndex("by_folderId", (q) => q.eq("folderId", _id))
      .collect();
    const documentsByTable = (
      await Promise.all(
        tables.map((table) =>
          ctx.db
            .query("documents")
            .withIndex("by_tableId", (q) =>
              q.eq("tableId", table._id),
            )
            .collect(),
        ),
      )
    ).flat();
    const documentsToDelete = [...documentsByFolder, ...documentsByTable].filter(
      (doc, index, arr) =>
        arr.findIndex((candidate) => candidate._id === doc._id) === index,
    );

    const pdfsByFolder = await ctx.db
      .query("pdfs")
      .withIndex("by_folderId", (q) => q.eq("folderId", _id))
      .collect();
    const pdfsByTable = (
      await Promise.all(
        tables.map((table) =>
          ctx.db
            .query("pdfs")
            .withIndex("by_tableId", (q) =>
              q.eq("tableId", table._id),
            )
            .collect(),
        ),
      )
    ).flat();
    const pdfsToDelete = [...pdfsByFolder, ...pdfsByTable].filter(
      (pdf, index, arr) =>
        arr.findIndex((candidate) => candidate._id === pdf._id) === index,
    );

    const whiteboardsByFolder = await ctx.db
      .query("whiteboards")
      .withIndex("by_folderId", (q) => q.eq("folderId", _id))
      .collect();
    const whiteboardsByTable = (
      await Promise.all(
        tables.map((table) =>
          ctx.db
            .query("whiteboards")
            .withIndex("by_tableId", (q) =>
              q.eq("tableId", table._id),
            )
            .collect(),
        ),
      )
    ).flat();
    const whiteboardsToDelete = [
      ...whiteboardsByFolder,
      ...whiteboardsByTable,
    ].filter(
      (wb, index, arr) =>
        arr.findIndex((candidate) => candidate._id === wb._id) === index,
    );

    const linksByFolder = await ctx.db
      .query("links")
      .withIndex("by_folderId", (q) => q.eq("folderId", _id))
      .collect();
    const linksByTable = (
      await Promise.all(
        tables.map((table) =>
          ctx.db
            .query("links")
            .withIndex("by_tableId", (q) =>
              q.eq("tableId", table._id),
            )
            .collect(),
        ),
      )
    ).flat();
    const linksToDelete = [...linksByFolder, ...linksByTable].filter(
      (link, index, arr) =>
        arr.findIndex((candidate) => candidate._id === link._id) === index,
    );

    for (const doc of documentsToDelete) {
      if (doc.tags) {
        for (const tagId of doc.tags) {
          try {
            await ctx.db.delete(tagId);
          } catch {
            // Tag may already be deleted
          }
        }
      }
      await ctx.db.delete(doc._id);
    }

    for (const pdf of pdfsToDelete) {
      try {
        await ctx.storage.delete(pdf.storageId);
      } catch {
        // Storage file may already be deleted
      }
      await ctx.db.delete(pdf._id);
    }

    for (const whiteboard of whiteboardsToDelete) {
      await ctx.db.delete(whiteboard._id);
    }

    for (const link of linksToDelete) {
      await ctx.db.delete(link._id);
    }

    for (const table of tables) {
      await ctx.db.delete(table._id);
    }

    await ctx.db.delete(_id);

    return { success: true };
  },
});

export const deleteFolderIfEmpty = mutation({
  args: {
    _id: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const folder = await ctx.db.get(args._id);
    if (!folder || folder.userId !== userId) {
      return "unavailable" as const;
    }

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_folderId", (q) => q.eq("folderId", args._id))
      .collect();

    const hasFolderItems = async (
      tableName: (typeof FOLDER_CONTENT_TABLES)[number],
    ) => {
      const directItems = await ctx.db
        .query(tableName)
        .withIndex("by_folderId", (q: any) => q.eq("folderId", args._id))
        .first();
      if (directItems) return true;

      const tableItems = await Promise.all(
        tables.map((table) =>
          ctx.db
            .query(tableName)
            .withIndex("by_tableId", (q: any) =>
              q.eq("tableId", table._id),
            )
            .first(),
        ),
      );
      return tableItems.some(Boolean);
    };

    const containsItems = await Promise.all(
      FOLDER_CONTENT_TABLES.map((tableName) => hasFolderItems(tableName)),
    );
    if (containsItems.some(Boolean)) {
      return "not-empty" as const;
    }

    for (const table of tables) {
      await ctx.db.delete(table._id);
    }
    await ctx.db.delete(args._id);
    return "deleted" as const;
  },
});

export const cleanupOrphanedItems = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        deletedLinks: 0,
        deletedWhiteboards: 0,
        deletedPdfs: 0,
        deletedDocuments: 0,
      };
    }

    const userLinks = await ctx.db
      .query("links")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let deletedLinks = 0;
    for (const link of userLinks) {
      let orphan = false;
      if (link.folderId) {
        const folder = await ctx.db.get(link.folderId);
        if (!folder) orphan = true;
      }
      if (link.tableId) {
        const tbl = await ctx.db.get(link.tableId);
        if (!tbl) orphan = true;
      }
      if (orphan) {
        await ctx.db.delete(link._id);
        deletedLinks++;
      }
    }

    const userWhiteboards = await ctx.db
      .query("whiteboards")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let deletedWhiteboards = 0;
    for (const wb of userWhiteboards) {
      let orphan = false;
      if (wb.folderId) {
        const folder = await ctx.db.get(wb.folderId);
        if (!folder) orphan = true;
      }
      if (wb.tableId) {
        const tbl = await ctx.db.get(wb.tableId);
        if (!tbl) orphan = true;
      }
      if (orphan) {
        await ctx.db.delete(wb._id);
        deletedWhiteboards++;
      }
    }

    const userPdfs = await ctx.db
      .query("pdfs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let deletedPdfs = 0;
    for (const pdf of userPdfs) {
      let orphan = false;
      if (pdf.folderId) {
        const folder = await ctx.db.get(pdf.folderId);
        if (!folder) orphan = true;
      }
      if (pdf.tableId) {
        const tbl = await ctx.db.get(pdf.tableId);
        if (!tbl) orphan = true;
      }
      if (orphan) {
        try {
          await ctx.storage.delete(pdf.storageId);
        } catch {}
        await ctx.db.delete(pdf._id);
        deletedPdfs++;
      }
    }

    const userDocuments = await ctx.db
      .query("documents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let deletedDocuments = 0;
    for (const doc of userDocuments) {
      let orphan = false;
      if (doc.folderId) {
        const folder = await ctx.db.get(doc.folderId);
        if (!folder) orphan = true;
      }
      if (doc.tableId) {
        const tbl = await ctx.db.get(doc.tableId);
        if (!tbl) orphan = true;
      }
      if (orphan) {
        if (doc.tags) {
          for (const tagId of doc.tags) {
            try {
              await ctx.db.delete(tagId);
            } catch {}
          }
        }
        await ctx.db.delete(doc._id);
        deletedDocuments++;
      }
    }

    return {
      deletedLinks,
      deletedWhiteboards,
      deletedPdfs,
      deletedDocuments,
    };
  },
});

export const getRecentFolders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    const recentFolders = await ctx.db
      .query("folders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return recentFolders;
  },
});

export const getFolderById = query({
  args: {
    _id: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id } = args;
    const folder = await ctx.db.get(_id);

    if (!folder) {
      throw new ConvexError("Folder not found");
    }

    if (folder.userId !== userId) {
      throw new ConvexError("Not authorized to access this folder");
    }

    return folder;
  },
});
