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
      <div className="absolute -top-6 -left-14 z-[2] pointer-events-none select-none">
        <PaperPieceIcon className="w-52 h-48 lg:w-60 lg:h-60" />
      </div>
      <div className="absolute -top-9 -right-44 md:-right-[9.9rem] z-[2] pointer-events-none select-none">
        <svg
          className="w-96 h-[28rem] md:h-[35rem]"
          width="56"
          height="180"
          viewBox="0 0 56 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clip-path="url(#clip0_427_12)">
            <path
              d="M74.9004 -46.8L0.000389099 -46.8L4.90039 -44.39L5.70039 -41.39L8.70039 -38.93L7.70039 -34.11V-30.39L5.63039 -27L10.9104 -20L18.0704 -19L18.2304 -13.8L25.5704 -12.37L26.9004 -8.8L31.2604 -8.17L32.2604 -2.78L36.3304 1.46C35.8617 3.12441 35.1722 4.71858 34.2804 6.2C33.0804 7.86 33.5404 12.62 33.5404 12.62L29.5404 15.2L26.6704 19.33L25.4704 25.57L23.5804 32.28L25.9904 38.13L28.8004 43.98L27.0804 50.57L28.0804 54.01L25.0804 59.01L28.4604 60.56L27.8304 64.86L31.0404 67.73L37.3404 70.59L36.4304 73.74L37.6904 78.62L35.7104 82.2L36.0604 86.39L33.7104 90.39L33.8204 97.79L31.5304 102.37L29.2404 107.82L22.1904 119.05L24.5404 121.98L23.2804 127.54L24.4204 132.24C24.4204 132.24 25.4904 139.75 28.4204 141.52C31.3504 143.29 34.2704 140.72 37.0704 141.64C39.8704 142.56 41.1404 148.64 46.5904 147.09L49.2504 154.54L48.6204 158.78L51.7704 161.19L49.6504 168.07L52.6504 171.79L48.3504 179.36L49.5004 183.89L43.9904 188.07H74.9004L74.9004 -46.8Z"
              fill="#644A40"
            />
            <path
              d="M48.3807 179.29L52.6807 171.72L49.6807 168L51.8007 161.12L48.6507 158.71L49.2807 154.47L46.6207 147.02C41.1707 148.56 39.9107 142.49 37.1007 141.57C34.2907 140.65 31.4307 143.23 28.4507 141.45C25.4707 139.67 24.4507 132.17 24.4507 132.17L23.3107 127.47L24.5707 121.91L22.2207 118.98L29.2707 107.75L31.5607 102.3L33.8507 97.72L33.7407 90.32L36.0907 86.32L35.7407 82.13L37.8107 78.58L36.5507 73.7L37.4607 70.55L31.1607 67.69L27.9007 64.87L28.5307 60.57L25.1507 59.02L28.1507 54.02L27.1507 50.58L28.8707 43.99L26.0307 38.1L23.6207 32.25L25.5107 25.54L26.7107 19.3L29.5807 15.2L33.5807 12.62C33.5807 12.62 33.1207 7.86 34.3207 6.2C35.2336 4.7348 35.9466 3.15414 36.4407 1.5L32.3307 -2.8L31.3307 -8.19L26.9007 -8.8L25.5307 -12.36L18.2307 -13.8L18.0007 -19.07L10.8407 -20.07L5.56067 -27.07L7.63067 -30.46V-34.18L8.63067 -39L5.63067 -41.46L4.83067 -44.46L0.000663757 -46.8L1.35066 -44.39L2.16067 -41.39L5.16067 -38.93L4.16067 -34.11L4.10066 -30.39L2.03066 -27L7.31067 -20L14.4707 -19L14.6507 -13.8L21.9907 -12.37L23.3707 -8.8L27.7207 -8.17L28.7207 -2.78L32.7907 1.46C32.3072 3.12567 31.6044 4.71965 30.7007 6.2C29.5007 7.86 29.9607 12.62 29.9607 12.62L25.9607 15.2L23.1007 19.33L21.9007 25.54L20.0107 32.25L22.4207 38.1L25.2307 43.95L23.5107 50.54L24.5107 53.98L21.5107 58.98L24.8907 60.53L24.2607 64.83L27.4707 67.7L33.9007 70.6L32.9807 73.75L34.2407 78.63L32.1407 82.2L32.4807 86.39L30.1307 90.39L30.2507 97.79L27.9007 102.3L25.6107 107.75L18.6107 118.98L20.9607 121.91L19.7007 127.47L20.8407 132.17C20.8407 132.17 23.2507 142.17 26.2307 143.98C29.2107 145.79 32.0807 143.17 34.8907 144.09C37.7007 145.01 38.1607 149.77 43.6007 148.22L45.7207 154.47L45.0907 158.71L48.2507 161.12L46.1207 168L49.1207 171.72L44.8207 179.29L45.9007 183.82L43.9707 188L49.4807 183.82L48.3807 179.29Z"
              fill="#644A40"
              fill-opacity="0.2"
            />
          </g>
          <defs>
            <clipPath id="clip0_427_12">
              <rect
                width="180"
                height="56"
                fill="white"
                transform="matrix(0 1 -1 0 56 0)"
              />
            </clipPath>
          </defs>
        </svg>
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
                      <AvatarFallback className="bg-primary/20 !rounded-full animate-pulse" />
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
