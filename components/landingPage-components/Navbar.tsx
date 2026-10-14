"use client";
import { NavLinks } from "@/lib/data";
import Link from "next/link";
import { Button } from "../ui/button";
import Image from "next/image";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import NotevoLogo from "@/public/Notevo-logo.svg";

export default function Navbar() {
  const { scrollY } = useScroll();
  const [inView, setInView] = useState<boolean>(false);
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 100) {
      setInView(true);
    } else {
      setInView(false);
    }
  });

  return (
    <header className="sticky top-2 w-full z-50 transition-all">
      <div
        className={cn(
          "container mx-auto flex justify-between items-center p-4 my-2 app-radius-lg transition-all duration-300 bg-transparent",
        )}
      >
        <div
          className={`fixed top-0 w-full min-h-[4rem]  ${inView ? "opacity-100" : "opacity-0"} backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black,transparent)]
           [-webkit-mask-image:linear-gradient(to_bottom,black,transparent) -z-50 left-0 pointer-events-none`}
        />

        <div className="flex justify-start items-center gap-[5.5rem]">
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
        <Button asChild className="relative group h-10">
          <Link prefetch={true} href="/signup" className="text-sm font-medium">
            Login Or Create An Account
          </Link>
        </Button>
      </div>
    </header>
  );
}
