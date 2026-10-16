import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

const batchArgs = { limit: v.optional(v.number()) };

async function destinationId(
  ctx: any,
  sourceTable: string,
  sourceId: string,
) {
  const mapping = await ctx.db
    .query("terminologyMigrationMap")
    .withIndex("by_source", (q: any) =>
      q.eq("sourceTable", sourceTable).eq("sourceId", sourceId),
    )
    .unique();
  return mapping?.destinationId as string | undefined;
}

async function remember(
  ctx: any,
  sourceTable: string,
  sourceId: string,
  destinationId: string,
) {
  await ctx.db.insert("terminologyMigrationMap", {
    sourceTable,
    sourceId,
    destinationId,
  });
}

export async function doCopyFolders(ctx: any, limit = 100) {
  let copied = 0;
  for (const workspace of await (ctx.db as any).query("workingSpaces").take(limit)) {
    if (await destinationId(ctx, "workingSpaces", String(workspace._id))) continue;
    const folderId = await ctx.db.insert("folders", {
      name: workspace.name,
      slug: workspace.slug,
      favorite: workspace.favorite,
      userId: workspace.userId,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    });
    await remember(ctx, "workingSpaces", String(workspace._id), String(folderId));
    copied++;
  }
  return { copied };
}

export async function doCopyTables(ctx: any, limit = 100) {
  let copied = 0;
  // Copy from notesTables
  for (const table of await (ctx.db as any).query("notesTables").take(limit)) {
    if (await destinationId(ctx, "notesTables", String(table._id))) continue;
    const folderId = await destinationId(
      ctx,
      "workingSpaces",
      String(table.workingSpaceId),
    );
    const newTableId = await ctx.db.insert("tables", {
      name: table.name,
      slug: table.slug,
      folderId: folderId ? (folderId as any) : undefined,
      workingSpaceId: table.workingSpaceId,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    });
    await remember(ctx, "notesTables", String(table._id), String(newTableId));
    copied++;
  }

  // Also copy any that were created in documentTables
  for (const docTable of await (ctx.db as any).query("documentTables").take(limit)) {
    if (await destinationId(ctx, "documentTables", String(docTable._id))) continue;
    const newTableId = await ctx.db.insert("tables", {
      name: docTable.name,
      slug: docTable.slug,
      folderId: docTable.folderId,
      createdAt: docTable.createdAt,
      updatedAt: docTable.updatedAt,
    });
    await remember(ctx, "documentTables", String(docTable._id), String(newTableId));
    copied++;
  }

  return { copied };
}

export async function doCopyDocuments(ctx: any, limit = 100) {
  let copied = 0;
  for (const note of await (ctx.db as any).query("notes").take(limit)) {
    if (await destinationId(ctx, "notes", String(note._id))) continue;
    const folderId = note.workingSpaceId
      ? await destinationId(ctx, "workingSpaces", String(note.workingSpaceId))
      : undefined;
    const tableId = note.notesTableId
      ? await destinationId(ctx, "notesTables", String(note.notesTableId))
      : undefined;

    const documentId = await ctx.db.insert("documents", {
      title: note.title,
      slug: note.slug,
      folderSlug: note.workingSpacesSlug,
      folderId: folderId as any,
      userId: note.userId,
      body: note.body,
      preview: note.preview,
      favorite: note.favorite,
      published: note.published,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      tableId: tableId as any,
      documentTableId: undefined,
      order: note.order,
    });
    await remember(ctx, "notes", String(note._id), String(documentId));
    copied++;
  }
  return { copied };
}

export async function doCopyRelationships(ctx: any, limit = 100) {
  let patched = 0;
  const mapFolder = async (id: unknown) =>
    id ? await destinationId(ctx, "workingSpaces", String(id)) : undefined;
  const mapTable = async (id: unknown) =>
    id ? await destinationId(ctx, "notesTables", String(id)) : undefined;

  for (const tag of await (ctx.db as any).query("tags").take(limit)) {
    if (!tag.noteId || tag.documentId) continue;
    const documentId = await destinationId(ctx, "notes", String(tag.noteId));
    if (documentId) {
      await ctx.db.patch(tag._id, { documentId: documentId as any });
      patched++;
    }
  }

  for (const pdf of await (ctx.db as any).query("pdfs").take(limit)) {
    if (pdf.folderId && pdf.tableId) continue;
    const [folderId, tableId] = await Promise.all([
      pdf.folderId ?? mapFolder(pdf.workingSpaceId),
      pdf.tableId ?? mapTable(pdf.notesTableId),
    ]);
    const updates: any = {};
    if (folderId && !pdf.folderId) updates.folderId = folderId as any;
    if (tableId && !pdf.tableId) updates.tableId = tableId as any;
    if (Object.keys(updates).length) {
      await ctx.db.patch(pdf._id, updates);
      patched++;
    }
  }

  for (const whiteboard of await (ctx.db as any).query("whiteboards").take(limit)) {
    if (whiteboard.folderId && whiteboard.tableId) continue;
    const [folderId, tableId] = await Promise.all([
      whiteboard.folderId ?? mapFolder(whiteboard.workingSpaceId),
      whiteboard.tableId ?? mapTable(whiteboard.notesTableId),
    ]);
    const updates: any = {};
    if (folderId && !whiteboard.folderId) updates.folderId = folderId as any;
    if (tableId && !whiteboard.tableId) updates.tableId = tableId as any;
    if (Object.keys(updates).length) {
      await ctx.db.patch(whiteboard._id, updates);
      patched++;
    }
  }

  for (const link of await (ctx.db as any).query("links").take(limit)) {
    if (link.folderId && link.tableId) continue;
    const [folderId, tableId] = await Promise.all([
      link.folderId ?? mapFolder(link.workingSpaceId),
      link.tableId ?? mapTable(link.notesTableId),
    ]);
    const updates: any = {};
    if (folderId && !link.folderId) updates.folderId = folderId as any;
    if (tableId && !link.tableId) updates.tableId = tableId as any;
    if (Object.keys(updates).length) {
      await ctx.db.patch(link._id, updates);
      patched++;
    }
  }

  return { patched };
}

