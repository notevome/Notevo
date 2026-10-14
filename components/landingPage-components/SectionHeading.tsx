"use client";
interface SectionHeadingProps {
  SectionTitle: string;
  SectionSubTitle: string;
  className?: string;
  classNameSubTitle?: string;
}
import { cn } from "@/lib/utils";

export default function SectionHeading({
  SectionTitle,
  SectionSubTitle,
  className,
  classNameSubTitle,
}: SectionHeadingProps) {
  return (
    <div className={cn("text-center mb-16", className)}>
      <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
        <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          {SectionTitle}
        </span>
      </h2>
      <p
        className={cn(
          "text-sm md:text-lg text-muted-foreground max-w-[29rem] mx-auto",
          classNameSubTitle,
        )}
      >
        {SectionSubTitle}
      </p>
    </div>
  );
}
