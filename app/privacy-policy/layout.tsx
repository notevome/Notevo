import type { Metadata } from "next";
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";

export const metadata: Metadata = generateSEOMetadata({
  title: "Notevo - Privacy Policy",
  description:
    "Read Notevo's Privacy Policy to understand how we collect, use, and protect your personal information. Learn about our data practices and your privacy rights.",
  path: "/privacy-policy",
  keywords: ["privacy policy", "data protection", "GDPR", "user privacy"],
});

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
