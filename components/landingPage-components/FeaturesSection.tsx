"use client";
import { Features } from "@/lib/data";
import { motion } from "framer-motion";
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
  "Move Your Stuff": {
    video:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774032857/notevo-moveyourstuff_xyxnhr.mp4",
    poster:
      "https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_900/v1774032857/notevo-moveyourstuff_xyxnhr.jpg",
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = (x: number) => ({
  hidden: { opacity: 0, x, y: 24 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
});

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
    <div ref={wrapperRef}>
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

export default function FeaturesSection() {
  return (
    <Section sectionId="features" className="relative overflow-hidden bg-muted">
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0"
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
        <div className="space-y-24">
          {Features.map((feature, index) => {
            const isEven = index % 2 === 0;
            const { video, poster } = featureVideos[feature.title];
            return (
              <motion.div
                key={index}
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                className={`flex flex-col ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                } gap-8 md:gap-12 items-center`}
              >
                <motion.div
                  variants={itemVariants(isEven ? -40 : 40)}
                  className="w-full md:w-2/3"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 from-50% to-transparent border-border rounded-lg" />
                    <div className="relative bg-gradient-to-br from-primary/10 from-50% to-transparent border-border rounded-lg p-1 Desktop:p-2 overflow-hidden">
                      <LazyVideo
                        video={video}
                        poster={poster}
                        className="w-full h-full object-cover rounded-lg"
                        style={{ pointerEvents: "none" }}
                      />
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  variants={itemVariants(isEven ? 40 : -40)}
                  className="w-full md:w-1/2"
                >
                  <div className="Desktop:h-80 flex flex-col justify-end items-start">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative bg-primary/10 rounded-lg p-3">
                        <feature.icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </MaxWContainer>
    </Section>
  );
}
