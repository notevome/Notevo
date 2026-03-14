import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import { ConvexQueryCacheProvider } from "@/cache/provider";
import {
  generateMetadata as generateSEOMetadata,
  generateStructuredData,
} from "@/lib/seo";
import Script from "next/script";
const lato = Lato({
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...generateSEOMetadata({
    title: "Notevo - Simple, Structured Note Taking",
    description:
      "Notevo helps you capture your thoughts, organize them effortlessly and interact with your notes in one clean, modern interface.",
    path: "/",
  }),
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = generateStructuredData({
    type: "SoftwareApplication",
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground flex flex-col min-h-screen",
          lato.className,
        )}
      >
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <Toaster />
        <Providers>
          <ConvexAuthNextjsServerProvider>
            <ConvexClientProvider>
              <ConvexQueryCacheProvider
                // Keep a small number of recently-used query subscriptions alive briefly to reduce
                // navigation flicker, but avoid runaway idle subscriptions (bandwidth).
                expiration={60_000}
                maxIdleEntries={20}
              >
                {children}
              </ConvexQueryCacheProvider>
            </ConvexClientProvider>
          </ConvexAuthNextjsServerProvider>
        </Providers>
      </body>
    </html>
  );
}
