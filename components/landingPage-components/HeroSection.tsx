"use client";
import { Button } from "../ui/button";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useEffect, useRef, useState } from "react";
import MaxWContainer from "../ui/MaxWContainer";
import { useMediaQuery } from "react-responsive";
import { usePaginatedQuery } from "@/cache/usePaginatedQuery";
import { useTheme } from "next-themes";
import { NOISE_PNG } from "@/lib/data";
import { PaperPieceIcon } from "../ui/paper-pice";
import { Badge } from "../ui/badge";

function HeroVideo({
  src,
  poster,
  className,
  style,
}: {
  src: string;
  poster: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.play().catch(() => {});
  }, []);

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
      preload="metadata"
      className={className}
      style={style}
    />
  );
}

export default function HeroSection() {
  const { results, status } = usePaginatedQuery(
    api.users.users,
    {},
    { initialNumItems: 6 },
  );
  const [showBackground, setShowBackground] = useState(false);
  const { scrollY } = useScroll();
  const [inView, setInView] = useState<boolean>(false);
  const isMobile = useMediaQuery({ maxWidth: 640 });
  const isTabletAir_horizontal = useMediaQuery({ maxWidth: 1180 });
  const isTabletPro_horizontal = useMediaQuery({ maxWidth: 1366 });

  useEffect(() => {
    const timer = setTimeout(() => setShowBackground(true), 650);
    return () => clearTimeout(timer);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setInView(latest > 90);
  });

  return (
    <section
      id="home"
      className="relative pb-12 pt-28 Desktop:pt-32 flex items-center justify-center overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 mask-image-gradient"
        style={{
          backgroundImage: `url(${NOISE_PNG})`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          opacity: 0.07,
          mixBlendMode: "multiply",
          zIndex: 5,
        }}
      />
      <div className="absolute -top-3 -left-14 z-[2] pointer-events-none select-none">
        <PaperPieceIcon className="w-40 h-36 md:w-56 md:h-48 lg:w-72 lg:h-64" />
      </div>
      <div className="absolute inset-0 z-[1] h-full w-full bg-transparent mask-image-gradient">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(-180deg, transparent, transparent 5px, rgba(75, 85, 99,0.4) 3px, rgba(75, 85, 99, 0.2) 7px, transparent 6px, transparent 112px),
              repeating-linear-gradient(-180deg, transparent, transparent 5px, rgba(107, 114, 128, 0.4) 3px, rgba(107, 114, 128, 0.2) 3px, transparent 5px, transparent 70px)
            `,
          }}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none select-none z-[1]">
        <motion.svg
          className="absolute rotate-90 -top-16 -right-20 w-40 h-40 md:w-48 md:h-48 text-primary/80"
          viewBox="0 0 120 120"
          initial={{ opacity: 0 }}
          animate={showBackground ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.14 }}
        >
          <motion.path
            d="M30 60 Q15 35,50 25 Q85 15,95 50 Q105 75,80 90 Q55 105,30 85"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              showBackground
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{
              pathLength: { duration: 0.35, ease: "easeOut", delay: 0.1 },
              opacity: { duration: 1 },
            }}
          />
        </motion.svg>
        <motion.svg
          className="absolute -left-8 top-[30%] w-32 h-24 text-primary/50 rotate-[8deg]"
          viewBox="0 0 140 100"
          initial={{ opacity: 0 }}
          animate={showBackground ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.14 }}
        >
          <motion.path
            d="M120 70 Q90 40,50 65 T20 45"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              showBackground
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{
              pathLength: { duration: 0.35, delay: 0.14, ease: "easeOut" },
              opacity: { duration: 1 },
            }}
          />
        </motion.svg>
      </div>
      <MaxWContainer className="z-[6] relative flex flex-col items-start justify-center space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.45 }}
          className="relative space-y-4 text-start"
        >
          <motion.h1
            className=" pt-3.5 bg-gradient-to-r from-primary/90 via-primary to-primary/90 bg-clip-text text-transparent leading-[50px] md:leading-[95px] md:text-[100px] text-[46px] font-bold tracking-tight"
            initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <span>Simple, Structured</span>
            <br />
            <motion.span
              className="relative inline-block "
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <span className=" text-start bg-gradient-to-r from-primary/90 via-primary to-primary/90 bg-clip-text">
                Note Taking
              </span>
              <motion.svg
                viewBox="0 0 300 40"
                preserveAspectRatio="none"
                className="absolute left-0 -bottom-4 w-full h-8"
              >
                <motion.path
                  d="M 5 25 Q 40 22, 80 26 T 150 24 T 220 26 T 295 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={
                    showBackground
                      ? { pathLength: 1, opacity: 1 }
                      : { pathLength: 0, opacity: 0 }
                  }
                  transition={{ duration: 1, ease: "easeOut", delay: 0.14 }}
                />
              </motion.svg>
            </motion.span>
          </motion.h1>
          <motion.p
            className="text-start max-w-2xl text-lg md:text-2xl text-muted-foreground font-bold"
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            Notevo helps you capture your thoughts{" "}
            <br className="hidden Desktop:block tabletAir:block tabletPro:block" />{" "}
            and organize them in one clean, modern interface.
          </motion.p>
        </motion.div>
        <motion.div
          className=" w-full flex gap-4 md:flex-row flex-col-reverse md:justify-between justify-center md:items-center items-start"
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          <motion.div
            className=" flex-1 flex items-center justify-start gap-8 px-1"
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.45, delay: 0.42 }}
          >
            <div className="flex -space-x-4">
              {status === "LoadingFirstPage" ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index}>
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/20 rounded-full animate-pulse" />
                    </Avatar>
                  </div>
                ))
              ) : (
                <>
                  {results
                    .filter((user) => user.image && user.name)
                    .slice(0, 5)
                    .map((user, indx) => (
                      <div key={user._id}>
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={user.image || "/placeholder.svg"}
                            alt={user.name || "User"}
                            className="rounded-full"
                          />
                          <AvatarFallback className="bg-primary/20 !rounded-full">
                            {user.name ? user.name.charAt(0) : "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ))}
                  {results.length > 5 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.0 }}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="text-sm font-medium !rounded-full">
                          + 75
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  )}
                </>
              )}
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              Join{" "}
              <span className="font-semibold text-foreground">
                {!results ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  ` 79 +`
                )}
              </span>{" "}
              Active users
            </p>
          </motion.div>
          <div className="flex gap-2 justify-start items-center">
            <Button
              asChild
              size="lg"
              className="relative group overflow-hidden h-9"
            >
              <Link prefetch={true} href="/signup">
                Get Started for Free
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="relative group h-9 !rounded-none"
            >
              <Link prefetch={true} href="#features">
                Learn More
              </Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, delay: 0.38 }}
          className="relative w-full p-1 Desktop:p-2 rounded-tl-lg bg-primary/50 backdrop-blur-lg"
        >
          <HeroVideo
            src="https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_1200/v1774021286/notevo-homepage_irogrs.mp4"
            poster="https://res.cloudinary.com/dkbwj5yyg/video/upload/q_80,w_1200/v1774021286/notevo-homepage_irogrs.jpg"
            className="w-full h-full object-cover rounded-tl-lg"
            style={{ pointerEvents: "none" }}
          />
        </motion.div>
      </MaxWContainer>
    </section>
  );
}
