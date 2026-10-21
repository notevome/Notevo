import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateSlug } from "../lib/generateSlug";
import { buildItemSlug, extractIdFromSlug } from "../lib/slug";
import { paginationOptsValidator } from "convex/server";
import {
  extractTextFromTiptap,
  truncateText,
} from "../lib/parse-tiptap-content";

const DOCUMENT_PREVIEW_MAX_CHARS = 200;
const TREE_DOCUMENTS_PER_TABLE = 3;
const TREE_TABLES_PER_FOLDER = 3;

function normalizeSearchText(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function computeDocumentPreview(body: string | undefined): string | undefined {
  if (!body) return undefined;
  const text = extractTextFromTiptap(body).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return truncateText(text, DOCUMENT_PREVIEW_MAX_CHARS);
}

function toDocumentListItem(doc: any) {
  const preview = doc.preview ?? computeDocumentPreview(doc.body);
  const { body, ...rest } = doc;
  const folderId = doc.folderId ?? doc.workingSpaceId;
  const tableId = doc.tableId ?? doc.notesTableId;
  return {
    ...rest,
    preview,
    folderId,
    workingSpaceId: folderId,
    tableId,
    notesTableId: tableId,
  };
}

export const createDocument = mutation({
  args: {
    title: v.string(),
    tableId: v.optional(v.id("tables")),
    folderSlug: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    // Compat fields
    notesTableId: v.optional(v.any()),
    workingSpacesSlug: v.optional(v.string()),
    workingSpaceId: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const tableId = args.tableId ?? (args.notesTableId as any);
    const folderId = args.folderId ?? (args.workingSpaceId as any);
    const folderSlug = args.folderSlug ?? args.workingSpacesSlug ?? "";

    if (tableId) {
      const table = await ctx.db.get(tableId);
      if (!table) {
        throw new ConvexError("Table not found");
      }
    }

    if (folderId) {
      const folder = (await ctx.db.get(folderId)) as Doc<"folders"> | null;
      if (!folder) {
        throw new ConvexError("Folder not found");
      }
      if (folder.userId !== userId) {
        throw new ConvexError("Not authorized to create documents in this folder");
      }
    }

    const generateSlugName = generateSlug(args.title);
    let slug = generateSlugName;
    let existingDoc = await ctx.db
      .query("documents")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingDoc) {
      slug = `${generateSlugName}-${counter}`;
      existingDoc = await ctx.db
        .query("documents")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }

    const doc = {
      userId,
      title: args.title,
      ...(tableId ? { tableId } : {}),
      folderSlug,
      slug,
      folderId,
      favorite: false,
      published: false,
      preview: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return await ctx.db.insert("documents", doc as any);
  },
});
export const createNote = createDocument;

export const updateDocument = mutation({
  args: {
    _id: v.id("documents"),
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
    const doc = await ctx.db.get(_id);
    if (!doc) {
      throw new ConvexError("Document not found");
    }

    if (doc.userId !== userId) {
      throw new ConvexError("Not authorized to update this document");
    }

    const generateSlugName = generateSlug(title ?? doc.title ?? "Untitled");
    let slug = generateSlugName;
    let existingDoc = await ctx.db
      .query("documents")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let counter = 1;
    while (existingDoc && existingDoc._id !== _id) {
      slug = `${generateSlugName}-${counter}`;
      existingDoc = await ctx.db
        .query("documents")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      counter++;
    }

    const update = {
      ...doc,
      title: title ?? doc.title,
      body: body ?? doc.body,
      preview:
        body !== undefined ? computeDocumentPreview(body) : (doc as any).preview,
      slug,
      updatedAt: Date.now(),
      order: order ?? doc.order,
      favorite: favorite ?? doc.favorite,
      published: published ?? doc.published,
    };

    return await ctx.db.replace(_id, update);
  },
});
export const updateNote = updateDocument;

export const updateDocumentOrder = mutation({
  args: {
    tableId: v.id("tables"),
    documentIds: v.optional(v.array(v.id("documents"))),
    noteIds: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { tableId } = args;
    const documentIds = args.documentIds ?? args.noteIds ?? [];

    const table = (await ctx.db.get(tableId)) as Doc<"tables"> | null;
    if (!table) {
      throw new ConvexError("Table not found");
    }

    if (table.folderId) {
      const folder = (await ctx.db.get(table.folderId)) as Doc<"folders"> | null;
      if (folder && folder.userId !== userId) {
        throw new ConvexError("Not authorized to update order in this table");
      }
    }

    await Promise.all(
      documentIds.map(async (docId, index) => {
        const doc = await ctx.db.get(docId);
        if (!doc) {
          throw new ConvexError(`Document ${docId} not found`);
        }

        if (doc.tableId !== tableId) {
          throw new ConvexError(
            `Document ${docId} does not belong to table ${tableId}`,
          );
        }

        if (doc.userId !== userId) {
          throw new ConvexError(`Not authorized to update document ${docId}`);
        }

        return ctx.db.patch(docId, {
          order: index,
          updatedAt: Date.now(),
        });
      }),
    );

    return { success: true, updatedDocuments: documentIds.length };
  },
});
export const updateNoteOrder = updateDocumentOrder;

export const deleteDocument = mutation({
  args: {
    _id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id } = args;
    const doc = await ctx.db.get(_id);
    if (!doc) {
      throw new ConvexError("Document not found");
    }

    if (doc.userId !== userId) {
      throw new ConvexError("Not authorized to delete this document");
    }

    await ctx.db.delete(_id);
    return _id;
  },
});
export const deleteNote = deleteDocument;

