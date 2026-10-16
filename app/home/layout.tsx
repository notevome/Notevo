import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import HomeClientLayout from "@/components/home-components/HomeClientLayout";
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";

export const metadata: Metadata = generateSEOMetadata({
  title: "Home",
  description: "Your Notevo Home - manage your documents and folders",
  path: "/home",
  noindex: true, // Private pages should not be indexed
});

export default async function HomeLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isAuthenticatedNextjs())) {
    redirect("/");
  }

  return <HomeClientLayout>{children}</HomeClientLayout>;
}
