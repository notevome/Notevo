"use client";
import { NavLinks } from "@/lib/data";
import Link from "next/link";
import { Button } from "../ui/button";
import Image from "next/image";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import NotevoLogo from "@/public/Notevo-logo.svg";
import { useMediaQuery } from "react-responsive";

export default function Navbar() {
  const { scrollY } = useScroll();
  const [inView, setInView] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 640 });

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 100) {
      setInView(true);
    } else {
      setInView(false);
    }
  });

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ease: "linear", duration: 0.5 }}
      className=" sticky top-2 w-full z-50 transition-all"
    >
      <motion.div
        className={cn(
          "container mx-auto flex justify-between items-center  p-4 my-2 rounded-tl-2xl transition-all duration-300 bg-transparent",
        )}
        transition={{
          ease: "easeInOut",
          duration: 0.1,
          delay: 0,
        }}
      >
        {inView && (
          <div className=" fixed top-0 w-full min-h-[5rem] bg-gradient-to-b from-background from-10% to-100% to-transparent -z-50 left-0 pointer-events-none" />
        )}

        <div className="flex justify-start items-center gap-20">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative "
            onClick={() => {
              if (window.location.pathname === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            <Image
              src={NotevoLogo}
              alt="Notevo Logo"
              className="Desktop:hover:opacity-80 transition-opacity"
              priority
              width={40}
              height={40}
            />
          </motion.div>
          <nav className="hidden lg:flex justify-center items-center gap-3">
            {NavLinks.map((link, i) => (
              <Button key={i} variant="link" className="p-2 h-9">
                <Link
                  href={link.path}
                  target={link.target || "_self"}
                  className="relative text-sm font-medium text-foreground group "
                >
                  {link.Name}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <Button asChild className="hidden lg:block relative group h-9">
          <Link prefetch={true} href="/signup" className="text-sm font-medium">
            Login Or Create An Account
          </Link>
        </Button>
      </motion.div>
    </motion.header>
  );
}
3;
