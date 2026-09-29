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

    const validPage = (
      await Promise.all(
        result.page.map(async (note) => {
          if (note.workingSpaceId) {
            const ws = await ctx.db.get(note.workingSpaceId);
            if (!ws) return null;
          }
          if (note.notesTableId) {
            const table = await ctx.db.get(note.notesTableId);
            if (!table) return null;
          }
          return toNoteListItem(note);
        }),
      )
    ).filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      ...result,
      page: validPage,
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
              const allWhiteboards = await ctx.db
                .query("whiteboards")
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
                whiteboards: allWhiteboards,
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
            const firstWhiteboards = await ctx.db
              .query("whiteboards")
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
              whiteboards: firstWhiteboards,
            };
          }),
        );

        // Only keep tables that have at least one note, pdf, or link
        const nonEmptyTables = tablesWithNotes.filter(
          (table) =>
            table.notes.length > 0 ||
            table.pdfs.length > 0 ||
            (table.links?.length ?? 0) > 0 ||
            (table.whiteboards?.length ?? 0) > 0,
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
            const matchingWhiteboards = (table.whiteboards ?? []).filter(
              (whiteboard: any) =>
                normalizeSearchText(whiteboard.title).includes(normalizedQuery),
            );

            if (tableMatches) return table;
            if (
              matchingNotes.length > 0 ||
              matchingPdfs.length > 0 ||
              matchingLinks.length > 0 ||
              matchingWhiteboards.length > 0
            )
              return {
                ...table,
                notes: matchingNotes,
                pdfs: matchingPdfs,
                links: matchingLinks,
                whiteboards: matchingWhiteboards,
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

export const getMentionItems = query({
  args: {
    query: v.optional(v.string()),
    workingSpaceId: v.optional(v.id("workingSpaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const normalizedQuery = normalizeSearchText(args.query?.trim());
    const isSearching = normalizedQuery.length > 0;

    const workspaces = await ctx.db
      .query("workingSpaces")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const wsMap = new Map(workspaces.map((ws) => [String(ws._id), ws]));

    const allTables: any[] = [];
    for (const ws of workspaces) {
      const tables = await ctx.db
        .query("notesTables")
        .withIndex("by_workingSpaceId", (q) => q.eq("workingSpaceId", ws._id))
        .collect();
      allTables.push(...tables);
    }
    const tableMap = new Map(allTables.map((t) => [String(t._id), t]));

    const rawNotes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(isSearching ? 60 : 30);

    const rawWhiteboards = await ctx.db
      .query("whiteboards")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(isSearching ? 40 : 20);

    const rawPdfs = await ctx.db
      .query("pdfs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(isSearching ? 40 : 20);

    const rawLinks = await ctx.db
      .query("links")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(isSearching ? 40 : 20);

    const formatNote = (note: any) => {
      const ws = note.workingSpaceId
        ? wsMap.get(String(note.workingSpaceId))
        : undefined;
      const table = note.notesTableId
        ? tableMap.get(String(note.notesTableId))
        : undefined;
      const preview = note.preview ?? computeNotePreview(note.body);
      return {
        _id: String(note._id),
        kind: "note" as const,
        title: note.title || "Untitled note",
        subtitle: preview
          ? truncateText(preview, 80)
          : table?.name
            ? `In ${table.name}`
            : undefined,
        preview: preview,
        href: `/home/${note.workingSpaceId}/${note.slug || note._id}?id=${note._id}`,
        tableName: table?.name,
        workingSpaceId: note.workingSpaceId
          ? String(note.workingSpaceId)
          : undefined,
        workingSpaceName: ws?.name,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      };
    };

    const formatWhiteboard = (board: any) => {
      const ws = board.workingSpaceId
        ? wsMap.get(String(board.workingSpaceId))
        : undefined;
      const table = board.notesTableId
        ? tableMap.get(String(board.notesTableId))
        : undefined;
      return {
        _id: String(board._id),
        kind: "whiteboard" as const,
        title: board.title || "Untitled whiteboard",
        subtitle: table?.name ? `In ${table.name}` : "Whiteboard",
        snapshot: board.snapshot,
        preview: board.preview,
        href: `/home/${board.workingSpaceId}/${generateSlug(board.title || "untitled-whiteboard")}?whiteboardId=${board._id}`,
        tableName: table?.name,
        workingSpaceId: board.workingSpaceId
          ? String(board.workingSpaceId)
          : undefined,
        workingSpaceName: ws?.name,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      };
    };

    const formatPdf = (pdf: any) => {
      const ws = pdf.workingSpaceId
        ? wsMap.get(String(pdf.workingSpaceId))
        : undefined;
      const table = pdf.notesTableId
        ? tableMap.get(String(pdf.notesTableId))
        : undefined;
      return {
        _id: String(pdf._id),
        kind: "pdf" as const,
        title: pdf.title || "Untitled PDF",
        subtitle: table?.name ? `In ${table.name}` : "PDF upload",
        href: `/home/${pdf.workingSpaceId}/${generateSlug(pdf.title || "untitled-pdf")}?pdfId=${pdf._id}`,
        tableName: table?.name,
        workingSpaceId: pdf.workingSpaceId
          ? String(pdf.workingSpaceId)
          : undefined,
        workingSpaceName: ws?.name,
        createdAt: pdf.createdAt,
        updatedAt: pdf.updatedAt,
      };
    };

    const formatLink = (link: any) => {
      const ws = link.workingSpaceId
        ? wsMap.get(String(link.workingSpaceId))
        : undefined;
      const table = link.notesTableId
        ? tableMap.get(String(link.notesTableId))
        : undefined;
      const title =
        link.title ||
        link.metadata?.authorName ||
        link.metadata?.siteName ||
        link.url;
      return {
        _id: String(link._id),
        kind: "link" as const,
        title: title || "Untitled link",
        subtitle: link.metadata?.description
          ? truncateText(link.metadata.description, 80)
          : link.url,
        url: link.url,
        platform: link.platform,
        metadata: link.metadata,
        href: link.url,
        tableName: table?.name,
        workingSpaceId: link.workingSpaceId
          ? String(link.workingSpaceId)
          : undefined,
        workingSpaceName: ws?.name,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      };
    };

    let formattedNotes = rawNotes.map(formatNote);
    let formattedWhiteboards = rawWhiteboards.map(formatWhiteboard);
    let formattedPdfs = rawPdfs.map(formatPdf);
    let formattedLinks = rawLinks.map(formatLink);

    if (isSearching) {
      formattedNotes = formattedNotes.filter(
        (n) =>
          normalizeSearchText(n.title).includes(normalizedQuery) ||
          normalizeSearchText(n.preview).includes(normalizedQuery) ||
          normalizeSearchText(n.tableName).includes(normalizedQuery),
      );
      formattedWhiteboards = formattedWhiteboards.filter(
        (w) =>
          normalizeSearchText(w.title).includes(normalizedQuery) ||
          normalizeSearchText(w.tableName).includes(normalizedQuery),
      );
      formattedPdfs = formattedPdfs.filter(
        (p) =>
          normalizeSearchText(p.title).includes(normalizedQuery) ||
          normalizeSearchText(p.tableName).includes(normalizedQuery),
      );
      formattedLinks = formattedLinks.filter(
        (l) =>
          normalizeSearchText(l.title).includes(normalizedQuery) ||
          normalizeSearchText(l.subtitle).includes(normalizedQuery) ||
          normalizeSearchText(l.url).includes(normalizedQuery),
      );
    }

    const all = [
      ...formattedNotes,
      ...formattedWhiteboards,
      ...formattedPdfs,
      ...formattedLinks,
    ];

    if (args.workingSpaceId) {
      const targetWs = String(args.workingSpaceId);
      all.sort((a, b) => {
        const aMatches = a.workingSpaceId === targetWs ? 1 : 0;
        const bMatches = b.workingSpaceId === targetWs ? 1 : 0;
        if (aMatches !== bMatches) return bMatches - aMatches;
        return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
      });
    } else {
      all.sort(
        (a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt),
      );
    }

    return all.slice(0, 30);
  },
});

export const resolveHoverItem = query({
  args: {
    itemId: v.optional(v.string()),
    kind: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    let { itemId, kind, url } = args;

    if (!itemId && url) {
      try {
        const parsed = new URL(url, "http://localhost");
        const idParam = parsed.searchParams.get("id");
        const pdfParam = parsed.searchParams.get("pdfId");
        const whiteboardParam = parsed.searchParams.get("whiteboardId");

        if (idParam) {
          itemId = idParam;
          kind = "note";
        } else if (pdfParam) {
          itemId = pdfParam;
          kind = "pdf";
        } else if (whiteboardParam) {
          itemId = whiteboardParam;
          kind = "whiteboard";
        }
      } catch {
        // ignore url parsing error
      }
    }

    if (itemId) {
      try {
        const doc = await ctx.db.get(itemId as any);
        if (doc) {
          if ("body" in doc || kind === "note") {
            const note = doc as any;
            const preview = note.preview ?? computeNotePreview(note.body);
            return {
              kind: "note" as const,
              _id: String(note._id),
              title: note.title || "Untitled note",
              preview: preview,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
              workingSpaceId: note.workingSpaceId
                ? String(note.workingSpaceId)
                : undefined,
              slug: note.slug,
              href: `/home/${note.workingSpaceId}/${note.slug || note._id}?id=${note._id}`,
            };
          }
          if ("snapshot" in doc || kind === "whiteboard") {
            const board = doc as any;
            return {
              kind: "whiteboard" as const,
              _id: String(board._id),
              title: board.title || "Untitled whiteboard",
              snapshot: board.snapshot,
              preview: board.preview,
              createdAt: board.createdAt,
              updatedAt: board.updatedAt,
              workingSpaceId: board.workingSpaceId
                ? String(board.workingSpaceId)
                : undefined,
              href: `/home/${board.workingSpaceId}/${generateSlug(board.title || "untitled-whiteboard")}?whiteboardId=${board._id}`,
            };
          }
          if ("storageId" in doc || kind === "pdf") {
            const pdf = doc as any;
            return {
              kind: "pdf" as const,
              _id: String(pdf._id),
              title: pdf.title || "Untitled PDF",
              createdAt: pdf.createdAt,
              updatedAt: pdf.updatedAt,
              workingSpaceId: pdf.workingSpaceId
                ? String(pdf.workingSpaceId)
                : undefined,
              href: `/home/${pdf.workingSpaceId}/${generateSlug(pdf.title || "untitled-pdf")}?pdfId=${pdf._id}`,
            };
          }
          if ("platform" in doc || kind === "link") {
            const link = doc as any;
            return {
              kind: "link" as const,
              _id: String(link._id),
              title:
                link.title ||
                link.metadata?.authorName ||
                link.metadata?.siteName ||
                link.url,
              url: link.url,
              platform: link.platform,
              metadata: link.metadata,
              createdAt: link.createdAt,
              updatedAt: link.updatedAt,
              href: link.url,
            };
          }
        }
      } catch {
        // doc lookup error
      }
    }

    if (url && userId) {
      const userLink = await ctx.db
        .query("links")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("url"), url))
        .first();

      if (userLink) {
        return {
          kind: "link" as const,
          _id: String(userLink._id),
          title:
            userLink.title ||
            userLink.metadata?.authorName ||
            userLink.metadata?.siteName ||
            userLink.url,
          url: userLink.url,
          platform: userLink.platform,
          metadata: userLink.metadata,
          createdAt: userLink.createdAt,
          updatedAt: userLink.updatedAt,
          href: userLink.url,
        };
      }
    }

    return null;
  },
});

