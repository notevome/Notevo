import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "./providers";
import { ConvexQueryCacheProvider } from "@/cache/provider";
import {
  generateMetadata as generateSEOMetadata,
  generateStructuredData,
} from "@/lib/seo";
import Script from "next/script";

const lato = Lato({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lato",
});

export const metadata: Metadata = {
  ...generateSEOMetadata({
    title: "Notevo - Simple, Structured Note Taking",
    description:
      "Notevo helps you capture your thoughts, organize them effortlessly and interact with your notes in one clean, modern interface.",
    path: "/",
  }),
  icons: {
    icon: "/google-notevo-logo.png",
    shortcut: "/google-notevo-logo.png",
    apple: "/google-notevo-logo.png",
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
          lato.variable, // Changed to variable for better control
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
        <TooltipProvider skipDelayDuration={0}>
          <Providers>
            <ConvexAuthNextjsServerProvider>
              <ConvexClientProvider>
                <ConvexQueryCacheProvider
                  expiration={5 * 60_000}
                  maxIdleEntries={50}
                >
                  {children}
                </ConvexQueryCacheProvider>
              </ConvexClientProvider>
            </ConvexAuthNextjsServerProvider>
          </Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}
