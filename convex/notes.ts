import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateSlug } from "../lib/generateSlug";
import { paginationOptsValidator } from "convex/server";
import { extractTextFromTiptap, truncateText } from "../lib/parse-tiptap-content";

const NOTE_PREVIEW_MAX_CHARS = 200;

function computeNotePreview(body: string | undefined): string | undefined {
  if (!body) return undefined;
  const text = extractTextFromTiptap(body).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return truncateText(text, NOTE_PREVIEW_MAX_CHARS);
}

function toNoteListItem(note: any) {
  // Strip the heavy `body` field from list payloads to reduce bandwidth.
  // Pages that need the full content should call `getNoteById`.
  const preview = note.preview ?? computeNotePreview(note.body);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { body, ...rest } = note;
  return { ...rest, preview };
}

export const createNote = mutation({
  args: {
    title: v.string(),
    notesTableId: v.optional(v.id("notesTables")),
    workingSpacesSlug: v.string(),
    workingSpaceId: v.id("workingSpaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { title, notesTableId, workingSpacesSlug, workingSpaceId } = args;

    if (notesTableId) {
      const table = await ctx.db.get(notesTableId);
      if (!table) {
        throw new ConvexError("Table not found");
      }
    }

    const workspace = await ctx.db.get(workingSpaceId);

    if (!workspace) {
      throw new ConvexError("Workspace not found");
    }

    if (workspace.userId !== userId) {
      throw new ConvexError("Not authorized to create notes in this workspace");
    }

    const generateSlugName = generateSlug(title);

    let slug = generateSlugName;
    let existingNote = await ctx.db
      .query("notes")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingNote) {
      slug = `${generateSlugName}-${counter}`;
      existingNote = await ctx.db
        .query("notes")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }
    const note = {
      userId: userId,
      title,
      ...(notesTableId ? { notesTableId } : {}),
      workingSpacesSlug,
      slug: slug,
      workingSpaceId: workingSpaceId,
      favorite: false,
      published: false,
      preview: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newNote = await ctx.db.insert("notes", note);
    return newNote;
  },
});

export const updateNote = mutation({
  args: {
    _id: v.id("notes"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    order: v.optional(v.number()),
    favorite: v.optional(v.boolean()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id, title, body, order, favorite, published } = args;
    const note = await ctx.db.get(_id);
    if (!note) {
      throw new ConvexError("Note not found");
    }

    if (note.userId !== userId) {
      throw new ConvexError("Not authorized to update this note");
    }

    const generateSlugName = generateSlug(title ?? note.title ?? "Untitled");
    let slug = generateSlugName;
    let existingNote = await ctx.db
      .query("notes")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingNote && existingNote._id !== _id) {
      slug = `${generateSlugName}-${counter}`;
      existingNote = await ctx.db
        .query("notes")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }

    const update = {
      ...note,
      title: title ?? note.title,
      body: body ?? note.body,
      preview:
        body !== undefined ? computeNotePreview(body) : (note as any).preview,
      slug: slug,
      updatedAt: Date.now(),
      order: order ?? note.order,
      favorite: favorite ?? note.favorite,
      published: published ?? note.published,
    };

    const updatedNote = await ctx.db.replace(_id, update);
    return updatedNote;
  },
});

export const updateNoteOrder = mutation({
  args: {
    tableId: v.id("notesTables"),
    noteIds: v.array(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { tableId, noteIds } = args;

    // Verify the table belongs to this user's work
    const table = await ctx.db.get(tableId);
    if (!table) {
      throw new ConvexError("Table not found");
    }

    const workspace = await ctx.db.get(table.workingSpaceId);
    if (!workspace || workspace.userId !== userId) {
      throw new ConvexError(
        "Not authorized to update note order in this table",
      );
    }

    const updates = await Promise.all(
      noteIds.map(async (noteId, index) => {
        const note = await ctx.db.get(noteId);
        if (!note) {
          throw new ConvexError(`Note ${noteId} not found`);
        }

        if (note.notesTableId !== tableId) {
          throw new ConvexError(
            `Note ${noteId} does not belong to table ${tableId}`,
          );
        }

        // Verify note belongs to this user
        if (note.userId !== userId) {
          throw new ConvexError(`Not authorized to update note ${noteId}`);
        }

        return ctx.db.patch(noteId, {
          order: index,
          updatedAt: Date.now(),
        });
      }),
    );

    return { success: true, updatedNotes: noteIds.length };
  },
});

export const deleteNote = mutation({
  args: {
    _id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id } = args;
    const note = await ctx.db.get(_id);
    if (!note) {
      throw new ConvexError("Note not found");
    }

    // Verify the note belongs to this user
    if (note.userId !== userId) {
      throw new ConvexError("Not authorized to delete this note");
    }

    await ctx.db.delete(_id);
    return _id;
  },
});

export const getNotesByTableId = query({
  args: {
    notesTableId: v.id("notesTables"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { notesTableId, paginationOpts } = args;

    // Get notes that belong to both the authenticated user and the specified workspace
    const result = await ctx.db
      .query("notes")
      .withIndex("by_notesTableId", (q) => q.eq("notesTableId", notesTableId))
      .order("desc")
      .paginate(paginationOpts);

    return {
      ...result,
      page: result.page.map(toNoteListItem),
    };
  },
});

export const getNoteByUserId = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, searchQuery }) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // If there's a search query, filter notes by title
    if (searchQuery && searchQuery.trim() !== "") {
      const allNotes = await ctx.db
        .query("notes")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();

      const lowerQuery = searchQuery.toLowerCase();
      const matchedNotes = allNotes.filter((note) => {
        return note.title?.toLowerCase().includes(lowerQuery);
      });

      return {
        page: matchedNotes.map(toNoteListItem),
        continueCursor: "",
        isDone: true,
      };
    }

    // No search query - return paginated results
    const result = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);

    return {
      ...result,
      page: result.page.map(toNoteListItem),
    };
  },
});

export const getNoteById = query({
  args: {
    _id: v.id("notes"),
    isPublish: v.optional(v.boolean()) || false,
  },
  handler: async (ctx, args) => {
    const { _id, isPublish } = args;
    const userId = await getAuthUserId(ctx);
    if (!userId && isPublish === false) {
      throw new ConvexError("Not authenticated");
    }
    const note = await ctx.db.get(_id);
    if (!note) {
      throw new ConvexError("Note not found");
    }
    if (note.userId !== userId && note.published === false) {
      throw new ConvexError("You are not authorized to access this note");
    }
    return note;
  },
});

export const getFavNotes = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    const result = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("favorite"), true))
      .order("desc")
      .paginate(paginationOpts);

    return {
      ...result,
      page: result.page.map(toNoteListItem),
    };
  },
});
