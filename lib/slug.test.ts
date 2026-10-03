import { describe, expect, it } from "vitest";
import { extractIdFromSlug, stripIdFromSlug, buildItemSlug } from "./slug";

describe("slug utilities", () => {
  describe("extractIdFromSlug", () => {
    it("extracts ID from composite slug", () => {
      const slug =
        "difference-between-compiled-and-interpreted-language-k5702xzxdbwdcjfwx878001gxx8bcxje";
      expect(extractIdFromSlug(slug)).toBe("k5702xzxdbwdcjfwx878001gxx8bcxje");
    });

    it("extracts ID when slug is only an ID", () => {
      expect(extractIdFromSlug("k5702xzxdbwdcjfwx878001gxx8bcxje")).toBe(
        "k5702xzxdbwdcjfwx878001gxx8bcxje",
      );
    });

    it("extracts ID with numbers and hyphenated title", () => {
      expect(
        extractIdFromSlug("v2-release-notes-2026-kd7629dwr9xc0b00ta87t0fsn1828j1m"),
      ).toBe("kd7629dwr9xc0b00ta87t0fsn1828j1m");
    });

    it("returns null when no valid ID is present", () => {
      expect(extractIdFromSlug("difference-between-compiled-and-interpreted-language")).toBeNull();
      expect(extractIdFromSlug("test-123")).toBeNull();
      expect(extractIdFromSlug("")).toBeNull();
      expect(extractIdFromSlug(null)).toBeNull();
    });
  });

  describe("stripIdFromSlug", () => {
    it("strips trailing ID from composite slug", () => {
      expect(
        stripIdFromSlug(
          "difference-between-compiled-and-interpreted-language-k5702xzxdbwdcjfwx878001gxx8bcxje",
        ),
      ).toBe("difference-between-compiled-and-interpreted-language");
    });

    it("returns empty string if slug is only an ID", () => {
      expect(stripIdFromSlug("k5702xzxdbwdcjfwx878001gxx8bcxje")).toBe("");
    });

    it("returns original slug when no ID is present", () => {
      expect(stripIdFromSlug("simple-slug")).toBe("simple-slug");
    });
  });

  describe("buildItemSlug", () => {
    it("combines title and ID into slug", () => {
      expect(
        buildItemSlug(
          "Difference between compiled and interpreted language",
          "k5702xzxdbwdcjfwx878001gxx8bcxje",
        ),
      ).toBe(
        "difference-between-compiled-and-interpreted-language-k5702xzxdbwdcjfwx878001gxx8bcxje",
      );
    });

    it("falls back to untitled if title is empty", () => {
      expect(buildItemSlug("", "k5702xzxdbwdcjfwx878001gxx8bcxje")).toBe(
        "untitled-k5702xzxdbwdcjfwx878001gxx8bcxje",
      );
      expect(buildItemSlug(null, "k5702xzxdbwdcjfwx878001gxx8bcxje")).toBe(
        "untitled-k5702xzxdbwdcjfwx878001gxx8bcxje",
      );
    });

    it("does not duplicate ID if title already has it", () => {
      expect(
        buildItemSlug(
          "difference-between-compiled-and-interpreted-language-k5702xzxdbwdcjfwx878001gxx8bcxje",
          "k5702xzxdbwdcjfwx878001gxx8bcxje",
        ),
      ).toBe(
        "difference-between-compiled-and-interpreted-language-k5702xzxdbwdcjfwx878001gxx8bcxje",
      );
    });
  });
});
