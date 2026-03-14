import type { ReactNode } from "react";
import type { Metadata } from "next";
import HomeClientLayout from "@/components/home-components/HomeClientLayout";
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";

export const metadata: Metadata = generateSEOMetadata({
  title: "Home",
  description: "Your Notevo Home - manage your notes and workspaces",
  path: "/home",
  noindex: true, // Private pages should not be indexed
});

export default async function HomeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/signup");
  }

  const preloadedViewer = await preloadQuery(api.users.viewer, {}, { token });
  const preloadedRecentWorkspaces = await preloadQuery(
    api.workingSpaces.getRecentWorkingSpaces,
    {},
    { token },
  );

  return (
    <HomeClientLayout
      homeData={{
        preloadedViewer,
        preloadedRecentWorkspaces,
      }}
    >
      {children}
    </HomeClientLayout>
  );
}
