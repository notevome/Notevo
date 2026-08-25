import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateSlug } from "../lib/generateSlug";
import { ConvexError } from "convex/values";

export const createTable = mutation({
  args: {
    name: v.string(),
    workingSpaceId: v.id("workingSpaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { name, workingSpaceId } = args;

    // Verify the user owns the workspace
    const workspace = await ctx.db.get(workingSpaceId);
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new ConvexError(
        "Not authorized to create tables in this workspace",
      );
    }

    const generateSlugName = generateSlug(name);
    // Check if the slug already exists and add incremental number if it does
    let slug = generateSlugName;
    let existingTableBySlug = await ctx.db
      .query("notesTables")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingTableBySlug) {
      slug = `${generateSlugName}-${counter}`;
      existingTableBySlug = await ctx.db
        .query("notesTables")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }

    const table = {
      name,
      workingSpaceId,
      slug: slug,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newTable = await ctx.db.insert("notesTables", table);
    return newTable;
  },
});

export const getOrCreateTable = mutation({
  args: {
    name: v.string(),
    workingSpaceId: v.id("workingSpaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { name, workingSpaceId } = args;
    const normalizedName = name.trim().toLowerCase();

    const workspace = await ctx.db.get(workingSpaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new Error("Not authorized to create tables in this workspace");
    }

    const tables = await ctx.db
      .query("notesTables")
      .withIndex("by_workingSpaceId", (q) =>
        q.eq("workingSpaceId", workingSpaceId),
      )
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

    const generateSlugName = generateSlug(name);
    let slug = generateSlugName;
    let existingTableBySlug = await ctx.db
      .query("notesTables")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingTableBySlug) {
      slug = `${generateSlugName}-${counter}`;
      existingTableBySlug = await ctx.db
        .query("notesTables")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }

    return ctx.db.insert("notesTables", {
      name,
      workingSpaceId,
      slug,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateTable = mutation({
  args: {
    _id: v.id("notesTables"),
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

    // Verify the user owns the workspace that contains this table
    const workspace = await ctx.db.get(table.workingSpaceId);
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new ConvexError(
        "Not authorized to update tables in this workspace",
      );
    }

    const generateSlugName = generateSlug(name ?? table.name ?? "Untitled");
    // Check if the slug already exists and add incremental number if it does
    let slug = generateSlugName;
    let existingTable = await ctx.db
      .query("notesTables")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingTable && existingTable._id !== _id) {
      // Skip the current table
      slug = `${generateSlugName}-${counter}`;
      existingTable = await ctx.db
        .query("notesTables")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }

    const update = {
      name: name ?? table.name,
      workingSpaceId: table.workingSpaceId,
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
    _id: v.id("notesTables"),
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

    const workspace = await ctx.db.get(table.workingSpaceId);
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new ConvexError(
        "Not authorized to delete tables in this workspace",
      );
    }

    const notesToDelete = await ctx.db
      .query("notes")
      .withIndex("by_notesTableId", (q) => q.eq("notesTableId", _id))
      .collect();

    const pdfsToDelete = await ctx.db
      .query("pdfs")
      .withIndex("by_notesTableId", (q) => q.eq("notesTableId", _id))
      .collect();

    for (const note of notesToDelete) {
      if (note.tags) {
        for (const tagId of note.tags) {
          await ctx.db.delete(tagId);
        }
      }
      await ctx.db.delete(note._id);
    }

    for (const pdf of pdfsToDelete) {
      await ctx.storage.delete(pdf.storageId);
      await ctx.db.delete(pdf._id);
    }

    const linksToDelete = await ctx.db
      .query("links")
      .withIndex("by_notesTableId", (q) => q.eq("notesTableId", _id))
      .collect();

    for (const link of linksToDelete) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(_id);
    return true;
  },
});

export const getTables = query({
  args: {
    workingSpaceId: v.id("workingSpaces"), // Changed from v.any() to be more type-safe
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { workingSpaceId } = args;

    // Verify the user owns the workspace
    const workspace = await ctx.db.get(workingSpaceId);
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new ConvexError("Not authorized to view tables in this workspace");
    }

    const tables = await ctx.db
      .query("notesTables")
      .withIndex("by_workingSpaceId", (q) =>
        q.eq("workingSpaceId", workingSpaceId),
      )
      .collect();

    return tables;
  },
});

export const getTableById = query({
  args: {
    _id: v.id("notesTables"),
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

    const workspace = await ctx.db.get(table.workingSpaceId);
    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new ConvexError("Not authorized to view this table");
    }

    return table;
  },
});
export const getWorkspacesForMove = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { searchQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const workspaces = await ctx.db
      .query("workingSpaces")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const normalizedQuery = normalizeSearchText(searchQuery?.trim());
    if (!normalizedQuery) {
      return workspaces;
    }

    return workspaces.filter((workspace) =>
      normalizeSearchText(workspace.name).includes(normalizedQuery),
    );
  },
});

export const moveTable = mutation({
  args: {
    _id: v.id("notesTables"),
    targetWorkingSpaceId: v.id("workingSpaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id, targetWorkingSpaceId } = args;

    const table = await ctx.db.get(_id);
    if (!table) {
      throw new ConvexError("Table not found");
    }

    const currentWorkspace = await ctx.db.get(table.workingSpaceId);
    if (!currentWorkspace || currentWorkspace.userId !== userId) {
      throw new ConvexError("Not authorized to move this table");
    }

    const targetWorkspace = await ctx.db.get(targetWorkingSpaceId);
    if (!targetWorkspace) {
      throw new ConvexError("Target workspace not found");
    }
    if (targetWorkspace.userId !== userId) {
      throw new ConvexError("Not authorized to use this workspace");
    }

    if (table.workingSpaceId === targetWorkingSpaceId) {
      // No-op move: already in the target workspace.
      return {
        tableId: _id,
        workingSpaceId: targetWorkingSpaceId,
        workingSpacesSlug: targetWorkspace.slug,
      };
    }

    await ctx.db.patch(_id, {
      workingSpaceId: targetWorkingSpaceId,
      updatedAt: Date.now(),
    });

    const [notesInTable, pdfsInTable, linksInTable] = await Promise.all([
      ctx.db
        .query("notes")
        .withIndex("by_notesTableId", (q) => q.eq("notesTableId", _id))
        .collect(),
      ctx.db
        .query("pdfs")
        .withIndex("by_notesTableId", (q) => q.eq("notesTableId", _id))
        .collect(),
      ctx.db
        .query("links")
        .withIndex("by_notesTableId", (q) => q.eq("notesTableId", _id))
        .collect(),
    ]);

    await Promise.all([
      ...notesInTable.map((note) =>
        ctx.db.patch(note._id, {
          workingSpaceId: targetWorkingSpaceId,
          workingSpacesSlug: targetWorkspace.slug ?? note.workingSpacesSlug,
          updatedAt: Date.now(),
        }),
      ),
      ...pdfsInTable.map((pdf) =>
        ctx.db.patch(pdf._id, {
          workingSpaceId: targetWorkingSpaceId,
          updatedAt: Date.now(),
        }),
      ),
      ...linksInTable.map((link) =>
        ctx.db.patch(link._id, {
          workingSpaceId: targetWorkingSpaceId,
          updatedAt: Date.now(),
        }),
      ),
    ]);

    return {
      tableId: _id,
      workingSpaceId: targetWorkingSpaceId,
      workingSpacesSlug: targetWorkspace.slug,
    };
  },
});

function normalizeSearchText(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
