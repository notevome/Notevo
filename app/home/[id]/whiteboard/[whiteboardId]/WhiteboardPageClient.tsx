"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebouncedCallback } from "use-debounce";
import { useTheme } from "next-themes";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false },
);

type WhiteboardSnapshot = Pick<
  ExcalidrawInitialDataState,
  "elements" | "appState" | "files"
>;

function getPreview(elements: readonly ExcalidrawElement[]) {
  const shapeCount = elements.filter((element) => !element.isDeleted).length;
  return shapeCount === 1 ? "1 shape" : `${shapeCount} shapes`;
}

function parseSnapshot(snapshot?: string): WhiteboardSnapshot | null {
  if (!snapshot) return null;

  try {
    const parsed = JSON.parse(snapshot) as WhiteboardSnapshot;
    if (!Array.isArray(parsed.elements)) return null;

    if (parsed.appState && typeof parsed.appState === "object") {
      const { collaborators: _collaborators, ...appState } = parsed.appState;
      return { ...parsed, appState };
    }

    return parsed;
  } catch {
    return null;
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
  const { resolvedTheme } = useTheme();

  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const uploadUrlsByFileId = useRef(new Map<string, Promise<string>>());

  const uploadFile = useCallback(
    async (file: BinaryFileData) => {
      if (!file.dataURL.startsWith("data:")) return file.dataURL as string;

      const pendingUpload = uploadUrlsByFileId.current.get(file.id);
      if (pendingUpload) return pendingUpload;

      const upload = (async () => {
        const response = await fetch(file.dataURL);
        const blob = await response.blob();
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.mimeType },
          body: blob,
        });
        if (!result.ok) {
          throw new Error(`Image upload failed with status ${result.status}`);
        }
        const { storageId } = await result.json();
        const url = await getFileUrl({ storageId });
        if (!url) throw new Error("Could not resolve uploaded image URL");
        return url;
      })();

      uploadUrlsByFileId.current.set(file.id, upload);
      try {
        return await upload;
      } catch (error) {
        uploadUrlsByFileId.current.delete(file.id);
        throw error;
      }
    },
    [generateUploadUrl, getFileUrl],
  );

  const saveScene = useDebouncedCallback(
    async (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      setSaveState("saving");
      try {
        const persistedFiles = Object.fromEntries(
          await Promise.all(
            Object.entries(files).map(
              async ([id, file]) =>
                [
                  id,
                  {
                    ...file,
                    dataURL: (await uploadFile(file)) as typeof file.dataURL,
                  },
                ] as const,
            ),
          ),
        ) as BinaryFiles;
        const { serializeAsJSON } = await import("@excalidraw/excalidraw");
        const snapshot = JSON.parse(
          serializeAsJSON(elements, appState, persistedFiles, "local"),
        ) as WhiteboardSnapshot;
        await updateWhiteboard({
          _id: whiteboardId,
          snapshot: JSON.stringify(snapshot),
          preview: getPreview(elements),
        });
        setSaveState("saved");
      } catch (error) {
        console.error("Failed to save whiteboard scene:", error);
        setSaveState("error");
      }
    },
    700,
  );

  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      void saveScene(elements, appState, files);
    },
    [saveScene],
  );

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
      void saveScene.flush();
    },
    [saveScene],
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") void saveScene.flush();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [saveScene]);

  if (whiteboard === undefined) {
    return <div className="h-full min-h-[60vh] animate-pulse bg-card" />;
  }

  return (
    <div className="whiteboard-canvas relative h-full min-h-[calc(100vh-4rem)] min-w-full overflow-hidden bg-background">
      <Excalidraw
        key={whiteboardId}
        initialData={parseSnapshot(whiteboard?.snapshot)}
        onChange={handleChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            saveAsImage: false,
            toggleTheme: false,
          },
        }}
      />
      {saveState === "error" && (
        <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-none border border-destructive bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
          Couldn&apos;t save your last change. Check your connection.
        </div>
      )}
    </div>
  );
}
