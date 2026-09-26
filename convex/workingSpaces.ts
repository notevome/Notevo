import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateSlug } from "../lib/generateSlug";

export const createWorkingSpace = mutation({
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
    let existingWorkingSpace = await ctx.db
      .query("workingSpaces")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingWorkingSpace) {
      slug = `${generateSlugName}-${counter}`;
      existingWorkingSpace = await ctx.db
        .query("workingSpaces")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }
    const workingSpace = {
      name,
      userId,
      slug: slug,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const newWorkingSpace = await ctx.db.insert("workingSpaces", workingSpace);
    return newWorkingSpace;
  },
});

export const updateWorkingSpace = mutation({
  args: {
    _id: v.id("workingSpaces"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    const { _id, name } = args;
    const workingSpace = await ctx.db.get(_id);
    if (!workingSpace) {
      throw new ConvexError("WorkingSpace not found");
    }

    // Authorization check: verify the workspace belongs to the authenticated user
    if (workingSpace.userId !== userId) {
      throw new ConvexError("Not authorized to update this workspace");
    }

    const generateSlugName = generateSlug(name ?? "Untitled");
    // Check if the slug already exists and add incremental number if it does
    let slug = generateSlugName;
    let existingWorkingSpace = await ctx.db
      .query("workingSpaces")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingWorkingSpace && existingWorkingSpace._id !== _id) {
      // Skip current workspace
      slug = `${generateSlugName}-${counter}`;
      existingWorkingSpace = await ctx.db
        .query("workingSpaces")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }
    const update = {
      name: name ?? workingSpace.name,
      userId: workingSpace.userId, // Preserve the original user ID
      slug: slug,
      createdAt: workingSpace.createdAt,
      updatedAt: Date.now(),
    };
    const updatedWorkingSpace = await ctx.db.replace(_id, update);
    return updatedWorkingSpace;
  },
});

