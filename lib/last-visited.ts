export const LAST_VISITED_FOLDER_KEY = "oraizive_last_visited_folder_id";
export const LAST_VISITED_TABLE_KEY = "oraizive_last_visited_table_id";
export const CREATE_DOCUMENT_FOLDER_STORAGE_KEY =
  "oraizive_create_document_folder_id";

export function getFolderLastVisitedTableKey(folderId: string): string {
  return `oraizive_last_visited_table_${folderId}`;
}

export function recordLastVisitedLocation(
  folderId?: string | null,
  tableId?: string | null,
) {
  if (typeof window === "undefined") return;
  try {
    if (folderId) {
      const folderStr = String(folderId);
      window.localStorage.setItem(LAST_VISITED_FOLDER_KEY, folderStr);
      window.localStorage.setItem(
        CREATE_DOCUMENT_FOLDER_STORAGE_KEY,
        folderStr,
      );
      if (tableId) {
        window.localStorage.setItem(
          getFolderLastVisitedTableKey(folderStr),
          String(tableId),
        );
      }
    }
    if (tableId) {
      window.localStorage.setItem(LAST_VISITED_TABLE_KEY, String(tableId));
    }
  } catch (error) {
    console.error("Failed to record last visited location:", error);
  }
}

export function getLastVisitedTableForFolder(
  folderId?: string | null,
): string | null {
  if (typeof window === "undefined" || !folderId) return null;
  try {
    return (
      window.localStorage.getItem(
        getFolderLastVisitedTableKey(String(folderId)),
      ) || null
    );
  } catch {
    return null;
  }
}

export function getLastVisitedLocation(preferredFolderId?: string | null): {
  folderId: string | null;
  tableId: string | null;
} {
  if (typeof window === "undefined") {
    return { folderId: null, tableId: null };
  }
  try {
    const folderId =
      (preferredFolderId ? String(preferredFolderId) : null) ||
      window.localStorage.getItem(LAST_VISITED_FOLDER_KEY) ||
      window.localStorage.getItem(CREATE_DOCUMENT_FOLDER_STORAGE_KEY) ||
      null;

    let tableId: string | null = null;
    if (folderId) {
      tableId = getLastVisitedTableForFolder(folderId);
    }
    if (!tableId) {
      tableId = window.localStorage.getItem(LAST_VISITED_TABLE_KEY) || null;
    }
    return { folderId, tableId };
  } catch {
    return { folderId: null, tableId: null };
  }
}