export const getDocumentsByTableId = query({
  args: {
    tableId: v.optional(v.id("tables")),
    notesTableId: v.optional(v.any()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const tableId = (args.tableId ?? args.notesTableId) as any;

    const result = await ctx.db
      .query("documents")
      .withIndex("by_tableId", (q) => q.eq("tableId", tableId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map(toDocumentListItem),
    };
  },
});
export const getNotesByTableId = getDocumentsByTableId;

export const moveDocument = mutation({
  args: {
    _id: v.id("documents"),
    targetFolderId: v.optional(v.id("folders")),
    targetTableId: v.optional(v.id("tables")),
    // Compat args
    targetWorkingSpaceId: v.optional(v.any()),
    targetNotesTableId: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const { _id } = args;
    const targetFolderId = args.targetFolderId ?? args.targetWorkingSpaceId;
    const targetTableId = args.targetTableId ?? args.targetNotesTableId;

    const doc = await ctx.db.get(_id);
    if (!doc) {
      throw new ConvexError("Document not found");
    }

    if (doc.userId !== userId) {
      throw new ConvexError("Not authorized to move this document");
    }

    const targetFolder = (await ctx.db.get(targetFolderId)) as Doc<"folders"> | null;
    if (!targetFolder) {
      throw new ConvexError("Target folder not found");
    }

    if (targetFolder.userId !== userId) {
      throw new ConvexError("Not authorized to use this folder");
    }

    const targetTable = (await ctx.db.get(targetTableId)) as Doc<"tables"> | null;
    if (!targetTable) {
      throw new ConvexError("Target table not found");
    }

    if (targetTable.folderId && targetTable.folderId !== targetFolderId) {
      throw new ConvexError("Target table does not belong to this folder");
    }

    await ctx.db.patch(_id, {
      folderId: targetFolderId,
      folderSlug: targetFolder.slug ?? doc.folderSlug,
      tableId: targetTableId,
      updatedAt: Date.now(),
    });

    return {
      documentId: _id,
      noteId: _id,
      folderId: targetFolderId,
      workingSpaceId: targetFolderId,
      folderSlug: targetFolder.slug,
      workingSpacesSlug: targetFolder.slug,
      tableId: targetTableId,
      notesTableId: targetTableId,
      slug: doc.slug,
    };
  },
});
export const moveNote = moveDocument;

export const getDocumentByUserId = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, searchQuery }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const allDocs = await ctx.db
        .query("documents")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();

      const lowerQuery = normalizeSearchText(searchQuery);
      const matchedDocs = allDocs.filter((d) =>
        normalizeSearchText(d.title).includes(lowerQuery),
      );

      return {
        page: matchedDocs.map(toDocumentListItem),
        continueCursor: "",
        isDone: true,
      };
    }

    const result = await ctx.db
      .query("documents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);

    return {
      ...result,
      page: result.page.map(toDocumentListItem),
    };
  },
});
export const getNoteByUserId = getDocumentByUserId;

