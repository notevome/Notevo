import type { ResolvedHoverItem } from "@/components/item-hover-card-content";

export const itemMemoryCache = new Map<string, ResolvedHoverItem>();

export function cacheItem(item: ResolvedHoverItem) {
  if (item._id) {
    itemMemoryCache.set(String(item._id), item);
  }
  if (item.href) {
    itemMemoryCache.set(item.href, item);
    // Also cache relative href without query or origin
    try {
      const parsed = new URL(item.href, "http://localhost");
      itemMemoryCache.set(parsed.pathname + parsed.search, item);
    } catch {
      // ignore
    }
  }
  if (item.url) {
    itemMemoryCache.set(item.url, item);
  }
}

export function getCachedItem(key?: string | null): ResolvedHoverItem | undefined {
  if (!key) return undefined;
  if (itemMemoryCache.has(key)) return itemMemoryCache.get(key);

  try {
    const parsed = new URL(key, "http://localhost");
    const relative = parsed.pathname + parsed.search;
    if (itemMemoryCache.has(relative)) return itemMemoryCache.get(relative);

    const id = parsed.searchParams.get("id");
    if (id && itemMemoryCache.has(id)) return itemMemoryCache.get(id);

    const pdfId = parsed.searchParams.get("pdfId");
    if (pdfId && itemMemoryCache.has(pdfId)) return itemMemoryCache.get(pdfId);

    const whiteboardId = parsed.searchParams.get("whiteboardId");
    if (whiteboardId && itemMemoryCache.has(whiteboardId)) return itemMemoryCache.get(whiteboardId);
  } catch {
    // ignore
  }

  return undefined;
}
