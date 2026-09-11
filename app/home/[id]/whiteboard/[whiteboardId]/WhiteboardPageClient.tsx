"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSnapshot,
  loadSnapshot,
  Tldraw,
  type Editor,
  type TLAsset,
  type TLAssetStore,
} from "tldraw";
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

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getUrl);

  const editorRef = useRef<Editor | null>(null);
  const { resolvedTheme } = useTheme();
  const colorScheme = resolvedTheme === "dark" ? "dark" : "light";
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (whiteboard !== undefined) setHasLoadedOnce(true);
  }, [whiteboard]);

  const hasLoadedSnapshotRef = useRef(false);

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
      setSaveState("saved");
    } catch (err) {
      console.error("Failed to save whiteboard snapshot:", err);
      setSaveState("error");
    }
  }, 700);

  const saveTitle = useDebouncedCallback((nextTitle: string) => {
    const trimmed = nextTitle.trim();
    if (trimmed) void updateWhiteboard({ _id: whiteboardId, title: trimmed });
  }, 400);

  const assetStore = useMemo<TLAssetStore>(
    () => ({
      async upload(_asset: TLAsset, file: File) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) {
          throw new Error(`Upload failed with status ${result.status}`);
        }
        const { storageId } = await result.json();
        const url = await getFileUrl({ storageId });
        if (!url) throw new Error("Could not resolve uploaded file URL");
        return { src: url };
      },
      resolve(asset: TLAsset) {
        return asset.props.src;
      },
    }),
    [generateUploadUrl, getFileUrl],
  );

  const [isEditorReady, setIsEditorReady] = useState(false);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      editor.user.updateUserPreferences({ colorScheme });
      setIsEditorReady(true);

      return editor.store.listen(
        () => {
          const snapshot = JSON.stringify(getSnapshot(editor.store));
          saveSnapshot(snapshot);
        },
        { source: "user", scope: "document" },
      );
    },
    [colorScheme, saveSnapshot],
  );

  useEffect(() => {
    if (!isEditorReady) return;
    if (hasLoadedSnapshotRef.current) return;
    const editor = editorRef.current;
    if (!editor || !whiteboard?.snapshot) return;

    try {
      loadSnapshot(editor.store, JSON.parse(whiteboard.snapshot));
    } catch {
      // A malformed legacy snapshot should not prevent a fresh board.
    }
    hasLoadedSnapshotRef.current = true;
  }, [isEditorReady, whiteboard?.snapshot]);

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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveSnapshot.flush();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [saveSnapshot]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState === "saving") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveState]);

  const canvas = useMemo(
    () => (
      <Tldraw
        key={whiteboardId}
        colorScheme={colorScheme}
        onMount={handleMount}
        assets={assetStore}
        components={{
          MainMenu: null,
          PageMenu: null,
          QuickActions: null,
        }}
      />
    ),
    [colorScheme, handleMount, assetStore, whiteboardId],
  );

  if (!hasLoadedOnce) {
    return <div className="h-full min-h-[60vh] animate-pulse bg-card" />;
  }

  return (
    <div className="whiteboard-canvas relative h-full min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {canvas}
      {saveState === "error" && (
        <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-none border border-destructive bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
          Couldn't save your last change check your connection.
        </div>
      )}
    </div>
  );
}
