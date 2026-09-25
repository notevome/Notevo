"use client";
import { Features } from "@/lib/data";
import { motion, useScroll, useTransform } from "framer-motion";
import MaxWContainer from "@/components/ui/MaxWContainer";
import SectionHeading from "./SectionHeading";
import Section from "../ui/Section";
import { NOISE_PNG } from "@/lib/data";
import { useEffect, useRef } from "react";

const featureVideos: Record<string, { video: string; poster: string }> = {
  "Rich Text Editor": {
    video:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774031746/notevo-texteditor_wcwq0c.mp4",
    poster:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774031746/notevo-texteditor_wcwq0c.jpg",
  },
  "Simple Organization": {
    video:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774032089/notevo-workingspace_vq80uc.mp4",
    poster:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774032089/notevo-workingspace_vq80uc.jpg",
  },
  "Don't Loss Ur Stuff": {
    video:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1777131625/notevo-search_dd7jou.mp4",
    poster:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1777131625/notevo-search_dd7jou.jpg",
  },
  "Publish Your Notes": {
    video:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774029719/notevo-Publish_xvq0mm.mp4",
    poster:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774029719/notevo-Publish_xvq0mm.jpg",
  },
  "Download Your Stuff": {
    video:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774031511/notevo-Downloadyoursfuff_zhgjsp.mp4",
    poster:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774031511/notevo-Downloadyoursfuff_zhgjsp.jpg",
  },
  "Move Your Notes": {
    video:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774032857/notevo-moveyourstuff_xyxnhr.mp4",
    poster:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774032857/notevo-moveyourstuff_xyxnhr.jpg",
  },
};

function FolderTab({ className }: { className?: string }) {
  const outline =
    "M0.5 24 V9.5 Q0.5 0.5 9.5 0.5 H90 Q95 0.5 98.5 4.5 L112 19 Q115.5 23.5 121 23.5 H130";
  return (
    <svg
      aria-hidden
      width="145"
      height="28"
      viewBox="0 0 130 24"
      className={className}
    >
      <path d={`${outline} V24 H0 Z`} className="fill-primary" stroke="none" />
      <path d={outline} fill="none" strokeWidth="1" className="stroke-border" />
    </svg>
  );
}

function LazyVideo({
  video,
  poster,
  className,
  style,
}: {
  video: string;
  poster: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const el = videoRef.current;
    if (!wrapper || !el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadedRef.current) {
          loadedRef.current = true;
          el.src = video;
          el.load();
          el.play().catch(() => {});
          observer.disconnect();
        }
      },
      { rootMargin: "0px", threshold: 0.1 },
    );

    observer.observe(wrapper);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <video
        ref={videoRef}
        poster={poster}
        loop
        muted
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        preload="none"
        className={className}
        style={style}
      />
    </div>
  );
}

function FolderFrame({ video, poster }: { video: string; poster: string }) {
  return (
    <div className="relative">
      <div className="relative flex justify-start">
        <FolderTab className="relative -mb-px" />
      </div>

      <div className="relative  overflow-hidden rounded-none border border-border border-t-0 bg-gradient-to-br from-primary via-primary/70 to-transparent p-1.5 ">
        <div className="relative overflow-hidden rounded-none">
          <LazyVideo
            video={video}
            poster={poster}
            className="h-full w-full object-cover"
            style={{ pointerEvents: "none" }}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  feature,
  isEven,
}: {
  feature: (typeof Features)[number];
  isEven: boolean;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const featureMedia = featureVideos[feature.title];

  const { scrollYProgress } = useScroll({
    target: itemRef,
    offset: ["start 0.9", "end 0.1"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.88, 1, 0.88]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 1, 0.3]);

  if (!featureMedia) return null;
  const { video, poster } = featureMedia;

  return (
    <motion.div
      ref={itemRef}
      style={{ scale, opacity }}
      className={`flex flex-col will-change-transform ${
        isEven ? "md:flex-row" : "md:flex-row-reverse"
      } items-center gap-8 md:gap-12`}
    >
      <div className="w-full md:w-2/3">
        <FolderFrame video={video} poster={poster} />
      </div>
      <div className="w-full md:w-1/2">
        <div className="Desktop:h-80 flex flex-col items-start justify-end">
          <div className="mb-4 flex items-start gap-4">
            <div className="relative bg-primary/10 app-radius-lg p-3">
              <feature.icon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
            {feature.title}
          </h3>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function FeaturesSection() {
  return (
    <Section sectionId="features" className="relative overflow-hidden bg-muted">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 app-radius-lg"
        style={{
          backgroundImage: `url(${NOISE_PNG})`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          opacity: 0.07,
          mixBlendMode: "multiply",
          zIndex: 5,
        }}
      />
      <MaxWContainer className="relative z-10">
        <SectionHeading
          SectionTitle="Features you'll love"
          SectionSubTitle="Everything you need to take your notes without the hassle."
        />
        <div className="space-y-32 py-12">
          {Features.map((feature, index) => {
            const isEven = index % 2 === 0;
            if (!featureVideos[feature.title]) return null;
            return (
              <FeatureItem key={index} feature={feature} isEven={isEven} />
            );
          })}
        </div>
      </MaxWContainer>
    </Section>
  );
}
