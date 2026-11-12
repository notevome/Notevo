import { beforeEach, describe, expect, it } from "vitest";
import {
  CREATE_DOCUMENT_FOLDER_STORAGE_KEY,
  getLastVisitedLocation,
  getLastVisitedTableForFolder,
  LAST_VISITED_FOLDER_KEY,
  LAST_VISITED_TABLE_KEY,
  recordLastVisitedLocation,
} from "./last-visited";

describe("last visited location", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("updates the creation target to the table currently being viewed", () => {
    recordLastVisitedLocation("folder-a", "table-old");
    recordLastVisitedLocation("folder-a", "table-current");

    expect(getLastVisitedTableForFolder("folder-a")).toBe("table-current");
    expect(getLastVisitedLocation("folder-a")).toEqual({
      folderId: "folder-a",
      tableId: "table-current",
    });
  });

  it("keeps table targets separate for each folder", () => {
    recordLastVisitedLocation("folder-a", "table-a");
    recordLastVisitedLocation("folder-b", "table-b");

    expect(getLastVisitedLocation("folder-a")).toEqual({
      folderId: "folder-a",
      tableId: "table-a",
    });
    expect(getLastVisitedLocation("folder-b")).toEqual({
      folderId: "folder-b",
      tableId: "table-b",
    });
  });

  it("records a folder visit without discarding its active table", () => {
    recordLastVisitedLocation("folder-a", "table-a");
    recordLastVisitedLocation("folder-a", null);

    expect(window.localStorage.getItem(LAST_VISITED_FOLDER_KEY)).toBe(
      "folder-a",
    );
    expect(
      window.localStorage.getItem(CREATE_DOCUMENT_FOLDER_STORAGE_KEY),
    ).toBe("folder-a");
    expect(window.localStorage.getItem(LAST_VISITED_TABLE_KEY)).toBe("table-a");
    expect(getLastVisitedTableForFolder("folder-a")).toBe("table-a");
  });
});