export const getDocumentById = query({
  args: {
    _id: v.id("documents"),
    isPublish: v.optional(v.boolean()) || false,
  },
  handler: async (ctx, args) => {
    const { _id, isPublish } = args;
    const userId = await getAuthUserId(ctx);
    if (!userId && isPublish === false) {
      throw new ConvexError("Not authenticated");
    }
    const doc = await ctx.db.get(_id);
    if (!doc) {
      throw new ConvexError("Document not found");
    }
    if (doc.userId !== userId && doc.published === false) {
      throw new ConvexError("You are not authorized to access this document");
    }
    const folderId = doc.folderId ?? (doc as any).workingSpaceId;
    const tableId = doc.tableId ?? (doc as any).notesTableId;
    return {
      ...doc,
      folderId,
      workingSpaceId: folderId,
      tableId,
      notesTableId: tableId,
    };
  },
});
export const getNoteById = getDocumentById;

export const getItemType = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    if (!args.id) return null;
    const docId = ctx.db.normalizeId("documents", args.id);
    if (docId) return "note";
    const wbId = ctx.db.normalizeId("whiteboards", args.id);
    if (wbId) return "whiteboard";
    const pdfId = ctx.db.normalizeId("pdfs", args.id);
    if (pdfId) return "pdf";
    return null;
  },
});

export const getFavDocuments = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }
    const result = await ctx.db
      .query("documents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("favorite"), true))
      .order("desc")
      .paginate(paginationOpts);

    const validPage = (
      await Promise.all(
        result.page.map(async (doc) => {
          if (doc.folderId) {
            const folder = await ctx.db.get(doc.folderId);
            if (!folder) return null;
          }
          if (doc.tableId) {
            const table = await ctx.db.get(doc.tableId);
            if (!table) return null;
          }
          return toDocumentListItem(doc);
        }),
      )
    ).filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      ...result,
      page: validPage,
    };
  },
});
export const getFavNotes = getFavDocuments;

export const getFolderTreeForMove = query({
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

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const targets = await Promise.all(
      folders.map(async (folder) => {
        const allTables = await ctx.db
          .query("tables")
          .withIndex("by_folderId", (q) => q.eq("folderId", folder._id))
          .collect();

        const sortedTables = allTables.sort(
          (a, b) => b.updatedAt - a.updatedAt,
        );

        if (!isSearching) {
          return { ...folder, tables: sortedTables };
        }

        const folderMatches = normalizeSearchText(folder.name).includes(
          normalizedQuery,
        );

        if (folderMatches) {
          return { ...folder, tables: sortedTables };
        }

        const matchingTables = sortedTables.filter((table) =>
          normalizeSearchText(table.name).includes(normalizedQuery),
        );

        if (matchingTables.length > 0) {
          return { ...folder, tables: matchingTables };
        }

        return null;
      }),
    );

    return targets.filter(Boolean) as NonNullable<(typeof targets)[number]>[];
  },
});
export const getWorkspaceTreeForMove = getFolderTreeForMove;

