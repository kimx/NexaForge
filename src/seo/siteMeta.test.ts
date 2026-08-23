import { BASE_INDEXABLE_ROUTES, INDEXABLE_ROUTES } from "../routing/routes";
import { SEO_SEARCH_PAGES } from "./landingPages";
import { buildPageSeo, SITE_ORIGIN } from "./siteMeta";

describe("buildPageSeo", () => {
  it("indexes bilingual search-intent routes with matching application and FAQ data", () => {
    expect(BASE_INDEXABLE_ROUTES).toEqual(expect.arrayContaining([
      "/image/jpg-to-webp",
      "/data/json-validator",
      "/developer/base64-decode",
    ]));
    expect(INDEXABLE_ROUTES).toContain("/en/developer/url-decode");

    const seo = buildPageSeo("/en/image/jpg-to-webp", "en");

    expect(seo.title).toBe(
      "Free Online JPG to WebP Converter — Private Browser Tool | NexaForge"
    );
    expect(seo.description).toContain("Convert JPG images to WebP for free");
    expect(seo.canonical).toBe(`${SITE_ORIGIN}/en/image/jpg-to-webp`);
    expect(seo.alternates["zh-Hant"]).toBe(`${SITE_ORIGIN}/image/jpg-to-webp`);
    expect(seo.openGraph.title).toBe(seo.title);
    expect(seo.jsonLd).toEqual(expect.arrayContaining([
      expect.objectContaining({
        "@type": "SoftwareApplication",
        applicationCategory: "UtilitiesApplication",
      }),
      expect.objectContaining({ "@type": "BreadcrumbList" }),
      expect.objectContaining({
        "@type": "FAQPage",
        mainEntity: expect.arrayContaining([
          expect.objectContaining({
            "@type": "Question",
            name: "Will NexaForge upload or store my input?",
          }),
        ]),
      }),
    ]));
  });

  it("keeps localized titles, descriptions, and canonicals unique across search pages", () => {
    const pages = SEO_SEARCH_PAGES.flatMap(({ path }) => [
      buildPageSeo(path, "zh-TW"),
      buildPageSeo(`/en${path}`, "en"),
    ]);

    expect(new Set(pages.map(({ title }) => title)).size).toBe(pages.length);
    expect(new Set(pages.map(({ description }) => description)).size).toBe(pages.length);
    expect(new Set(pages.map(({ canonical }) => canonical)).size).toBe(pages.length);
  });

  it("classifies the Regex Tester as a bilingual developer application", () => {
    const seo = buildPageSeo("/developer/regex-tester", "en");

    expect(seo.title).toContain("Regex Tester");
    expect(seo.canonical).toBe(
      "https://nexaforge.kimx.info/en/developer/regex-tester"
    );
    expect(seo.alternates["zh-Hant"]).toBe(
      "https://nexaforge.kimx.info/developer/regex-tester"
    );
    expect(seo.jsonLd).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@type": "WebApplication",
          applicationCategory: "DeveloperApplication",
        }),
      ])
    );
  });

  it("classifies SQL and Cron tools as bilingual developer applications", () => {
    const sql = buildPageSeo("/developer/sql-formatter", "en");
    const cron = buildPageSeo("/developer/cron-builder", "en");

    expect(sql.title).toContain("SQL Formatter");
    expect(sql.canonical).toBe(`${SITE_ORIGIN}/en/developer/sql-formatter`);
    expect(sql.alternates["zh-Hant"]).toBe(`${SITE_ORIGIN}/developer/sql-formatter`);
    expect(cron.title).toContain("Cron Expression Builder");
    expect(cron.canonical).toBe(`${SITE_ORIGIN}/en/developer/cron-builder`);
    expect(cron.jsonLd).toEqual(expect.arrayContaining([
      expect.objectContaining({ applicationCategory: "DeveloperApplication" }),
    ]));
  });

  it("classifies URL Parser and cURL to Code as bilingual developer applications", () => {
    const url = buildPageSeo("/developer/url-parser", "en");
    const curl = buildPageSeo("/developer/curl-to-code", "en");

    expect(url.title).toContain("URL Parser");
    expect(url.canonical).toBe(`${SITE_ORIGIN}/en/developer/url-parser`);
    expect(url.alternates["zh-Hant"]).toBe(`${SITE_ORIGIN}/developer/url-parser`);
    expect(curl.title).toContain("cURL to Code");
    expect(curl.canonical).toBe(`${SITE_ORIGIN}/en/developer/curl-to-code`);
    expect(curl.jsonLd).toEqual(expect.arrayContaining([
      expect.objectContaining({ applicationCategory: "DeveloperApplication" }),
    ]));
  });

  it("builds localized metadata for a QR reader route", () => {
    const seo = buildPageSeo("/qr-code/reader", "en");

    expect(seo.title).toContain("QR Code Reader");
    expect(seo.canonical).toBe("https://nexaforge.kimx.info/en/qr-code/reader");
    expect(seo.alternates["zh-Hant"]).toBe("https://nexaforge.kimx.info/qr-code/reader");
    expect(seo.jsonLd).toEqual(expect.arrayContaining([
      expect.objectContaining({ "@type": "WebApplication" }),
    ]));
  });

  it("classifies code generation and XML routes with localized canonicals", () => {
    const csharp = buildPageSeo("/developer/json-to-csharp", "en");
    const xml = buildPageSeo("/data/json-xml", "en");

    expect(csharp.title).toContain("JSON → C# Class");
    expect(csharp.canonical).toBe("https://nexaforge.kimx.info/en/developer/json-to-csharp");
    expect(csharp.jsonLd).toEqual(expect.arrayContaining([
      expect.objectContaining({ applicationCategory: "DeveloperApplication" }),
    ]));
    expect(xml.title).toContain("JSON ↔ XML");
    expect(xml.alternates["zh-Hant"]).toBe("https://nexaforge.kimx.info/data/json-xml");
  });

  it("builds bilingual metadata for advanced image routes", () => {
    const seo = buildPageSeo("/image/favicon-generator", "en");
    expect(seo.title).toContain("Favicon Generator");
    expect(seo.canonical).toBe("https://nexaforge.kimx.info/en/image/favicon-generator");
    expect(seo.alternates["zh-Hant"]).toBe("https://nexaforge.kimx.info/image/favicon-generator");
    expect(seo.jsonLd).toEqual(expect.arrayContaining([expect.objectContaining({ applicationCategory: "UtilitiesApplication" })]));
  });

  it("builds production bilingual URLs and structured data for a JSON tool", () => {
    const seo = buildPageSeo("/data/json-formatter", "en");

    expect(seo.canonical).toBe(
      "https://nexaforge.kimx.info/en/data/json-formatter"
    );
    expect(seo.alternates).toEqual({
      "zh-Hant": "https://nexaforge.kimx.info/data/json-formatter",
      en: "https://nexaforge.kimx.info/en/data/json-formatter",
      "x-default": "https://nexaforge.kimx.info/data/json-formatter",
    });
    expect(seo.openGraph.url).toBe(seo.canonical);
    expect(seo.twitter.card).toBe("summary_large_image");
    expect(seo.jsonLd).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@type": "WebApplication",
          applicationCategory: "DeveloperApplication",
          offers: expect.objectContaining({ price: 0, priceCurrency: "USD" }),
        }),
        expect.objectContaining({ "@type": "BreadcrumbList" }),
      ])
    );
  });

  it("uses the Chinese URL as x-default even when given an English path", () => {
    const seo = buildPageSeo("/en/developer/json-diff", "en");

    expect(seo.canonical).toBe(`${SITE_ORIGIN}/en/developer/json-diff`);
    expect(seo.alternates["x-default"]).toBe(
      `${SITE_ORIGIN}/developer/json-diff`
    );
  });

  it("provides non-empty route-specific metadata for every indexable route", () => {
    const pages = INDEXABLE_ROUTES.map((path) =>
      buildPageSeo(path, path === "/en" || path.startsWith("/en/") ? "en" : "zh-TW")
    );

    expect(pages.every((page) => page.title.length > 10)).toBe(true);
    expect(pages.every((page) => page.description.length > 30)).toBe(true);
    expect(pages.every((page) => page.canonical.startsWith(SITE_ORIGIN))).toBe(true);
    expect(new Set(pages.map((page) => page.canonical)).size).toBe(pages.length);
  });
});