/** 1. Copy folders: workingSpaces -> folders. Run until copied: 0. */
export const copyFolders = internalMutation({
  args: batchArgs,
  handler: async (ctx, { limit = 100 }) => {
    return doCopyFolders(ctx, limit);
  },
});

/** 2. Copy tables: notesTables (and documentTables) -> tables. Run until copied: 0. */
export const copyTables = internalMutation({
  args: batchArgs,
  handler: async (ctx, { limit = 100 }) => {
    return doCopyTables(ctx, limit);
  },
});

/** 3. Copy documents: notes -> documents. Run until copied: 0. */
export const copyDocuments = internalMutation({
  args: batchArgs,
  handler: async (ctx, { limit = 100 }) => {
    return doCopyDocuments(ctx, limit);
  },
});

/** 4. Copy relationships: tags, pdfs, whiteboards, links. Run until patched: 0. */
export const copyRelationships = internalMutation({
  args: batchArgs,
  handler: async (ctx, { limit = 100 }) => {
    return doCopyRelationships(ctx, limit);
  },
});

/** 5. Run all migration steps in sequence in a loop until everything is fully copied. */
export const runAllMigrations = internalMutation({
  args: { maxBatches: v.optional(v.number()) },
  handler: async (ctx, { maxBatches = 50 }) => {
    const summary = {
      foldersCopied: 0,
      tablesCopied: 0,
      documentsCopied: 0,
      relationshipsPatched: 0,
      batchesRun: 0,
    };

    let batch = 0;
    // 1. Folders
    while (batch < maxBatches) {
      batch++;
      const res = await doCopyFolders(ctx, 100);
      summary.foldersCopied += res.copied;
      if (res.copied === 0) break;
    }

    // 2. Tables
    batch = 0;
    while (batch < maxBatches) {
      batch++;
      const res = await doCopyTables(ctx, 100);
      summary.tablesCopied += res.copied;
      if (res.copied === 0) break;
    }

    // 3. Documents
    batch = 0;
    while (batch < maxBatches) {
      batch++;
      const res = await doCopyDocuments(ctx, 100);
      summary.documentsCopied += res.copied;
      if (res.copied === 0) break;
    }

    // 4. Relationships
    batch = 0;
    while (batch < maxBatches) {
      batch++;
      const res = await doCopyRelationships(ctx, 100);
      summary.relationshipsPatched += res.patched;
      if (res.patched === 0) break;
    }

    return summary;
  },
});

/** Query to check counts in original vs migrated tables so the user can verify all data is intact */
export const getMigrationStatus = query({
  args: {},
  handler: async (ctx) => {
    const [
      workingSpacesCount,
      foldersCount,
      notesTablesCount,
      tablesCount,
      notesCount,
      documentsCount,
      pdfsCount,
      whiteboardsCount,
      linksCount,
      migrationMapCount,
    ] = await Promise.all([
      (ctx.db as any).query("workingSpaces").collect().then((l: any[]) => l.length),
      (ctx.db as any).query("folders").collect().then((l: any[]) => l.length),
      (ctx.db as any).query("notesTables").collect().then((l: any[]) => l.length),
      (ctx.db as any).query("tables").collect().then((l: any[]) => l.length),
      (ctx.db as any).query("notes").collect().then((l: any[]) => l.length),
      (ctx.db as any).query("documents").collect().then((l: any[]) => l.length),
      (ctx.db as any).query("pdfs").collect().then((l: any[]) => l.length),
      (ctx.db as any).query("whiteboards").collect().then((l: any[]) => l.length),
      (ctx.db as any).query("links").collect().then((l: any[]) => l.length),
      (ctx.db as any).query("terminologyMigrationMap").collect().then((l: any[]) => l.length),
    ]);

    return {
      source: {
        workingSpaces: workingSpacesCount,
        notesTables: notesTablesCount,
        notes: notesCount,
      },
      destination: {
        folders: foldersCount,
        tables: tablesCount,
        documents: documentsCount,
      },
      content: {
        pdfs: pdfsCount,
        whiteboards: whiteboardsCount,
        links: linksCount,
      },
      migrationMapEntries: migrationMapCount,
      allIntact:
        foldersCount >= workingSpacesCount &&
        tablesCount >= notesTablesCount &&
        documentsCount >= notesCount,
    };
  },
});