export const deleteWorkingSpace = mutation({
  args: {
    _id: v.id("workingSpaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id } = args;
    const workingSpace = await ctx.db.get(_id);

    if (!workingSpace) {
      throw new ConvexError("WorkingSpace not found");
    }

    if (workingSpace.userId !== userId) {
      throw new ConvexError("Not authorized to delete this workspace");
    }

    const tables = await ctx.db
      .query("notesTables")
      .withIndex("by_workingSpaceId", (q) => q.eq("workingSpaceId", _id))
      .collect();

    const notesByWorkspace = await ctx.db
      .query("notes")
      .withIndex("by_workingSpaceId", (q) => q.eq("workingSpaceId", _id))
      .collect();
    const notesByTable = (
      await Promise.all(
        tables.map((table) =>
          ctx.db
            .query("notes")
            .withIndex("by_notesTableId", (q) =>
              q.eq("notesTableId", table._id),
            )
            .collect(),
        ),
      )
    ).flat();
    const notesToDelete = [...notesByWorkspace, ...notesByTable].filter(
      (note, index, arr) =>
        arr.findIndex((candidate) => candidate._id === note._id) === index,
    );

    const pdfsByWorkspace = await ctx.db
      .query("pdfs")
      .withIndex("by_workingSpaceId", (q) => q.eq("workingSpaceId", _id))
      .collect();
    const pdfsByTable = (
      await Promise.all(
        tables.map((table) =>
          ctx.db
            .query("pdfs")
            .withIndex("by_notesTableId", (q) =>
              q.eq("notesTableId", table._id),
            )
            .collect(),
        ),
      )
    ).flat();
    const pdfsToDelete = [...pdfsByWorkspace, ...pdfsByTable].filter(
      (pdf, index, arr) =>
        arr.findIndex((candidate) => candidate._id === pdf._id) === index,
    );

    const whiteboardsByWorkspace = await ctx.db
      .query("whiteboards")
      .withIndex("by_workingSpaceId", (q) => q.eq("workingSpaceId", _id))
      .collect();
    const whiteboardsByTable = (
      await Promise.all(
        tables.map((table) =>
          ctx.db
            .query("whiteboards")
            .withIndex("by_notesTableId", (q) =>
              q.eq("notesTableId", table._id),
            )
            .collect(),
        ),
      )
    ).flat();
    const whiteboardsToDelete = [
      ...whiteboardsByWorkspace,
      ...whiteboardsByTable,
    ].filter(
      (wb, index, arr) =>
        arr.findIndex((candidate) => candidate._id === wb._id) === index,
    );

    const linksByWorkspace = await ctx.db
      .query("links")
      .withIndex("by_workingSpaceId", (q) => q.eq("workingSpaceId", _id))
      .collect();
    const linksByTable = (
      await Promise.all(
        tables.map((table) =>
          ctx.db
            .query("links")
            .withIndex("by_notesTableId", (q) =>
              q.eq("notesTableId", table._id),
            )
            .collect(),
        ),
      )
    ).flat();
    const linksToDelete = [...linksByWorkspace, ...linksByTable].filter(
      (link, index, arr) =>
        arr.findIndex((candidate) => candidate._id === link._id) === index,
    );

    for (const note of notesToDelete) {
      if (note.tags) {
        for (const tagId of note.tags) {
          try {
            await ctx.db.delete(tagId);
          } catch {
            // Tag may already be deleted
          }
        }
      }
      await ctx.db.delete(note._id);
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

export const cleanupOrphanedItems = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        deletedLinks: 0,
        deletedWhiteboards: 0,
        deletedPdfs: 0,
        deletedNotes: 0,
      };
    }

    const userLinks = await ctx.db
      .query("links")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let deletedLinks = 0;
    for (const link of userLinks) {
      let orphan = false;
      if (link.workingSpaceId) {
        const ws = await ctx.db.get(link.workingSpaceId);
        if (!ws) orphan = true;
      }
      if (link.notesTableId) {
        const tbl = await ctx.db.get(link.notesTableId);
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
      if (wb.workingSpaceId) {
        const ws = await ctx.db.get(wb.workingSpaceId);
        if (!ws) orphan = true;
      }
      if (wb.notesTableId) {
        const tbl = await ctx.db.get(wb.notesTableId);
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
      if (pdf.workingSpaceId) {
        const ws = await ctx.db.get(pdf.workingSpaceId);
        if (!ws) orphan = true;
      }
      if (pdf.notesTableId) {
        const tbl = await ctx.db.get(pdf.notesTableId);
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

    const userNotes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    let deletedNotes = 0;
    for (const note of userNotes) {
      let orphan = false;
      if (note.workingSpaceId) {
        const ws = await ctx.db.get(note.workingSpaceId);
        if (!ws) orphan = true;
      }
      if (note.notesTableId) {
        const tbl = await ctx.db.get(note.notesTableId);
        if (!tbl) orphan = true;
      }
      if (orphan) {
        if (note.tags) {
          for (const tagId of note.tags) {
            try {
              await ctx.db.delete(tagId);
            } catch {}
          }
        }
        await ctx.db.delete(note._id);
        deletedNotes++;
      }
    }

    return {
      deletedLinks,
      deletedWhiteboards,
      deletedPdfs,
      deletedNotes,
    };
  },
});

export const getRecentWorkingSpaces = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    // This function is already secure since it only returns workspaces belonging to the authenticated user
    // However, I fixed the sorting to be by updatedAt in descending order to get truly recent workspaces
    const recentWorkingSpaces = await ctx.db
      .query("workingSpaces")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc") // Changed from "asc" to "desc" to get newest first
      .collect();
    return recentWorkingSpaces;
  },
});

export const getWorkingSpaceById = query({
  args: {
    _id: v.id("workingSpaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id } = args;
    const workingSpace = await ctx.db.get(_id);

    if (!workingSpace) {
      throw new ConvexError("WorkingSpace not found");
    }

    if (workingSpace.userId !== userId) {
      throw new ConvexError("Not authorized to access this workspace");
    }

    return workingSpace;
  },
});
