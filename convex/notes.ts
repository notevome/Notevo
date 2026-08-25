import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateSlug } from "../lib/generateSlug";
import { paginationOptsValidator } from "convex/server";
import {
  extractTextFromTiptap,
  truncateText,
} from "../lib/parse-tiptap-content";

const NOTE_PREVIEW_MAX_CHARS = 200;
const TREE_NOTES_PER_TABLE = 3;
const TREE_TABLES_PER_WORKSPACE = 3;

function normalizeSearchText(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

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

export const moveNote = mutation({
  args: {
    _id: v.id("notes"),
    targetWorkingSpaceId: v.id("workingSpaces"),
    targetNotesTableId: v.id("notesTables"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id, targetWorkingSpaceId, targetNotesTableId } = args;
    const note = await ctx.db.get(_id);
    if (!note) {
      throw new ConvexError("Note not found");
    }

    if (note.userId !== userId) {
      throw new ConvexError("Not authorized to move this note");
    }

    const targetWorkspace = await ctx.db.get(targetWorkingSpaceId);
    if (!targetWorkspace) {
      throw new ConvexError("Target workspace not found");
    }

    if (targetWorkspace.userId !== userId) {
      throw new ConvexError("Not authorized to use this workspace");
    }

    const targetTable = await ctx.db.get(targetNotesTableId);
    if (!targetTable) {
      throw new ConvexError("Target table not found");
    }

    if (targetTable.workingSpaceId !== targetWorkingSpaceId) {
      throw new ConvexError("Target table does not belong to this workspace");
    }

    await ctx.db.patch(_id, {
      workingSpaceId: targetWorkingSpaceId,
      workingSpacesSlug: targetWorkspace.slug ?? note.workingSpacesSlug,
      notesTableId: targetNotesTableId,
      updatedAt: Date.now(),
    });

    return {
      noteId: _id,
      workingSpaceId: targetWorkingSpaceId,
      workingSpacesSlug: targetWorkspace.slug,
      notesTableId: targetNotesTableId,
      slug: note.slug,
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

      const lowerQuery = normalizeSearchText(searchQuery);
      const matchedNotes = allNotes.filter((note) => {
        return normalizeSearchText(note.title).includes(lowerQuery);
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
export const getWorkspaceTreeForMove = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { searchQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const normalizedQuery = normalizeSearchText(searchQuery?.trim());
    const isSearching = normalizedQuery.length > 0;

    const workspaces = await ctx.db
      .query("workingSpaces")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const targets = await Promise.all(
      workspaces.map(async (workspace) => {
        const allTables = await ctx.db
          .query("notesTables")
          .withIndex("by_workingSpaceId", (q) =>
            q.eq("workingSpaceId", workspace._id),
          )
          .collect();

        const sortedTables = allTables.sort(
          (a, b) => b.updatedAt - a.updatedAt,
        );

        if (!isSearching) {
          // No filtering here: every workspace and every table is a valid
          // move destination, whether or not it has content yet.
          return { ...workspace, tables: sortedTables };
        }

        const workspaceMatches = normalizeSearchText(workspace.name).includes(
          normalizedQuery,
        );

        // Workspace name matched: keep all its tables so the user can
        // still pick any of them, not just ones whose name also matched.
        if (workspaceMatches) {
          return { ...workspace, tables: sortedTables };
        }

        const matchingTables = sortedTables.filter((table) =>
          normalizeSearchText(table.name).includes(normalizedQuery),
        );

        if (matchingTables.length > 0) {
          return { ...workspace, tables: matchingTables };
        }

        return null;
      }),
    );

    return targets.filter(Boolean) as NonNullable<(typeof targets)[number]>[];
  },
});
export const getWorkspaceTree = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { searchQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const normalizedQuery = normalizeSearchText(searchQuery?.trim());
    const isSearching = normalizedQuery.length > 0;

    const workspaces = await ctx.db
      .query("workingSpaces")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const targets = await Promise.all(
      workspaces.map(async (workspace) => {
        const allTables = await ctx.db
          .query("notesTables")
          .withIndex("by_workingSpaceId", (q) =>
            q.eq("workingSpaceId", workspace._id),
          )
          .collect();

        const sortedTables = allTables.sort(
          (a, b) => b.updatedAt - a.updatedAt,
        );

        const tablesToProcess = isSearching
          ? sortedTables
          : sortedTables.slice(0, TREE_TABLES_PER_WORKSPACE);

        const tablesWithNotes = await Promise.all(
          tablesToProcess.map(async (table) => {
            if (isSearching) {
              const allNotes = await ctx.db
                .query("notes")
                .withIndex("by_notesTableId", (q) =>
                  q.eq("notesTableId", table._id),
                )
                .order("desc")
                .collect();
              const allPdfs = await ctx.db
                .query("pdfs")
                .withIndex("by_notesTableId", (q) =>
                  q.eq("notesTableId", table._id),
                )
                .order("desc")
                .collect();
              const allLinks = await ctx.db
                .query("links")
                .withIndex("by_notesTableId", (q) =>
                  q.eq("notesTableId", table._id),
                )
                .order("desc")
                .collect();

              return {
                ...table,
                notes: allNotes.map(({ body, ...rest }) => rest),
                pdfs: allPdfs,
                links: allLinks,
              };
            }

            const firstNotes = await ctx.db
              .query("notes")
              .withIndex("by_notesTableId", (q) =>
                q.eq("notesTableId", table._id),
              )
              .order("desc")
              .take(TREE_NOTES_PER_TABLE);
            const firstPdfs = await ctx.db
              .query("pdfs")
              .withIndex("by_notesTableId", (q) =>
                q.eq("notesTableId", table._id),
              )
              .order("desc")
              .take(TREE_NOTES_PER_TABLE);
            const firstLinks = await ctx.db
              .query("links")
              .withIndex("by_notesTableId", (q) =>
                q.eq("notesTableId", table._id),
              )
              .order("desc")
              .take(TREE_NOTES_PER_TABLE);

            return {
              ...table,
              notes: firstNotes.map(({ body, ...rest }) => rest),
              pdfs: firstPdfs,
              links: firstLinks,
            };
          }),
        );

        // Only keep tables that have at least one note, pdf, or link
        const nonEmptyTables = tablesWithNotes.filter(
          (table) =>
            table.notes.length > 0 ||
            table.pdfs.length > 0 ||
            (table.links?.length ?? 0) > 0,
        );

        // Drop workspace entirely if it has no non-empty tables
        if (nonEmptyTables.length === 0) return null;

        if (!isSearching) {
          return { ...workspace, tables: nonEmptyTables };
        }

        // Search path
        const workspaceMatches = normalizeSearchText(workspace.name).includes(
          normalizedQuery,
        );

        const filteredTables = nonEmptyTables
          .map((table) => {
            const tableMatches = normalizeSearchText(table.name).includes(
              normalizedQuery,
            );
            const matchingNotes = table.notes.filter((note: any) =>
              normalizeSearchText(note.title).includes(normalizedQuery),
            );
            const matchingPdfs = table.pdfs.filter((pdf: any) =>
              normalizeSearchText(pdf.title).includes(normalizedQuery),
            );
            const matchingLinks = (table.links ?? []).filter((link: any) =>
              normalizeSearchText(link.title).includes(normalizedQuery),
            );

            if (tableMatches) return table;
            if (
              matchingNotes.length > 0 ||
              matchingPdfs.length > 0 ||
              matchingLinks.length > 0
            )
              return {
                ...table,
                notes: matchingNotes,
                pdfs: matchingPdfs,
                links: matchingLinks,
              };

            return null;
          })
          .filter(Boolean);

        // Drop workspace if no tables matched and workspace name didn't match
        if (filteredTables.length === 0) return null;

        return { ...workspace, tables: filteredTables };
      }),
    );

    return targets.filter(Boolean) as NonNullable<(typeof targets)[number]>[];
  },
});
