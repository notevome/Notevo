"use client";
import { cn } from "../../lib/utils";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
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
  initialMargin = 30,
  initialRadius = 30,
  initialMarginMobile = 0,
  initialRadiusMobile = 0,
  duration = 0.3,
  preloadOffset = 150,
}: SectionProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);

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
  const springConfig = {
    stiffness: 300,
    damping: 30,
  };

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const y = useSpring(
    useTransform(scrollYProgress, [0.2, 0.5, 0.8], [initialY, 0, -initialY]),
    springConfig,
  );
  const marginX = useSpring(
    useTransform(
      scrollYProgress,
      [0, 0.3, 0.7, 1],
      [activeMargin, 0, 0, activeMargin],
    ),
    springConfig,
  );

  const radius = useSpring(
    useTransform(
      scrollYProgress,
      [0, 0.3, 0.7, 1],
      [activeRadius, 0, 0, activeRadius],
    ),
    springConfig,
  );

  const scale = useSpring(
    useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.9, 1, 1, 0.9]),
    springConfig,
  );

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0.82, 1, 1, 0.82],
  );

  return (
    <motion.div
      ref={sectionRef}
      id={sectionId}
      style={
        isMobile
          ? undefined
          : {
              y,
              marginLeft: marginX,
              marginRight: marginX,
              borderRadius: radius,
              scale,
              opacity,
            }
      }
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
