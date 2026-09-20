import type { Metadata } from "next";
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";

export const metadata: Metadata = generateSEOMetadata({
  title: "Notevo - Terms of Service",
  description:
    "Read Notevo's Terms of Service to understand the rules and guidelines for using our note taking platform. Learn about account management, liability, and user responsibilities.",
  path: "/terms-of-service",
  keywords: [
    "terms of service",
    "user agreement",
    "legal terms",
    "service terms",
  ],
});

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
