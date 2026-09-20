"use client";
interface SectionHeadingProps {
  SectionTitle: string;
  SectionSubTitle: string;
  className?: string;
}
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SectionHeading({
  SectionTitle,
  SectionSubTitle,
  className,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className={cn("text-center mb-16", className)}
    >
      <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
        <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          {SectionTitle}
        </span>
      </h2>
      <p className=" text-sm md:text-lg text-muted-foreground max-w-[29rem] mx-auto">
        {SectionSubTitle}
      </p>
    </motion.div>
  );
}
