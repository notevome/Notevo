"use client";
interface SectionHeadingProps {
  SectionTitle: string;
  SectionSubTitle: string;
}
import { motion } from "framer-motion";

export default function SectionHeading({
  SectionTitle,
  SectionSubTitle,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="text-center mb-16"
    >
      <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
        <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          {SectionTitle}
        </span>
      </h2>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        {SectionSubTitle}
      </p>
    </motion.div>
  );
}
