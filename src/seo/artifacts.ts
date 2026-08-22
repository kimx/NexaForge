import {
  localeFromPath,
  localizePath,
  stripLocalePrefix,
} from "../routing/localePaths";
import { SITE_ORIGIN } from "./siteMeta";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

export function buildSitemap(routes: readonly string[]): string {
  const uniqueRoutes = Array.from(new Set(routes)).filter(
    (path) => stripLocalePrefix(path) !== "/text/base64"
  );
  const entries = uniqueRoutes.map((path) => {
    const locale = localeFromPath(path);
    const basePath = stripLocalePrefix(path);
    const currentUrl = absoluteUrl(localizePath(basePath, locale));
    const chineseUrl = absoluteUrl(localizePath(basePath, "zh-TW"));
    const englishUrl = absoluteUrl(localizePath(basePath, "en"));
    return [
      "  <url>",
      `    <loc>${escapeXml(currentUrl)}</loc>`,
      `    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${escapeXml(chineseUrl)}" />`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(englishUrl)}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(chineseUrl)}" />`,
      "  </url>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}
