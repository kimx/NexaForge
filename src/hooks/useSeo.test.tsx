import { render, waitFor } from "@testing-library/react";
import type { ToolMeta } from "../types/tool";
import { LanguageProvider } from "../context/LanguageContext";
import { useSeo } from "./useSeo";

function SeoProbe({ meta }: { meta: ToolMeta }): null {
  useSeo(meta);
  return null;
}

const formatterMeta: ToolMeta = {
  title: "JSON Formatter - NexaForge",
  description: "Format JSON locally in your browser.",
  canonical: "/data/json-formatter",
  h1: "JSON Formatter",
};

describe("useSeo", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="description" data-base-owned="true" content="base">';
  });

  it("writes a complete, production-only and idempotent head", async () => {
    const { rerender } = render(
      <LanguageProvider initialLocale="en">
        <SeoProbe meta={formatterMeta} />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
        "href",
        "https://nexaforge.kimx.info/en/data/json-formatter"
      );
    });
    expect(document.documentElement.lang).toBe("en");
    expect(document.querySelector('link[hreflang="zh-Hant"]')).toHaveAttribute(
      "href",
      "https://nexaforge.kimx.info/data/json-formatter"
    );
    expect(document.querySelector('link[hreflang="x-default"]')).toHaveAttribute(
      "href",
      "https://nexaforge.kimx.info/data/json-formatter"
    );
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
      "content",
      "https://nexaforge.kimx.info/en/data/json-formatter"
    );
    expect(document.querySelector('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );
    const structuredData = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[data-nexaforge-seo]')
    ).map((script) => JSON.parse(script.textContent ?? "{}"));
    expect(structuredData).toHaveLength(3);
    expect(structuredData).toEqual(
      expect.arrayContaining([expect.objectContaining({ "@type": "FAQPage" })])
    );

    rerender(
      <LanguageProvider initialLocale="en">
        <SeoProbe meta={formatterMeta} />
      </LanguageProvider>
    );

    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('link[rel="alternate"]')).toHaveLength(3);
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(document.querySelectorAll('script[data-nexaforge-seo]')).toHaveLength(3);
    expect(document.querySelector('meta[data-base-owned="true"]')).toBeInTheDocument();
  });
});
