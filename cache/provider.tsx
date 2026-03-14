"use client";
import { useConvex } from "convex/react";
import { createContext, FC, PropsWithChildren, useEffect, useMemo } from "react";
import { CacheRegistry, ConvexQueryCacheOptions } from "./core";

export const ConvexQueryCacheContext = createContext({
  registry: null as CacheRegistry | null,
});

/**
 * A provider that establishes a query cache context in the React render
 * tree so that cached `useQuery` calls can be used.
 *
 * @component
 * @param {ConvexQueryCacheOptions} props.options - Options for the query cache
 * @returns {Element}
 */
export const ConvexQueryCacheProvider: FC<
  PropsWithChildren<ConvexQueryCacheOptions>
> = ({ children, expiration, maxIdleEntries, debug }) => {
  const convex = useConvex();
  if (convex === undefined) {
    throw new Error(
      "Could not find Convex client! `ConvexQueryCacheProvider` must be used in the React component " +
        "tree under `ConvexProvider`. Did you forget it? " +
        "See https://docs.convex.dev/quick-start#set-up-convex-in-your-react-app",
    );
  }

  // Keep the registry stable so we don't resubscribe to every query on every render.
  const registry = useMemo(() => {
    return new CacheRegistry(convex, { expiration, maxIdleEntries, debug });
  }, [convex, expiration, maxIdleEntries, debug]);

  // Ensure we tear down any subscriptions/timers if this provider ever unmounts.
  useEffect(() => {
    return () => registry.destroy();
  }, [registry]);

  return (
    <ConvexQueryCacheContext.Provider value={{ registry }}>
      {children}
    </ConvexQueryCacheContext.Provider>
  );
};