export const getFolderTree = query({
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

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const targets = await Promise.all(
      folders.map(async (folder) => {
        const allTables = await ctx.db
          .query("tables")
          .withIndex("by_folderId", (q) => q.eq("folderId", folder._id))
          .collect();

        const sortedTables = allTables.sort(
          (a, b) => b.updatedAt - a.updatedAt,
        );

        const tablesToProcess = isSearching
          ? sortedTables
          : sortedTables.slice(0, TREE_TABLES_PER_FOLDER);

        const tablesWithDocs = await Promise.all(
          tablesToProcess.map(async (table) => {
            if (isSearching) {
              const allDocs = await ctx.db
                .query("documents")
                .withIndex("by_tableId", (q) => q.eq("tableId", table._id))
                .order("desc")
                .collect();
              const allPdfs = await ctx.db
                .query("pdfs")
                .withIndex("by_tableId", (q) => q.eq("tableId", table._id))
                .order("desc")
                .collect();
              const allLinks = await ctx.db
                .query("links")
                .withIndex("by_tableId", (q) => q.eq("tableId", table._id))
                .order("desc")
                .collect();
              const allWhiteboards = await ctx.db
                .query("whiteboards")
                .withIndex("by_tableId", (q) => q.eq("tableId", table._id))
                .order("desc")
                .collect();

              return {
                ...table,
                notes: allDocs.map(({ body, ...rest }) => rest),
                documents: allDocs.map(({ body, ...rest }) => rest),
                pdfs: allPdfs,
                links: allLinks,
                whiteboards: allWhiteboards,
              };
            }

            const firstDocs = await ctx.db
              .query("documents")
              .withIndex("by_tableId", (q) => q.eq("tableId", table._id))
              .order("desc")
              .take(TREE_DOCUMENTS_PER_TABLE);
            const firstPdfs = await ctx.db
              .query("pdfs")
              .withIndex("by_tableId", (q) => q.eq("tableId", table._id))
              .order("desc")
              .take(TREE_DOCUMENTS_PER_TABLE);
            const firstLinks = await ctx.db
              .query("links")
              .withIndex("by_tableId", (q) => q.eq("tableId", table._id))
              .order("desc")
              .take(TREE_DOCUMENTS_PER_TABLE);
            const firstWhiteboards = await ctx.db
              .query("whiteboards")
              .withIndex("by_tableId", (q) => q.eq("tableId", table._id))
              .order("desc")
              .take(TREE_DOCUMENTS_PER_TABLE);

            return {
              ...table,
              notes: firstDocs.map(({ body, ...rest }) => rest),
              documents: firstDocs.map(({ body, ...rest }) => rest),
              pdfs: firstPdfs,
              links: firstLinks,
              whiteboards: firstWhiteboards,
            };
          }),
        );

        const nonEmptyTables = tablesWithDocs.filter(
          (table) =>
            table.documents.length > 0 ||
            table.pdfs.length > 0 ||
            (table.links?.length ?? 0) > 0 ||
            (table.whiteboards?.length ?? 0) > 0,
        );

        if (nonEmptyTables.length === 0) return null;

        if (!isSearching) {
          return { ...folder, tables: nonEmptyTables };
        }

        const folderMatches = normalizeSearchText(folder.name).includes(
          normalizedQuery,
        );

        const filteredTables = nonEmptyTables
          .map((table) => {
            const tableMatches = normalizeSearchText(table.name).includes(
              normalizedQuery,
            );
            const matchingDocs = table.documents.filter((d: any) =>
              normalizeSearchText(d.title).includes(normalizedQuery),
            );
            const matchingPdfs = table.pdfs.filter((pdf: any) =>
              normalizeSearchText(pdf.title).includes(normalizedQuery),
            );
            const matchingLinks = (table.links ?? []).filter((link: any) =>
              normalizeSearchText(link.title).includes(normalizedQuery),
            );
            const matchingWhiteboards = (table.whiteboards ?? []).filter(
              (board: any) =>
                normalizeSearchText(board.title).includes(normalizedQuery),
            );

            if (tableMatches) return table;
            if (
              matchingDocs.length > 0 ||
              matchingPdfs.length > 0 ||
              matchingLinks.length > 0 ||
              matchingWhiteboards.length > 0
            )
              return {
                ...table,
                notes: matchingDocs,
                documents: matchingDocs,
                pdfs: matchingPdfs,
                links: matchingLinks,
                whiteboards: matchingWhiteboards,
              };

            return null;
          })
          .filter(Boolean);

        if (filteredTables.length === 0) return null;

        return { ...folder, tables: filteredTables };
      }),
    );

    return targets.filter(Boolean) as NonNullable<(typeof targets)[number]>[];
  },
});
export const getWorkspaceTree = getFolderTree;

