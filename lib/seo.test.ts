import { describe, expect, it } from "vitest";
import { generateMetadata, generateStructuredData } from "./seo";

describe("generateMetadata", () => {
  it("generates defaults when no params are provided", () => {
    const meta = generateMetadata();
    expect(meta.title).toBe("Notevo - Simple, Structured Note Taking");
    expect(meta.description).toContain("Notevo helps you capture your thoughts");
    expect(meta.openGraph?.siteName).toBe("Notevo");
    const robots = meta.robots as any;
    expect(robots?.index).toBe(true);
  });

  it("honors custom title/description/path/image and noindex", () => {
    const meta = generateMetadata({
      title: "Custom",
      description: "Desc",
      path: "/x",
      image: "/img.png",
      noindex: true,
      keywords: ["k1"],
    });

    expect(meta.title).toBe("Custom");
    expect(meta.description).toBe("Desc");
    expect(meta.alternates?.canonical).toBe("https://notevo.me/x");
    expect((meta.openGraph as any)?.images?.[0]?.url).toBe("https://notevo.me/img.png");
    const robots = meta.robots as any;
    expect(robots?.index).toBe(false);
    expect(meta.keywords).toContain("k1");
  });
});

describe("generateStructuredData", () => {
  it("creates WebSite structured data with SearchAction", () => {
    const sd = generateStructuredData({ type: "WebSite", url: "https://example.com" });
    expect(sd["@type"]).toBe("WebSite");
    expect("potentialAction" in sd).toBe(true);
    if ("potentialAction" in sd) {
      expect((sd as any).potentialAction?.target?.urlTemplate).toBe(
        "https://example.com/home?search={search_term_string}",
      );
    }
  });

  it("creates SoftwareApplication structured data with Offer", () => {
    const sd = generateStructuredData({ type: "SoftwareApplication" });
    expect(sd["@type"]).toBe("SoftwareApplication");
    expect("offers" in sd).toBe(true);
    if ("offers" in sd) {
      expect((sd as any).offers?.priceCurrency).toBe("USD");
    }
  });
});
