export function resolveDraftTokenToRender({
  routeDraftToken,
  activeDraftToken,
  activeDraftOriginPath,
  activeDraftNoteId,
  pathname,
}: {
  routeDraftToken: string | null;
  activeDraftToken: string | null;
  activeDraftOriginPath: string | null;
  activeDraftNoteId: string | null;
  pathname: string;
}) {
  if (routeDraftToken) {
    return routeDraftToken;
  }

  if (!activeDraftToken) {
    return null;
  }

  if (pathname === activeDraftOriginPath) {
    return activeDraftToken;
  }

  if (activeDraftNoteId) {
    const currentSlugId = pathname.split("/").filter(Boolean).at(-1);
    const currentNoteId = currentSlugId
      ? currentSlugId.split("-").at(-1)
      : null;
    if (currentNoteId === activeDraftNoteId) {
      return activeDraftToken;
    }
  }

  return null;
}

export function getDraftTokenToRender({
  routeDraftToken,
  activeDraftToken,
  activeDraftOriginPath,
  activeDraftNoteId,
  pathname,
}: {
  routeDraftToken: string | null;
  activeDraftToken: string | null;
  activeDraftOriginPath: string | null;
  activeDraftNoteId: string | null;
  pathname: string;
}) {
  return resolveDraftTokenToRender({
    routeDraftToken,
    activeDraftToken,
    activeDraftOriginPath,
    activeDraftNoteId,
    pathname,
  });
}
