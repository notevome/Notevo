"use client";

import React from "react";
export function LinedPaperSheet({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`relative shadow-xl bg-[#e7e3d9] overflow-hidden select-none pointer-events-none ${className}`}
    >
      <div
        className="w-full h-full"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 29px, rgba(59, 130, 246 ) 30px)`,
          backgroundPosition: "0 12px",
        }}
      />
    </div>
  );
}

export function GridPaperSheet({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`relative bg-[#b1cbc2] overflow-hidden select-none pointer-events-none ${className}`}
    >
      <div
        className="w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(234,50, 49) , transparent 1px),
            linear-gradient(to bottom, rgba(234, 50, 49) , transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />
    </div>
  );
}
