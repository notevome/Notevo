"use client";
import { cn } from "../../lib/utils";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect, useRef, useState } from "react";

interface SectionProps {
  sectionId?: string;
  className?: string;
  children: React.ReactNode;
  initialY?: number;
  initialMargin?: number;
  initialRadius?: number;
  initialMarginMobile?: number;
  initialRadiusMobile?: number;
  duration?: number;
  preloadOffset?: number;
}

export default function Section({
  sectionId,
  children,
  className,
  initialY = 90,
  initialMargin = 90,
  initialRadius = 30,
  initialMarginMobile = 0,
  initialRadiusMobile = 0,
  duration = 0.3,
  preloadOffset = 150,
}: SectionProps) {
  const controls = useAnimation();

  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.4,
    rootMargin: `${preloadOffset}px 0px ${preloadOffset}px 0px`,
  });

  const lastScrollY = useRef(0);
  const scrollingDown = useRef(true);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const handleScroll = () => {
      const current = window.scrollY;
      scrollingDown.current = current > lastScrollY.current;
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const activeMargin = isMobile ? initialMarginMobile : initialMargin;
  const activeRadius = isMobile ? initialRadiusMobile : initialRadius;
  const resolvedDuration = duration ?? (isMobile ? 0.3 : 0.5);

  useEffect(() => {
    // On mobile, skip all animations — just show content instantly
    if (isMobile) {
      controls.set({
        y: 0,
        opacity: 1,
        marginLeft: 0,
        marginRight: 0,
        borderRadius: 0,
      });
      return;
    }

    if (inView) {
      if (isFirstLoad.current) {
        // On first load, if already in view — just show instantly, no animation
        isFirstLoad.current = false;
        controls.set({
          y: 0,
          opacity: 1,
          marginLeft: 0,
          marginRight: 0,
          borderRadius: 0,
        });
        return;
      }

      const fromY = scrollingDown.current ? initialY : -initialY;
      controls.set({
        y: fromY,
        opacity: 1,
        marginLeft: activeMargin,
        marginRight: activeMargin,
        borderRadius: activeRadius,
      });
      controls.start({
        y: 0,
        opacity: 1,
        marginLeft: 0,
        marginRight: 0,
        borderRadius: 0,
        transition: { ease: "easeOut", duration: resolvedDuration },
      });
    } else {
      if (isFirstLoad.current) {
        // On first load, if out of view — set to hidden instantly, no animation
        isFirstLoad.current = false;
        controls.set({
          y: initialY,
          opacity: 1,
          marginLeft: activeMargin,
          marginRight: activeMargin,
          borderRadius: activeRadius,
        });
        return;
      }

      const toY = scrollingDown.current ? -initialY : initialY;
      controls.start({
        y: toY,
        opacity: 1,
        marginLeft: activeMargin,
        marginRight: activeMargin,
        borderRadius: activeRadius,
        transition: { ease: "easeIn", duration: resolvedDuration },
      });
    }
  }, [inView, isMobile]);

  return (
    <motion.div
      ref={ref}
      id={sectionId}
      // No `initial` prop — controls.set handles the starting state
      // This prevents the jump on first load
      animate={controls}
      className={cn(
        "px-4 sm:px-6 md:px-8",
        "py-12 sm:py-16 md:py-20 Desktop:py-24",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
