import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { linkMetadataValidator, linkPlatformValidator } from "./linkValidators";

export default defineSchema({
  ...authTables,
  messages: defineTable({
    userId: v.id("users"),
    body: v.string(),
  }),

  folders: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_slug", ["slug"]),

  tables: defineTable({
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    workingSpaceId: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_folderId", ["folderId"])
    .index("by_slug", ["slug"]),

  documents: defineTable({
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    folderSlug: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    userId: v.optional(v.id("users")),
    body: v.optional(v.string()),
    preview: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
    published: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    tags: v.optional(v.array(v.id("tags"))),
    tableId: v.optional(v.id("tables")),
    order: v.optional(v.number()),
    notesTableId: v.optional(v.any()),
    workingSpaceId: v.optional(v.any()),
  })
    .index("by_tableId", ["tableId"])
    .index("by_folderId", ["folderId"])
    .index("by_slug", ["slug"])
    .index("by_userId", ["userId"]),

  terminologyMigrationMap: defineTable({
    sourceTable: v.string(),
    sourceId: v.string(),
    destinationId: v.string(),
  }).index("by_source", ["sourceTable", "sourceId"]),

  tags: defineTable({
    name: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
  }),

  pdfs: defineTable({
    storageId: v.id("_storage"),
    userId: v.id("users"),
    folderId: v.optional(v.id("folders")),
    tableId: v.optional(v.id("tables")),
    workingSpaceId: v.optional(v.any()),
    notesTableId: v.optional(v.any()),
    title: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_folderId", ["folderId"])
    .index("by_tableId", ["tableId"]),

  whiteboards: defineTable({
    userId: v.id("users"),
    folderId: v.optional(v.id("folders")),
    tableId: v.optional(v.id("tables")),
    workingSpaceId: v.optional(v.any()),
    notesTableId: v.optional(v.any()),
    title: v.string(),
    snapshot: v.optional(v.string()),
    preview: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_folderId", ["folderId"])
    .index("by_tableId", ["tableId"]),

  links: defineTable({
    url: v.string(),
    platform: linkPlatformValidator,
    metadata: linkMetadataValidator,
    userId: v.id("users"),
    folderId: v.optional(v.id("folders")),
    tableId: v.optional(v.id("tables")),
    workingSpaceId: v.optional(v.any()),
    notesTableId: v.optional(v.any()),
    title: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_folderId", ["folderId"])
    .index("by_tableId", ["tableId"]),
});
