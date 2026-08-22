import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { buildPageSeo } from "../seo/siteMeta";
import type { ToolMeta } from "../types/tool";

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string
): HTMLMetaElement {
  const selector = `meta[${attribute}="${key}"]`;
  const tag = document.querySelector(selector) as HTMLMetaElement | null
    ?? document.createElement("meta");
  tag.setAttribute(attribute, key);
  tag.content = content;
  if (!tag.parentNode) {
    document.head.appendChild(tag);
  }
  return tag;
}

function upsertCanonical(href: string): HTMLLinkElement {
  const tag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    ?? document.createElement("link");
  tag.rel = "canonical";
  tag.href = href;
  if (!tag.parentNode) {
    document.head.appendChild(tag);
  }
  return tag;
}

export function useSeo(meta: ToolMeta): void {
  const { locale } = useLanguage();

  useEffect(() => {
    const seo = buildPageSeo(meta.canonical, locale);
    document.documentElement.lang = locale === "en" ? "en" : "zh-Hant";
    document.title = seo.title;

    upsertMeta("name", "description", seo.description);
    upsertMeta(
      "name",
      "robots",
      meta.noIndex ? "noindex,nofollow" : "index,follow,max-image-preview:large"
    );
    upsertCanonical(seo.canonical);

    document
      .querySelectorAll('link[data-nexaforge-seo-link="alternate"]')
      .forEach((tag) => tag.remove());
    Object.entries(seo.alternates).forEach(([hrefLang, href]) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = hrefLang;
      link.href = href;
      link.setAttribute("data-nexaforge-seo-link", "alternate");
      document.head.appendChild(link);
    });

    const openGraphTags: Array<[string, string]> = [
      ["og:title", seo.openGraph.title],
      ["og:description", seo.openGraph.description],
      ["og:url", seo.openGraph.url],
      ["og:type", seo.openGraph.type],
      ["og:site_name", seo.openGraph.siteName],
      ["og:locale", seo.openGraph.locale],
      ["og:locale:alternate", seo.openGraph.alternateLocale],
      ["og:image", seo.openGraph.image],
    ];
    openGraphTags.forEach(([property, content]) => {
      upsertMeta("property", property, content);
    });

    const twitterTags: Array<[string, string]> = [
      ["twitter:card", seo.twitter.card],
      ["twitter:title", seo.twitter.title],
      ["twitter:description", seo.twitter.description],
      ["twitter:image", seo.twitter.image],
    ];
    twitterTags.forEach(([name, content]) => {
      upsertMeta("name", name, content);
    });

    document
      .querySelectorAll("script[data-nexaforge-seo]")
      .forEach((tag) => tag.remove());
    seo.jsonLd.forEach((value, index) => {
      const structuredData = document.createElement("script");
      structuredData.type = "application/ld+json";
      structuredData.setAttribute("data-nexaforge-seo", String(index));
      structuredData.textContent = JSON.stringify(value).replace(/</g, "\\u003c");
      document.head.appendChild(structuredData);
    });
  }, [locale, meta.canonical, meta.noIndex]);
}
