import type { Locale } from "../context/LanguageContext";
import { translate } from "../context/LanguageContext";
import { FILE_TOOLS } from "../data/tools";
import { localizePath, stripLocalePrefix } from "../routing/localePaths";
import { isJsonTool } from "../utils/toolPaths";
import { findSeoLanding, getSeoLandingContent } from "./landingPages";

export const SITE_ORIGIN = "https://nexaforge.kimx.info";

export interface PageSeo {
  title: string;
  description: string;
  canonical: string;
  alternates: {
    "zh-Hant": string;
    en: string;
    "x-default": string;
  };
  openGraph: {
    title: string;
    description: string;
    url: string;
    type: "website";
    siteName: string;
    locale: "zh_TW" | "en_US";
    alternateLocale: "zh_TW" | "en_US";
    image: string;
  };
  twitter: {
    card: "summary_large_image";
    title: string;
    description: string;
    image: string;
  };
  jsonLd: Array<Record<string, unknown>>;
}

function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

function localizedLanguage(locale: Locale): "zh-Hant" | "en" {
  return locale === "en" ? "en" : "zh-Hant";
}

function breadcrumbJsonLd(
  basePath: string,
  locale: Locale,
  pageName: string
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: translate(locale, "sidebar.home"),
        item: absoluteUrl(localizePath("/", locale)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageName,
        item: absoluteUrl(localizePath(basePath, locale)),
      },
    ],
  };
}

export function buildPageSeo(path: string, locale: Locale): PageSeo {
  const basePath = stripLocalePrefix(path.split(/[?#]/, 1)[0] || "/");
  const landing = findSeoLanding(basePath);
  const landingContent = getSeoLandingContent(basePath, locale);
  const tool = FILE_TOOLS.find((candidate) => candidate.path === basePath)
    ?? FILE_TOOLS.find((candidate) => candidate.id === landing?.toolId);
  const siteName = "NexaForge";
  const localSuffix = translate(locale, "seo.localSuffix");

  let pageName: string;
  let title: string;
  let baseDescription: string;

  if (landingContent) {
    pageName = landingContent.h1;
    title = landingContent.title;
    baseDescription = landingContent.description;
  } else if (basePath === "/") {
    pageName = siteName;
    title = translate(locale, "seo.homeTitle");
    baseDescription = translate(locale, "home.subtitle");
  } else if (basePath === "/json") {
    pageName = translate(locale, "jsonHub.title");
    title = `${pageName} | ${siteName}`;
    baseDescription = translate(locale, "jsonHub.description");
  } else if (tool) {
    pageName = translate(locale, `tool.${tool.id}.title`);
    title = `${pageName} | ${siteName}`;
    baseDescription = translate(locale, `tool.${tool.id}.description`);
  } else {
    pageName = translate(locale, "notFound.title");
    title = `${pageName} | ${siteName}`;
    baseDescription = translate(locale, "notFound.description");
  }

  const description = landingContent
    ? baseDescription
    : `${baseDescription} ${localSuffix}`.trim();
  const canonicalPath = localizePath(basePath, locale);
  const canonical = absoluteUrl(canonicalPath);
  const chineseUrl = absoluteUrl(localizePath(basePath, "zh-TW"));
  const englishUrl = absoluteUrl(localizePath(basePath, "en"));
  const image = `${SITE_ORIGIN}/nexaforge-hero.png`;
  const language = localizedLanguage(locale);

  const jsonLd: Array<Record<string, unknown>> = [];
  if (basePath === "/") {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${canonical}#website`,
      name: siteName,
      url: canonical,
      description,
      inLanguage: language,
    });
  } else if (tool) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": landing?.isAlias ? "SoftwareApplication" : "WebApplication",
      "@id": `${canonical}#application`,
      name: pageName,
      description,
      url: canonical,
      applicationCategory:
        isJsonTool(tool.id) || tool.category === "Developer"
          ? "DeveloperApplication"
          : "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern web browser with JavaScript enabled",
      isAccessibleForFree: true,
      inLanguage: language,
      offers: {
        "@type": "Offer",
        price: 0,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    });
    jsonLd.push(breadcrumbJsonLd(basePath, locale, pageName));
    if (landingContent) {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: landingContent.faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: {
            "@type": "Answer",
            text: a,
          },
        })),
      });
    }
  } else if (basePath === "/json") {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${canonical}#collection`,
      name: pageName,
      description,
      url: canonical,
      inLanguage: language,
    });
    jsonLd.push(breadcrumbJsonLd(basePath, locale, pageName));
  }

  return {
    title,
    description,
    canonical,
    alternates: {
      "zh-Hant": chineseUrl,
      en: englishUrl,
      "x-default": chineseUrl,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName,
      locale: locale === "en" ? "en_US" : "zh_TW",
      alternateLocale: locale === "en" ? "zh_TW" : "en_US",
      image,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image,
    },
    jsonLd,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderSeoHead(seo: PageSeo): string {
  const tags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}">`,
    '<meta name="robots" content="index,follow,max-image-preview:large">',
    `<link rel="canonical" href="${escapeHtml(seo.canonical)}">`,
    ...Object.entries(seo.alternates).map(
      ([hrefLang, href]) =>
        `<link rel="alternate" hreflang="${escapeHtml(hrefLang)}" href="${escapeHtml(href)}">`
    ),
    `<meta property="og:title" content="${escapeHtml(seo.openGraph.title)}">`,
    `<meta property="og:description" content="${escapeHtml(seo.openGraph.description)}">`,
    `<meta property="og:url" content="${escapeHtml(seo.openGraph.url)}">`,
    `<meta property="og:type" content="${escapeHtml(seo.openGraph.type)}">`,
    `<meta property="og:site_name" content="${escapeHtml(seo.openGraph.siteName)}">`,
    `<meta property="og:locale" content="${escapeHtml(seo.openGraph.locale)}">`,
    `<meta property="og:locale:alternate" content="${escapeHtml(seo.openGraph.alternateLocale)}">`,
    `<meta property="og:image" content="${escapeHtml(seo.openGraph.image)}">`,
    `<meta name="twitter:card" content="${escapeHtml(seo.twitter.card)}">`,
    `<meta name="twitter:title" content="${escapeHtml(seo.twitter.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(seo.twitter.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(seo.twitter.image)}">`,
    ...seo.jsonLd.map(
      (value, index) =>
        `<script type="application/ld+json" data-nexaforge-seo="${index}">${JSON.stringify(value).replace(/</g, "\\u003c")}</script>`
    ),
  ];
  return tags.join("\n");
}
