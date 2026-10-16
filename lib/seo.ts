import type { Metadata } from "next";

const siteUrl = "https://notevo.me";
const siteName = "Notevo";
const defaultTitle = "Notevo - Simple, Structured Documents";
const defaultDescription =
  "Notevo helps you capture your thoughts, organize them effortlessly and interact with your documents in one clean, modern interface.";

interface GenerateMetadataParams {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  keywords?: string[];
}

export function generateMetadata({
  title,
  description,
  path = "",
  image = "/og-image.png",
  noindex = false,
  keywords = [],
}: GenerateMetadataParams = {}): Metadata {
  const fullTitle = title ? `${title}` : defaultTitle;
  const fullDescription = description || defaultDescription;
  const url = `${siteUrl}${path}`;
  const imageUrl = image.startsWith("http") ? image : `${siteUrl}${image}`;

  const defaultKeywords = [
    "document creation",
    "AI documents",
    "productivity",
    "organization",
    "smart documents",
    "document organizer",
    "collaborative documents",
    "folder",
  ];

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: [...defaultKeywords, ...keywords],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
          type: "image/png",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: fullDescription,
      images: [imageUrl],
      creator: "@notevo", // Update with your actual Twitter handle if available
    },
    robots: {
      index: !noindex,
      follow: !noindex,
      googleBot: {
        index: !noindex,
        follow: !noindex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      // Add your verification codes here when available
      // google: "your-google-verification-code",
      // yandex: "your-yandex-verification-code",
      // bing: "your-bing-verification-code",
    },
  };
}

export function generateStructuredData({
  type = "WebSite",
  name = siteName,
  description = defaultDescription,
  url = siteUrl,
  image = `${siteUrl}/og-image.png`,
}: {
  type?: "WebSite" | "Organization" | "SoftwareApplication";
  name?: string;
  description?: string;
  url?: string;
  image?: string;
} = {}) {
  const baseStructuredData = {
    "@context": "https://schema.org",
    "@type": type,
    name,
    description,
    url,
    image,
  };

  if (type === "WebSite") {
    return {
      ...baseStructuredData,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${url}/home?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    };
  }

  if (type === "SoftwareApplication") {
    return {
      ...baseStructuredData,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    };
  }

  return baseStructuredData;
}
