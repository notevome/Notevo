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
    title: "Oraizive - Simple, Structured Space For Things",
    description:
      "oraizive helps you capture your thoughts, organize them effortlessly and interact with your documents in one clean, modern interface.",
    path: "/",
  }),
  icons: {
    icon: "/google-oraizive-logo.png",
    shortcut: "/google-oraizive-logo.png",
    apple: "/google-oraizive-logo.png",
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
      <head>
        <link
          rel="preload"
          as="image"
          href="https://texturelabs.org/wp-content/uploads/Texturelabs_Fabric_141S.jpg"
          fetchPriority="high"
        />
      </head>
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
