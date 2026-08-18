import { useEffect } from "react";
import type { ToolMeta } from "../types/tool";

export function useSeo(meta: ToolMeta): void {
  useEffect(() => {
    const previousCanonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;

    document.title = meta.title;

    const description = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;
    if (description) {
      description.content = meta.description;
    }

    const canonicalHref = `${window.location.origin}${meta.canonical}`;
    const canonical = previousCanonical ?? document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = canonicalHref;
    if (!previousCanonical) {
      document.head.appendChild(canonical);
    }

    const socialTags: Array<[string, string]> = [
      ["og:title", meta.title],
      ["og:description", meta.description],
      ["og:url", canonicalHref],
      ["og:type", "website"],
    ];
    const socialMetaTags = socialTags.map(([property, content]) => {
      const tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
        ?? document.createElement("meta");
      tag.setAttribute("property", property);
      tag.content = content;
      if (!tag.parentNode) {
        document.head.appendChild(tag);
      }
      return tag;
    });

    const structuredData = document.querySelector("script[data-nexaforge-seo]") ?? document.createElement("script");
    structuredData.type = "application/ld+json";
    structuredData.setAttribute("data-nexaforge-seo", "true");
    structuredData.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: meta.title,
      description: meta.description,
      url: canonicalHref,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
    });
    if (!structuredData.parentNode) {
      document.head.appendChild(structuredData);
    }

    return () => {
      if (!previousCanonical) {
        canonical.remove();
      }
      socialMetaTags.forEach((tag) => {
        if (!document.querySelector(`meta[property="${tag.getAttribute("property")}"]`)) {
          tag.remove();
        }
      });
      if (!document.querySelector("script[data-nexaforge-seo]")) {
        structuredData.remove();
      }
    };
  }, [meta.title, meta.description, meta.canonical]);
}
