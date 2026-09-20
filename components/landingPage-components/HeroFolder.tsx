"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GridPaperSheet, LinedPaperSheet } from "./ScatteredPapers";

export interface FolderCardItem {
  id: string;
  tabLabel: string;
  title: string;
  badge?: string;
  videoSrc: string;
  posterSrc: string;
}

const DEFAULT_CARDS: FolderCardItem[] = [
  {
    id: "whiteboard",
    tabLabel: "Whiteboard",
    title: "Infinite Canvas & Whiteboard",
    badge: "Canvas",
    videoSrc:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_1200/v1774021286/notevo-homepage_irogrs.mp4",
    posterSrc:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_1200/v1774021286/notevo-homepage_irogrs.jpg",
  },
  {
    id: "pdf",
    tabLabel: "PDF Annotation",
    title: "Smart PDF Viewer & Annotator",
    badge: "PDF Tool",
    videoSrc:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774031511/notevo-Downloadyoursfuff_zhgjsp.mp4",
    posterSrc:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774031511/notevo-Downloadyoursfuff_zhgjsp.jpg",
  },
  {
    id: "documents",
    tabLabel: "Documents",
    title: "Distraction-Free Rich Text Editor",
    badge: "Editor",
    videoSrc:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774031746/notevo-texteditor_wcwq0c.mp4",
    posterSrc:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774031746/notevo-texteditor_wcwq0c.jpg",
  },
];

interface HeroFolderProps {
  cards?: FolderCardItem[];
  autoPlayInterval?: number;
  className?: string;
}

export default function HeroFolder({
  cards = DEFAULT_CARDS,
  autoPlayInterval = 7000,
  className = "",
}: HeroFolderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [shufflingCardId, setShufflingCardId] = useState<string | null>(null);

  useEffect(() => {
    if (isHovered || autoPlayInterval <= 0) return;
    const interval = setInterval(() => {
      handleTabChange((activeIndex + 1) % cards.length);
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [activeIndex, isHovered, autoPlayInterval, cards.length]);

  const handleTabChange = (newIndex: number) => {
    if (newIndex === activeIndex) return;
    const currentActiveCard = cards[activeIndex];
    setShufflingCardId(currentActiveCard.id);
    setActiveIndex(newIndex);

    setTimeout(() => {
      setShufflingCardId(null);
    }, 600);
  };

  return (
    <div
      className={`relative w-full select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex flex-col w-full">
        <div className="flex items-end justify-between w-full ">
          <div className="flex-1 h-3 sm:h-4 bg-transparent border-b-2 border-border " />

          <div className="relative shadow-[inset_0_20px_30px_0px_rgba(0,0,0,0.1)] flex items-center border-2 border-border border-b-0 bg-primary pt-2 px-2 [clip-path:polygon(45px_0%,100%_0%,100%_100%,0%_100%)] pl-6">
            <div className="flex items-center gap-1 sm:gap-2 pb-1.5 pt-0.5">
              {cards.map((card, idx) => {
                const isActive = activeIndex === idx;
                const isFirst = idx === 0;

                return (
                  <button
                    key={card.id}
                    onClick={() => handleTabChange(idx)}
                    type="button"
                    className={`relative z-10 ${isFirst ? "sm:pl-12 pl-8" : "sm:pl-6 pl-3"} px-3 sm:px-6 py-1.5 sm:py-2 text-xs md:text-base font-semibold transition-colors duration-300 outline-none focus:outline-none ${
                      isActive
                        ? "text-primary font-extrabold"
                        : "text-primary-foreground hover:text-primary-foreground/80"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeFolderTab"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                        }}
                        className={`absolute inset-0 bg-gradient-to-br from-card from-5% to-100% via-border to-border/80 text-foreground ${
                          isFirst
                            ? "rounded-none [clip-path:polygon(30px_0%,100%_0%,100%_100%,0%_100%)]"
                            : "rounded-none"
                        }`}
                      />
                    )}
                    <span className="relative z-10 whitespace-nowrap">
                      {card.tabLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className=" shadow-[inset_10px_-20px_20px_0px_rgba(0,0,0,0.2)] relative w-full border-2 border-border border-t-0 bg-primary overflow-hidden min-h-[380px]  md:min-h-[880px] flex items-center justify-center">
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            <div className="absolute w-[95%] h-[92%] top-14 -right-2 z-[5] -rotate-[2deg] origin-bottom-left">
              <GridPaperSheet className="w-full h-full" />
            </div>

            <div className="absolute w-[96%] sm:w-[95%] h-[90%] bottom-0 left-6 z-[4] -rotate-[1.4deg] origin-bottom-right">
              <LinedPaperSheet className="w-full h-full" />
            </div>
          </div>

          <div className="relative w-full h-[320px] md:h-[800px] flex items-center justify-center z-10">
            {cards.map((card, idx) => {
              const total = cards.length;
              const order = (idx - activeIndex + total) % total;

              let zIndex = 30 - order * 10;
              let scale = 1 - order * 0.045;
              let yOffset = order === 0 ? 0 : order === 1 ? -16 : -28;
              let xOffset = order === 0 ? 0 : order === 1 ? 24 : -24;
              let rotation = order === 0 ? 0 : order === 1 ? 2.5 : -2.5;

              const isShufflingOut = shufflingCardId === card.id;

              return (
                <motion.div
                  key={card.id}
                  animate={{
                    scale: isShufflingOut ? 0.95 : scale,
                    x: isShufflingOut ? 60 : xOffset,
                    y: isShufflingOut ? -35 : yOffset,
                    rotate: isShufflingOut ? 6 : rotation,
                    zIndex: zIndex,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 240,
                    damping: 24,
                    mass: 0.85,
                  }}
                  style={{
                    position: "absolute",
                    transformOrigin: "bottom center",
                  }}
                  className="w-[96%] h-full overflow-hidden flex flex-col"
                >
                  <VideoPlayer
                    src={card.videoSrc}
                    poster={card.posterSrc}
                    isActive={order === 0}
                  />
                </motion.div>
              );
            })}
          </div>

          <svg width="0" height="0" className="absolute pointer-events-none">
            <defs>
              <clipPath id="folderPocketClip" clipPathUnits="objectBoundingBox">
                <path d="M 1 0 L 0.26 0 C 0.14 0, 0.09 0.12, 0.09 0.35 C 0.09 0.60, 0.10 0.76, 0.06 0.88 C 0.035 0.96, 0 1, 0 1 L 1 1 Z" />
              </clipPath>
            </defs>
          </svg>

          <div
            className="absolute bottom-0 right-0 w-[70%] md:w-[48%] h-[35%] pointer-events-none z-40 backdrop-blur-md bg-card-foreground/50 overflow-hidden"
            style={{
              clipPath: "url(#folderPocketClip)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({
  src,
  poster,
  isActive,
}: {
  src: string;
  poster: string;
  isActive: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      loop
      muted
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      preload="auto"
      className="w-full h-full object-cover pointer-events-none select-none"
    />
  );
}
