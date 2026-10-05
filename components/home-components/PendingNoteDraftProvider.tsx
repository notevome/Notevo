"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMutation } from "convex/react";
import type { JSONContent } from "@tiptap/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

type DraftPhase = "creating" | "saving" | "ready" | "error";
const PENDING_NOTE_DRAFTS_KEY = "notevo_pending_note_drafts";
const DEFAULT_DRAFT_TITLE = "New Quick Access Notes";

export interface PendingNoteDraft {
  token: string;
  workingSpaceId: Id<"workingSpaces">;
  workingSpacesSlug: string;
  originPath: string;
  notesTableId?: Id<"notesTables">;
  noteId?: Id<"notes">;
  title: string;
  initialTitle?: string;
  content?: JSONContent;
  revision: number;
  phase: DraftPhase;
  error?: string;
}

interface PendingNoteDraftContextValue {
  isHydrated: boolean;
  beginNoteDraft: (args: {
    workingSpaceId: Id<"workingSpaces">;
    workingSpacesSlug: string;
    originPath: string;
    notesTableId?: Id<"notesTables">;
    title?: string;
  }) => { token: string; completion: Promise<Id<"notes">> };
  activeDraftToken: string | null;
  getDraft: (token: string) => PendingNoteDraft | undefined;
  updateDraft: (
    token: string,
    updates: Partial<Pick<PendingNoteDraft, "title" | "content">>,
  ) => void;
  retryDraft: (token: string) => void;
  finishDraft: (token: string) => void;
}

const PendingNoteDraftContext =
  createContext<PendingNoteDraftContextValue | null>(null);

