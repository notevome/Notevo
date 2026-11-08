import { MetadataRoute } from "next";

const siteUrl = "https://oraizive.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og*"],
        disallow: ["/home/", "/api/", "/signup/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