export const getMentionItems = query({
  args: {
    query: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    workingSpaceId: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const normalizedQuery = normalizeSearchText(args.query?.trim());
    const isSearching = normalizedQuery.length > 0;

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const folderMap = new Map(folders.map((f) => [String(f._id), f]));

    const allTables: any[] = [];
    for (const f of folders) {
      const tables = await ctx.db
        .query("tables")
        .withIndex("by_folderId", (q) => q.eq("folderId", f._id))
        .collect();
      allTables.push(...tables);
    }
    const tableMap = new Map(allTables.map((t) => [String(t._id), t]));

    const rawDocs = await ctx.db
      .query("documents")
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

    const formatDoc = (doc: any) => {
      const folder = doc.folderId
        ? folderMap.get(String(doc.folderId))
        : undefined;
      const table = doc.tableId
        ? tableMap.get(String(doc.tableId))
        : undefined;
      const preview = doc.preview ?? computeDocumentPreview(doc.body);
      return {
        _id: String(doc._id),
        kind: "note" as const,
        title: doc.title || "Untitled note",
        subtitle: preview
          ? truncateText(preview, 80)
          : table?.name
            ? `In ${table.name}`
            : undefined,
        preview,
        href: `/home/${doc.folderId}/${buildItemSlug(doc.title || doc.slug, doc._id)}`,
        tableName: table?.name,
        workingSpaceId: doc.folderId ? String(doc.folderId) : undefined,
        folderId: doc.folderId ? String(doc.folderId) : undefined,
        workingSpaceName: folder?.name,
        folderName: folder?.name,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    };

    const formatWhiteboard = (board: any) => {
      const folder = board.folderId
        ? folderMap.get(String(board.folderId))
        : undefined;
      const table = board.tableId
        ? tableMap.get(String(board.tableId))
        : undefined;
      return {
        _id: String(board._id),
        kind: "whiteboard" as const,
        title: board.title || "Untitled whiteboard",
        subtitle: table?.name ? `In ${table.name}` : "Whiteboard",
        snapshot: board.snapshot,
        preview: board.preview,
        href: `/home/${board.folderId}/${buildItemSlug(board.title || "untitled-whiteboard", board._id)}`,
        tableName: table?.name,
        workingSpaceId: board.folderId ? String(board.folderId) : undefined,
        folderId: board.folderId ? String(board.folderId) : undefined,
        workingSpaceName: folder?.name,
        folderName: folder?.name,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      };
    };

    const formatPdf = (pdf: any) => {
      const folder = pdf.folderId
        ? folderMap.get(String(pdf.folderId))
        : undefined;
      const table = pdf.tableId
        ? tableMap.get(String(pdf.tableId))
        : undefined;
      return {
        _id: String(pdf._id),
        kind: "pdf" as const,
        title: pdf.title || "Untitled PDF",
        subtitle: table?.name ? `In ${table.name}` : "PDF upload",
        href: `/home/${pdf.folderId}/${buildItemSlug(pdf.title || "untitled-pdf", pdf._id)}`,
        tableName: table?.name,
        workingSpaceId: pdf.folderId ? String(pdf.folderId) : undefined,
        folderId: pdf.folderId ? String(pdf.folderId) : undefined,
        workingSpaceName: folder?.name,
        folderName: folder?.name,
        createdAt: pdf.createdAt,
        updatedAt: pdf.updatedAt,
      };
    };

    const formatLink = (link: any) => {
      const folder = link.folderId
        ? folderMap.get(String(link.folderId))
        : undefined;
      const table = link.tableId
        ? tableMap.get(String(link.tableId))
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
        workingSpaceId: link.folderId ? String(link.folderId) : undefined,
        folderId: link.folderId ? String(link.folderId) : undefined,
        workingSpaceName: folder?.name,
        folderName: folder?.name,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      };
    };

    let formattedDocs = rawDocs.map(formatDoc);
    let formattedWhiteboards = rawWhiteboards.map(formatWhiteboard);
    let formattedPdfs = rawPdfs.map(formatPdf);
    let formattedLinks = rawLinks.map(formatLink);

    if (isSearching) {
      formattedDocs = formattedDocs.filter(
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
      ...formattedDocs,
      ...formattedWhiteboards,
      ...formattedPdfs,
      ...formattedLinks,
    ];

    const targetFolderId = args.folderId ?? args.workingSpaceId;
    if (targetFolderId) {
      const targetStr = String(targetFolderId);
      all.sort((a, b) => {
        const aMatches = a.folderId === targetStr ? 1 : 0;
        const bMatches = b.folderId === targetStr ? 1 : 0;
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
        } else {
          const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
          const slugId = extractIdFromSlug(lastSegment);
          if (slugId) {
            itemId = slugId;
          }
        }
      } catch {
        // ignore url parsing error
      }
    }

    if (itemId) {
      try {
        const doc = await ctx.db.get(itemId as any);
        if (doc) {
          if ("body" in doc || kind === "note" || kind === "document") {
            const documentItem = doc as any;
            const preview =
              documentItem.preview ?? computeDocumentPreview(documentItem.body);
            const folderId = documentItem.folderId ?? documentItem.workingSpaceId;
            return {
              kind: "note" as const,
              _id: String(documentItem._id),
              title: documentItem.title || "Untitled note",
              preview,
              createdAt: documentItem.createdAt,
              updatedAt: documentItem.updatedAt,
              workingSpaceId: folderId ? String(folderId) : undefined,
              folderId: folderId ? String(folderId) : undefined,
              slug: documentItem.slug,
              href: `/home/${folderId}/${buildItemSlug(documentItem.title || documentItem.slug, documentItem._id)}`,
            };
          }
          if ("snapshot" in doc || kind === "whiteboard") {
            const board = doc as any;
            const folderId = board.folderId ?? board.workingSpaceId;
            return {
              kind: "whiteboard" as const,
              _id: String(board._id),
              title: board.title || "Untitled whiteboard",
              snapshot: board.snapshot,
              preview: board.preview,
              createdAt: board.createdAt,
              updatedAt: board.updatedAt,
              workingSpaceId: folderId ? String(folderId) : undefined,
              folderId: folderId ? String(folderId) : undefined,
              href: `/home/${folderId}/${buildItemSlug(board.title || "untitled-whiteboard", board._id)}`,
            };
          }
          if ("storageId" in doc || kind === "pdf") {
            const pdf = doc as any;
            const folderId = pdf.folderId ?? pdf.workingSpaceId;
            return {
              kind: "pdf" as const,
              _id: String(pdf._id),
              title: pdf.title || "Untitled PDF",
              createdAt: pdf.createdAt,
              updatedAt: pdf.updatedAt,
              workingSpaceId: folderId ? String(folderId) : undefined,
              folderId: folderId ? String(folderId) : undefined,
              href: `/home/${folderId}/${buildItemSlug(pdf.title || "untitled-pdf", pdf._id)}`,
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
