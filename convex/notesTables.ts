import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateSlug } from "../lib/generateSlug";

export const createTable = mutation({
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

    // Verify the user owns the workspace
    const workspace = await ctx.db.get(workingSpaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new Error("Not authorized to create tables in this workspace");
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

export const updateTable = mutation({
  args: {
    _id: v.id("notesTables"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { _id, name } = args;
    const table = await ctx.db.get(_id);
    if (!table) {
      throw new Error("Table not found");
    }

    // Verify the user owns the workspace that contains this table
    const workspace = await ctx.db.get(table.workingSpaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new Error("Not authorized to update tables in this workspace");
    }

    const generateSlugName = generateSlug(name ?? "Untitled");
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
      throw new Error("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new Error("Not authorized to delete tables in this workspace");
    }

    const notesToDelete = await ctx.db
      .query("notes")
      .withIndex("by_notesTableId", (q) => q.eq("notesTableId", _id))
      .collect();

    for (const note of notesToDelete) {
      await ctx.db.delete(note._id);
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
      throw new Error("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new Error("Not authorized to view tables in this workspace");
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
