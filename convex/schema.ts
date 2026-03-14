import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
export default defineSchema({
  ...authTables,
  messages: defineTable({
    userId: v.id("users"),
    body: v.string(),
  }),

  workingSpaces: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_slug", ["slug"]),

  notesTables: defineTable({
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    workingSpaceId: v.id("workingSpaces"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workingSpaceId", ["workingSpaceId"])
    .index("by_slug", ["slug"]),

  notes: defineTable({
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    workingSpacesSlug: v.optional(v.string()),
    workingSpaceId: v.optional(v.id("workingSpaces")),
    userId: v.optional(v.id("users")),
    body: v.optional(v.string()),
    preview: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
    published: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    tags: v.optional(v.array(v.id("tags"))),
    notesTableId: v.optional(v.id("notesTables")),
    order: v.optional(v.number()),
  })
    .index("by_notesTableId", ["notesTableId"])
    .index("by_workingSpaceId", ["workingSpaceId"])
    .index("by_slug", ["slug"])
    .index("by_userId", ["userId"]),

  tags: defineTable({
    name: v.optional(v.string()),
    noteId: v.optional(v.id("notes")),
  }),
});
