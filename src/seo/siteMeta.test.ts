import { INDEXABLE_ROUTES } from "../routing/routes";
import { buildPageSeo, SITE_ORIGIN } from "./siteMeta";

describe("buildPageSeo", () => {
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
