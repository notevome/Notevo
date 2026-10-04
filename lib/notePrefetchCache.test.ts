import { describe, expect, it, vi } from "vitest";
import type { ConvexReactClient } from "convex/react";
import {
  getPrefetchedNote,
  prefetchNote,
  type PrefetchedNote,
} from "./notePrefetchCache";

describe("note prefetch cache", () => {
  it("deduplicates concurrent fetches and reuses the fetched note", async () => {
    const noteId = `prefetch-test-${crypto.randomUUID()}`;
    const note = { _id: noteId } as unknown as PrefetchedNote;
    const query = vi.fn().mockResolvedValue(note);
    const convex = { query } as unknown as ConvexReactClient;

    const firstRequest = prefetchNote(convex, noteId);
    const secondRequest = prefetchNote(convex, noteId);

    expect(firstRequest).toBe(secondRequest);
    await Promise.all([firstRequest, secondRequest]);

    expect(query).toHaveBeenCalledTimes(1);
    expect(getPrefetchedNote(noteId)).toBe(note);
    await prefetchNote(convex, noteId);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
