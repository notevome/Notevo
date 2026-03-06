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
    if (latest > 90) {
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
      className="fixed top-0 w-full z-50 transition-all"
    >
      <motion.div
        className={cn(
          "container mx-auto flex justify-between items-center border-solid border p-4 my-2 rounded-2xl transition-all duration-300",
          inView
            ? "border-border bg-background/50 backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
        animate={{
          width: inView && !isMobile ? "60%" : "90%",
        }}
        transition={{
          ease: "easeInOut",
          duration: 0.1,
          delay: 0,
        }}
      >
        <div className="flex justify-center items-center gap-4">
          <Link
            href="/"
            onClick={() => {
              if (window.location.pathname === "/") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center gap-2 group"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Image
                src={NotevoLogo}
                alt="Notevo Logo"
                className="Desktop:hover:opacity-80 transition-opacity"
                priority
                width={40}
                height={40}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                initial={{ scale: 0 }}
                whileHover={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>
          </Link>

          <nav className="hidden lg:flex items-center gap-3">
            {NavLinks.map((link, i) => (
              <Button key={i} variant="SidebarMenuButton" className="px-2">
                <Link
                  href={link.path}
                  className="relative text-sm font-medium text-foreground transition-colors group"
                >
                  {link.Name}
                  <motion.span
                    className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary"
                    whileHover={{ width: "100%" }}
                    transition={{ duration: 0.3 }}
                  />
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <Button
            variant="SidebarMenuButton"
            asChild
            className="relative group"
          >
            <Link
              prefetch={true}
              href="/signup"
              className="text-sm font-medium"
            >
              Sign In
              <motion.span
                className="absolute inset-0 rounded-lg bg-primary/10"
                initial={{ scale: 0 }}
                whileHover={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            </Link>
          </Button>

          <Button asChild className="relative group">
            <Link
              prefetch={true}
              href="/signup"
              className="text-sm font-medium"
            >
              Get Started
              <motion.span
                className="absolute inset-0 rounded-lg bg-primary/20"
                initial={{ scale: 0 }}
                whileHover={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            </Link>
          </Button>
        </div>

        <button
          className="lg:hidden p-2 hover:bg-primary/10 rounded-lg transition-colors relative group"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <motion.div
            animate={isMenuOpen ? "open" : "closed"}
            className="relative w-6 h-6"
          >
            <motion.span
              className="absolute block w-6 h-0.5 bg-primary"
              variants={{
                closed: { top: 2, rotate: 0 },
                open: { top: 10, rotate: 45 },
              }}
            />
            <motion.span
              className="absolute block w-6 h-0.5 bg-primary"
              variants={{
                closed: { top: 10, rotate: 0 },
                open: { top: 10, rotate: -45 },
              }}
            />
            <motion.span
              className="absolute block w-6 h-0.5 bg-primary"
              variants={{
                closed: { top: 17, rotate: 0 },
                open: { top: 10, rotate: -45 },
              }}
            />
          </motion.div>
        </button>
      </motion.div>

      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="lg:hidden absolute top-full left-0 right-0 mt-2 mx-4"
        >
          <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-lg">
            <nav className="flex flex-col gap-2">
              {NavLinks.map((link, i) => (
                <Link
                  key={i}
                  href={link.path}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.Name}
                </Link>
              ))}

              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  asChild
                  className="w-full justify-center"
                >
                  <Link href="/signup" className="text-sm font-medium">
                    Sign In
                  </Link>
                </Button>

                <Button asChild className="w-full justify-center">
                  <Link href="/signup" className="text-sm font-medium">
                    Get Started
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
