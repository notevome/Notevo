import { describe, expect, it } from "vitest";
import {
  getDraftTokenToRender,
  resolveDraftTokenToRender,
} from "./pendingNoteDraft";

describe("getDraftTokenToRender", () => {
  it("keeps rendering the draft on its own route", () => {
    expect(
      getDraftTokenToRender({
        routeDraftToken: "draft-123",
        activeDraftToken: "123",
        activeDraftOriginPath: "/home/w-1",
        activeDraftNoteId: null,
        pathname: "/home/w-1/draft-123",
      }),
    ).toBe("draft-123");
  });

  it("keeps the draft while the user is still on the creation origin route", () => {
    expect(
      getDraftTokenToRender({
        routeDraftToken: null,
        activeDraftToken: "123",
        activeDraftOriginPath: "/home/w-1",
        activeDraftNoteId: null,
        pathname: "/home/w-1",
      }),
    ).toBe("123");
  });

  it("renders the draft route immediately even before the draft is hydrated", () => {
    expect(
      resolveDraftTokenToRender({
        routeDraftToken: "draft-123",
        activeDraftToken: null,
        activeDraftOriginPath: null,
        activeDraftNoteId: null,
        pathname: "/home/w-1/draft-123",
      }),
    ).toBe("draft-123");
  });

  it("keeps the draft visible while the final note route is still loading", () => {
    expect(
      resolveDraftTokenToRender({
        routeDraftToken: null,
        activeDraftToken: "123",
        activeDraftOriginPath: "/home/w-1",
        activeDraftNoteId: "k5702xzxdbwdcjfwx878001gxx8bcxje",
        pathname:
          "/home/w-1/new-quick-access-notes-k5702xzxdbwdcjfwx878001gxx8bcxje",
      }),
    ).toBe("123");
  });

  it("does not keep the draft visible after redirecting to a different note route", () => {
    expect(
      getDraftTokenToRender({
        routeDraftToken: null,
        activeDraftToken: "123",
        activeDraftOriginPath: "/home/w-1",
        activeDraftNoteId: "k5702xzxdbwdcjfwx878001gxx8bcxje",
        pathname: "/home/w-1/final-note-abc123456789012345678901234567890",
      }),
    ).toBeNull();
  });
});
