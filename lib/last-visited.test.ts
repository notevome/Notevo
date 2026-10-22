import { beforeEach, describe, expect, it } from "vitest";
import {
  CREATE_NOTE_WORKSPACE_STORAGE_KEY,
  getLastVisitedLocation,
  getLastVisitedTableForWorkspace,
  LAST_VISITED_FOLDER_KEY,
  LAST_VISITED_TABLE_KEY,
  recordLastVisitedLocation,
} from "./last-visited";

describe("last visited location", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("updates the creation target to the table currently being viewed", () => {
    recordLastVisitedLocation("workspace-a", "table-old");
    recordLastVisitedLocation("workspace-a", "table-current");

    expect(getLastVisitedTableForWorkspace("workspace-a")).toBe(
      "table-current",
    );
    expect(getLastVisitedLocation("workspace-a")).toEqual({
      folderId: "workspace-a",
      tableId: "table-current",
    });
  });

  it("keeps table targets separate for each workspace", () => {
    recordLastVisitedLocation("workspace-a", "table-a");
    recordLastVisitedLocation("workspace-b", "table-b");

    expect(getLastVisitedLocation("workspace-a")).toEqual({
      folderId: "workspace-a",
      tableId: "table-a",
    });
    expect(getLastVisitedLocation("workspace-b")).toEqual({
      folderId: "workspace-b",
      tableId: "table-b",
    });
  });

  it("records a workspace visit without discarding its active table", () => {
    recordLastVisitedLocation("workspace-a", "table-a");
    recordLastVisitedLocation("workspace-a", null);

    expect(window.localStorage.getItem(LAST_VISITED_FOLDER_KEY)).toBe(
      "workspace-a",
    );
    expect(window.localStorage.getItem(CREATE_NOTE_WORKSPACE_STORAGE_KEY)).toBe(
      "workspace-a",
    );
    expect(window.localStorage.getItem(LAST_VISITED_TABLE_KEY)).toBe("table-a");
    expect(getLastVisitedTableForWorkspace("workspace-a")).toBe("table-a");
  });
});
