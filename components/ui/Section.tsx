"use client";
import { cn } from "../../lib/utils";
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
}: SectionProps) {
  return (
    <section
      id={sectionId}
      className={cn(
        "px-4 sm:px-6 md:px-8",
        "py-12 sm:py-16 md:py-20 Desktop:py-24",
        className,
      )}
    >
      {children}
    </section>
  );
}
