"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { forwardRef, useCallback, useRef } from "react";

type Props = Omit<ComponentProps<typeof Link>, "prefetch" | "href"> & {
  href: string;
};

const IntentPrefetchLink = forwardRef<HTMLAnchorElement, Props>(
  function IntentPrefetchLink(
    {
      href,
      onMouseEnter,
      onFocus,
      onTouchStart,
      onPointerEnter,
      onPointerDown,
      onMouseDown,
      ...props
    },
    ref,
  ) {
    const router = useRouter();
    const didPrefetch = useRef(false);

    const prefetchOnce = useCallback(() => {
      if (didPrefetch.current) return;
      didPrefetch.current = true;
      router.prefetch(href);
    }, [router, href]);

    return (
      <Link
        {...props}
        href={href}
        prefetch={true}
        ref={ref}
        onPointerDown={(e) => {
          prefetchOnce();
          onPointerDown?.(e);
        }}
        onMouseDown={(e) => {
          prefetchOnce();
          onMouseDown?.(e);
        }}
        onPointerEnter={(e) => {
          prefetchOnce();
          onPointerEnter?.(e);
        }}
        onMouseEnter={(e) => {
          prefetchOnce();
          onMouseEnter?.(e);
        }}
        onFocus={(e) => {
          prefetchOnce();
          onFocus?.(e);
        }}
        onTouchStart={(e) => {
          prefetchOnce();
          onTouchStart?.(e);
        }}
      />
    );
  },
);

export default IntentPrefetchLink;
