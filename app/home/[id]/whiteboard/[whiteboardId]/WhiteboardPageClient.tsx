"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSnapshot, loadSnapshot, Tldraw, type Editor } from "tldraw";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { useTheme } from "next-themes";

function getPreview(snapshot: string) {
  try {
    const data = JSON.parse(snapshot);
    const records = Object.values(data?.store ?? data ?? {}) as Array<{
      typeName?: string;
    }>;
    const shapes = records.filter(
      (record) => record.typeName === "shape",
    ).length;
    return shapes === 1 ? "1 shape" : `${shapes} shapes`;
  } catch {
    return "Canvas updated";
  }
}

export default function WhiteboardPageClient({
  whiteboardId,
}: {
  whiteboardId: Id<"whiteboards">;
}) {
  const whiteboard = useQuery(api.whiteboards.getWhiteboardById, {
    _id: whiteboardId,
  });
  const updateWhiteboard = useMutation(api.whiteboards.updateWhiteboard);
  const editorRef = useRef<Editor | null>(null);
  const { resolvedTheme } = useTheme();
  const colorScheme = resolvedTheme === "dark" ? "dark" : "light";
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  useEffect(() => {
    if (whiteboard) setTitle(whiteboard.title);
  }, [whiteboard]);

  const saveSnapshot = useDebouncedCallback(async (snapshot: string) => {
    setSaveState("saving");
    try {
      await updateWhiteboard({
        _id: whiteboardId,
        snapshot,
        preview: getPreview(snapshot),
      });
    } finally {
      setSaveState("saved");
    }
  }, 700);

  const saveTitle = useDebouncedCallback((nextTitle: string) => {
    const trimmed = nextTitle.trim();
    if (trimmed) void updateWhiteboard({ _id: whiteboardId, title: trimmed });
  }, 400);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      editor.user.updateUserPreferences({ colorScheme });
      if (whiteboard?.snapshot) {
        try {
          loadSnapshot(editor.store, JSON.parse(whiteboard.snapshot));
        } catch {
          // A malformed legacy snapshot should not prevent a fresh board.
        }
      }
      return editor.store.listen(
        () => {
          const snapshot = JSON.stringify(getSnapshot(editor.store));
          saveSnapshot(snapshot);
        },
        { source: "user", scope: "document" },
      );
    },
    [colorScheme, saveSnapshot, whiteboard?.snapshot],
  );

  useEffect(() => {
    editorRef.current?.user.updateUserPreferences({ colorScheme });
  }, [colorScheme]);

  useEffect(() => {
    if (!whiteboard?.title) return;
    const originalTitle = document.title;
    document.title = `${whiteboard.title} - Notevo Whiteboard`;
    return () => {
      document.title = originalTitle;
    };
  }, [whiteboard?.title]);

  useEffect(
    () => () => {
      saveSnapshot.flush();
    },
    [saveSnapshot],
  );

  const canvas = useMemo(
    () => (
      <Tldraw
        key={whiteboardId}
        colorScheme={colorScheme}
        onMount={handleMount}
        components={{
          MainMenu: null,
          PageMenu: null,
          QuickActions: null,
        }}
      />
    ),
    [colorScheme, handleMount, whiteboardId],
  );

  if (whiteboard === undefined) {
    return <div className="h-full min-h-[60vh] animate-pulse bg-card" />;
  }

  return (
    <div className="whiteboard-canvas relative h-full min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {canvas}
    </div>
  );
}
