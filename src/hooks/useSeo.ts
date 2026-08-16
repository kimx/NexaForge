import { useEffect } from "react";
import type { ToolMeta } from "../types/tool";

export function useSeo(meta: ToolMeta): void {
  useEffect(() => {
    const previousCanonical = document.querySelector(
      "link[rel='canonical']"
    ) as HTMLLinkElement | null;

    document.title = meta.title;

    const description = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;
    if (description) {
      description.content = meta.description;
    }

    const canonicalHref = `${window.location.origin}${meta.canonical}`;
    if (previousCanonical) {
      previousCanonical.href = canonicalHref;
      return;
    }

    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = canonicalHref;
    document.head.appendChild(canonical);

    return () => {
      canonical.remove();
    };
  }, [meta.title, meta.description, meta.canonical]);
}
