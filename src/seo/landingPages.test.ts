import { FILE_TOOLS } from "../data/tools";
import {
  SEO_ALIAS_PAGES,
  SEO_SEARCH_PAGES,
  findSeoLanding,
  getSeoLandingContent,
} from "./landingPages";

describe("SEO search page catalog", () => {
  it("maps each new search-intent URL to a real tool and its initial mode", () => {
    expect(
      SEO_ALIAS_PAGES.map(({ path, toolId, preset }) => [path, toolId, preset])
    ).toEqual([
      ["/image/jpg-to-webp", "image-convert", { sourceFormat: "jpeg", outputFormat: "webp" }],
      ["/image/png-to-webp", "image-convert", { sourceFormat: "png", outputFormat: "webp" }],
      ["/image/webp-to-jpg", "image-convert", { sourceFormat: "webp", outputFormat: "jpeg" }],
      ["/image/heic-to-jpg", "heic-converter", { sourceFormat: "heic", outputFormat: "jpeg" }],
      ["/image/jpg-compress", "image-compress", { sourceFormat: "jpeg", outputFormat: "jpeg" }],
      ["/image/png-compress", "image-compress", { sourceFormat: "png", outputFormat: "png" }],
      ["/data/json-validator", "json-formatter", { mode: "validate" }],
      ["/developer/base64-encode", "base64", { mode: "textToBase64" }],
      ["/developer/base64-decode", "base64", { mode: "base64ToText" }],
      ["/developer/url-encode", "url-encoder", { mode: "encode" }],
      ["/developer/url-decode", "url-encoder", { mode: "decode" }],
      ["/developer/url-encode-decode", "url-encoder", {}],
    ]);
  });

  it("strengthens the priority existing URLs without registering duplicate aliases", () => {
    expect(
      SEO_SEARCH_PAGES.filter(({ isAlias }) => !isAlias).map(({ path }) => path)
    ).toEqual([
      "/image/resize",
      "/image/crop",
      "/pdf/merge",
      "/pdf/split",
      "/pdf/rotate",
      "/data/json-formatter",
      "/text/uuid",
      "/developer/unix-timestamp",
      "/qr-code",
      "/text/text-cleaner",
      "/text/find-replace",
      "/text/diff",
      "/text/markdown",
      "/pdf/reorder-pages",
      "/pdf/delete-pages",
      "/pdf/extract-pages",
      "/pdf/watermark",
      "/pdf/add-page-numbers",
      "/pdf/metadata",
      "/data/json-diff",
      "/data/jsonpath-tester",
      "/data/yaml-json",
    ]);
    expect(new Set(SEO_SEARCH_PAGES.map(({ path }) => path)).size).toBe(
      SEO_SEARCH_PAGES.length
    );
  });

  it("resolves localized paths, query strings, and hash fragments to the base entry", () => {
    expect(findSeoLanding("/en/image/jpg-to-webp?quality=80#workspace")?.path).toBe(
      "/image/jpg-to-webp"
    );
    expect(getSeoLandingContent("/en/image/jpg-to-webp", "en")?.h1).toBe(
      "Free Online JPG to WebP Converter"
    );
    expect(getSeoLandingContent("/image/jpg-to-webp", "zh-TW")?.h1).toBe(
      "免費線上 JPG 轉 WebP"
    );
  });

  it("provides useful bilingual content and only links to working destinations", () => {
    const validPaths = new Set([
      "/",
      "/json",
      ...FILE_TOOLS.map(({ path }) => path),
      ...SEO_SEARCH_PAGES.map(({ path }) => path),
    ]);

    for (const page of SEO_SEARCH_PAGES) {
      expect(FILE_TOOLS.some(({ id }) => id === page.toolId)).toBe(true);
      for (const locale of ["zh-TW", "en"] as const) {
        const content = page.content[locale];
        expect(content.title.length).toBeGreaterThan(20);
        expect.soft(
          content.description.length,
          `${page.path} ${locale} description`
        ).toBeGreaterThan(40);
        expect(content.h1.length).toBeGreaterThan(5);
        expect(content.intro.length).toBeGreaterThan(40);
        expect(content.sections).toHaveLength(2);
        expect(content.sections.every(({ heading, body }) => heading && body.length > 40)).toBe(true);
        expect(content.steps).toHaveLength(3);
        expect(content.privacy.length).toBeGreaterThan(40);
        expect(content.faq.length).toBeGreaterThanOrEqual(2);
        expect(content.related).toHaveLength(4);
        expect(content.related.every(({ path, label }) => validPaths.has(path) && label.length > 2)).toBe(true);
      }
    }
  });
});
