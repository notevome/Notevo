export const LAST_VISITED_FOLDER_KEY = "notevo_last_visited_folder_id";
export const LAST_VISITED_TABLE_KEY = "notevo_last_visited_table_id";
export const CREATE_NOTE_WORKSPACE_STORAGE_KEY = "notevo_create_note_workspace_id";

export function recordLastVisitedLocation(
  folderId?: string | null,
  tableId?: string | null,
) {
  if (typeof window === "undefined") return;
  try {
    if (folderId) {
      window.localStorage.setItem(LAST_VISITED_FOLDER_KEY, String(folderId));
      window.localStorage.setItem(CREATE_NOTE_WORKSPACE_STORAGE_KEY, String(folderId));
    }
    if (tableId) {
      window.localStorage.setItem(LAST_VISITED_TABLE_KEY, String(tableId));
    }
  } catch (error) {
    console.error("Failed to record last visited location:", error);
  }
}

export function getLastVisitedLocation(): {
  folderId: string | null;
  tableId: string | null;
} {
  if (typeof window === "undefined") {
    return { folderId: null, tableId: null };
  }
  try {
    const folderId =
      window.localStorage.getItem(LAST_VISITED_FOLDER_KEY) ||
      window.localStorage.getItem(CREATE_NOTE_WORKSPACE_STORAGE_KEY) ||
      null;
    const tableId = window.localStorage.getItem(LAST_VISITED_TABLE_KEY) || null;
    return { folderId, tableId };
  } catch {
    return { folderId: null, tableId: null };
  }
}
