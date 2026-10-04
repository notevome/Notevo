import type { ConvexReactClient } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

export type PrefetchedNote = FunctionReturnType<typeof api.notes.getNoteById>;

const NOTE_CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHED_NOTES = 100;
const notes = new Map<string, { value: PrefetchedNote; expiresAt: number }>();
const requests = new Map<string, Promise<PrefetchedNote>>();

export function getPrefetchedNote(noteId: string) {
  const entry = notes.get(noteId);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    notes.delete(noteId);
    return undefined;
  }
  return entry.value;
}

export function cachePrefetchedNote(note: PrefetchedNote) {
  const noteId = String(note._id);
  if (!notes.has(noteId) && notes.size >= MAX_CACHED_NOTES) {
    const oldestNoteId = notes.keys().next().value;
    if (oldestNoteId) notes.delete(oldestNoteId);
  }
  notes.delete(noteId);
  notes.set(noteId, {
    value: note,
    expiresAt: Date.now() + NOTE_CACHE_TTL_MS,
  });
}

export function prefetchNote(
  convex: ConvexReactClient,
  noteId: string,
): Promise<PrefetchedNote> {
  const cachedNote = getPrefetchedNote(noteId);
  if (cachedNote) return Promise.resolve(cachedNote);

  const existingRequest = requests.get(noteId);
  if (existingRequest) return existingRequest;

  const request = convex
    .query(api.notes.getNoteById, { _id: noteId as Id<"notes"> })
    .then((note) => {
      cachePrefetchedNote(note);
      return note;
    })
    .finally(() => {
      if (requests.get(noteId) === request) requests.delete(noteId);
    });

  requests.set(noteId, request);
  return request;
}
