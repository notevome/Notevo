import type { ReactNode } from "react";
import type { Metadata } from "next";
import HomeClientLayout from "@/components/home-components/HomeClientLayout";
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";

export const metadata: Metadata = generateSEOMetadata({
  title: "Home",
  description: "Your Notevo Home - manage your notes and workspaces",
  path: "/home",
  noindex: true, // Private pages should not be indexed
});

export default function HomeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <HomeClientLayout>{children}</HomeClientLayout>;
}