export function PendingNoteDraftProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [drafts, setDrafts] = useState<Record<string, PendingNoteDraft>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeDraftToken, setActiveDraftToken] = useState<string | null>(null);
  const draftsRef = useRef(drafts);
  const jobsRef = useRef(new Map<string, Promise<Id<"notes">>>());
  const persistRef = useRef<(token: string) => Promise<Id<"notes">>>(
    async () => {
      throw new Error("Draft persistence is not ready");
    },
  );

  const getOrCreateTable = useMutation(api.notesTables.getOrCreateTable);
  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);

  useEffect(() => {
    let restoredDrafts: Record<string, PendingNoteDraft> = {};
    try {
      const storedDrafts = sessionStorage.getItem(PENDING_NOTE_DRAFTS_KEY);
      if (storedDrafts) {
        const parsed = JSON.parse(storedDrafts) as Record<
          string,
          PendingNoteDraft
        >;
        restoredDrafts = Object.fromEntries(
          Object.entries(parsed).filter(
            ([token, draft]) =>
              draft?.token === token &&
              typeof draft.title === "string" &&
              typeof draft.workingSpaceId === "string",
          ),
        );
      }
    } catch {
      sessionStorage.removeItem(PENDING_NOTE_DRAFTS_KEY);
    }

    const nextDrafts = { ...restoredDrafts, ...draftsRef.current };
    draftsRef.current = nextDrafts;
    setDrafts(nextDrafts);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const timer = window.setTimeout(() => {
      try {
        if (Object.keys(drafts).length) {
          sessionStorage.setItem(
            PENDING_NOTE_DRAFTS_KEY,
            JSON.stringify(drafts),
          );
        } else {
          sessionStorage.removeItem(PENDING_NOTE_DRAFTS_KEY);
        }
      } catch {
        // Keep the active draft in memory if session storage is unavailable.
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [drafts, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    const persistOnPageHide = () => {
      try {
        if (Object.keys(draftsRef.current).length) {
          sessionStorage.setItem(
            PENDING_NOTE_DRAFTS_KEY,
            JSON.stringify(draftsRef.current),
          );
        } else {
          sessionStorage.removeItem(PENDING_NOTE_DRAFTS_KEY);
        }
      } catch {
        // Keep the active draft in memory if session storage is unavailable.
      }
    };
    window.addEventListener("pagehide", persistOnPageHide);
    return () => window.removeEventListener("pagehide", persistOnPageHide);
  }, [isHydrated]);

  const storeDraft = useCallback(
    (token: string, draft: PendingNoteDraft | undefined) => {
      const nextDrafts = { ...draftsRef.current };
      if (draft) nextDrafts[token] = draft;
      else delete nextDrafts[token];
      draftsRef.current = nextDrafts;
      setDrafts(nextDrafts);
    },
    [],
  );

  const persistDraft = useCallback(
    (token: string): Promise<Id<"notes">> => {
      const existingJob = jobsRef.current.get(token);
      if (existingJob) return existingJob;

      const job = (async () => {
        try {
          let draft = draftsRef.current[token];
          if (!draft) throw new Error("Draft is no longer available");

          storeDraft(token, {
            ...draft,
            phase: draft.noteId ? "saving" : "creating",
            error: undefined,
          });

          if (!draft.notesTableId) {
            const notesTableId = await getOrCreateTable({
              name: DEFAULT_DRAFT_TITLE,
              workingSpaceId: draft.workingSpaceId,
            });
            draft = { ...draftsRef.current[token], notesTableId };
            storeDraft(token, draft);
          }

          if (!draft.noteId) {
            const latestDraft = draftsRef.current[token];
            const noteId = await createNote({
              title: latestDraft.title,
              notesTableId: draft.notesTableId,
              workingSpacesSlug: draft.workingSpacesSlug,
              workingSpaceId: draft.workingSpaceId,
            });
            draft = { ...draftsRef.current[token], noteId, phase: "saving" };
            storeDraft(token, draft);
          }

          const noteId = draft.noteId;
          if (!noteId) throw new Error("Note creation did not return an ID");

          while (true) {
            const currentDraft = draftsRef.current[token];
            if (!currentDraft) throw new Error("Draft is no longer available");
            const revision = currentDraft.revision;
            const body = currentDraft.content
              ? JSON.stringify(currentDraft.content)
              : undefined;
            const titleChanged =
              currentDraft.title !==
              (currentDraft.initialTitle ?? DEFAULT_DRAFT_TITLE);

            if (body !== undefined || titleChanged) {
              await updateNote({
                _id: noteId,
                ...(titleChanged ? { title: currentDraft.title } : {}),
                ...(body !== undefined ? { body } : {}),
              });
            }

            const latestDraft = draftsRef.current[token];
            if (!latestDraft) throw new Error("Draft is no longer available");
            if (latestDraft.revision === revision) {
              storeDraft(token, {
                ...latestDraft,
                noteId,
                phase: "ready",
                error: undefined,
              });
              return noteId;
            }
          }
        } catch (error) {
          const currentDraft = draftsRef.current[token];
          if (currentDraft) {
            storeDraft(token, {
              ...currentDraft,
              phase: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Could not save this note.",
            });
          }
          throw error;
        }
      })();

      jobsRef.current.set(token, job);
      const clearJob = () => {
        if (jobsRef.current.get(token) === job) jobsRef.current.delete(token);
      };
      void job.then(clearJob, clearJob);
      return job;
    },
    [getOrCreateTable, createNote, storeDraft, updateNote],
  );
  persistRef.current = persistDraft;

  useEffect(() => {
    if (!isHydrated) return;
    Object.values(drafts).forEach((draft) => {
      if (draft.phase === "creating" || draft.phase === "saving") {
        void persistDraft(draft.token).catch(() => undefined);
      }
    });
  }, [drafts, isHydrated, persistDraft]);

  const beginNoteDraft = useCallback(
    (args: {
      workingSpaceId: Id<"workingSpaces">;
      workingSpacesSlug: string;
      originPath: string;
      notesTableId?: Id<"notesTables">;
      title?: string;
    }) => {
      const token = crypto.randomUUID().replaceAll("-", "");
      const initialTitle = args.title ?? DEFAULT_DRAFT_TITLE;
      setActiveDraftToken(token);
      storeDraft(token, {
        token,
        ...args,
        title: initialTitle,
        initialTitle,
        revision: 0,
        phase: "creating",
      });
      return { token, completion: persistRef.current(token) };
    },
    [storeDraft],
  );

  const getDraft = useCallback((token: string) => drafts[token], [drafts]);

  const updateDraft = useCallback(
    (
      token: string,
      updates: Partial<Pick<PendingNoteDraft, "title" | "content">>,
    ) => {
      const currentDraft = draftsRef.current[token];
      if (!currentDraft) return;
      const shouldPersist =
        currentDraft.phase === "ready" && currentDraft.noteId !== undefined;
      storeDraft(token, {
        ...currentDraft,
        ...updates,
        revision: currentDraft.revision + 1,
        phase: shouldPersist ? "saving" : currentDraft.phase,
        error: undefined,
      });
      if (shouldPersist) {
        void persistRef.current(token).catch(() => undefined);
      }
    },
    [storeDraft],
  );

  const retryDraft = useCallback((token: string) => {
    void persistRef.current(token).catch(() => undefined);
  }, []);

  const finishDraft = useCallback(
    (token: string) => {
      storeDraft(token, undefined);
      setActiveDraftToken((currentToken) =>
        currentToken === token ? null : currentToken,
      );
    },
    [storeDraft],
  );

  return (
    <PendingNoteDraftContext.Provider
      value={{
        isHydrated,
        activeDraftToken,
        beginNoteDraft,
        getDraft,
        updateDraft,
        retryDraft,
        finishDraft,
      }}
    >
      {children}
    </PendingNoteDraftContext.Provider>
  );
}

export function usePendingNoteDraftContext() {
  const context = useContext(PendingNoteDraftContext);
  if (!context) {
    throw new Error("PendingNoteDraftProvider is missing");
  }
  return context;
}

export function usePendingNoteDraft(token: string) {
  return usePendingNoteDraftContext().getDraft(token);
}
