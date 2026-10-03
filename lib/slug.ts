import { generateSlug } from "./generateSlug";

/**
 * Extracts a Convex document ID from a URL slug segment.
 *
 * Convex IDs are base32 strings of 20 to 50 alphanumeric characters (typically 32 characters).
 * - Matches direct ID: "k5702xzxdbwdcjfwx878001gxx8bcxje"
 * - Matches slug with trailing ID: "difference-between-compiled-and-interpreted-language-k5702xzxdbwdcjfwx878001gxx8bcxje"
 */
export function extractIdFromSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const trimmed = slug.trim();
  if (!trimmed) return null;

  // 1. If the whole slug is an ID (20-50 alphanumeric characters)
  if (/^[a-zA-Z0-9]{20,50}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. If the slug ends with -<id>
  const match = trimmed.match(/-([a-zA-Z0-9]{20,50})$/);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Strips the trailing document ID from a slug if present.
 */
export function stripIdFromSlug(slug: string | null | undefined): string {
  if (!slug) return "";
  const trimmed = slug.trim();
  if (/^[a-zA-Z0-9]{20,50}$/.test(trimmed)) {
    return "";
  }
  return trimmed.replace(/-[a-zA-Z0-9]{20,50}$/, "");
}

/**
 * Builds a composite slug combining the sanitized title and document ID.
 * Example:
 * title: "Difference between compiled and interpreted language"
 * id: "k5702xzxdbwdcjfwx878001gxx8bcxje"
 * returns: "difference-between-compiled-and-interpreted-language-k5702xzxdbwdcjfwx878001gxx8bcxje"
 */
export function buildItemSlug(
  titleOrSlug: string | null | undefined,
  id: string,
): string {
  if (!id) return generateSlug(titleOrSlug || "untitled") || "untitled";

  // If titleOrSlug already ends with -id or is id, return it cleaned
  if (titleOrSlug) {
    const trimmed = titleOrSlug.trim();
    if (trimmed === id) {
      return id;
    }
    if (trimmed.endsWith(`-${id}`)) {
      return trimmed;
    }
  }

  // Strip existing id if titleOrSlug is an existing composite slug
  const cleanedTitle = stripIdFromSlug(titleOrSlug);
  const baseSlug = generateSlug(cleanedTitle || "untitled") || "untitled";
  return `${baseSlug}-${id}`;
}
