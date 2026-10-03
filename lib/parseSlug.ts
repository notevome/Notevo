import { stripIdFromSlug } from "./slug";

export function parseSlug(slug: string): string {
  if (!slug) return "";
  const trimmed = slug.trim();
  if (/^[a-zA-Z0-9]{20,50}$/.test(trimmed)) {
    return "Untitled";
  }
  const withoutId = stripIdFromSlug(trimmed);
  return withoutId
    .replace(/-\d+$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}