// @vitest-environment node

import { renderPage } from "./entry-server";

describe("renderPage search-intent output", () => {
  it("prerenders an English JPG-to-WebP page with visible guidance and matching schema", async () => {
    const rendered = await renderPage("/en/image/jpg-to-webp");

    expect(rendered.lang).toBe("en");
    expect(rendered.path).toBe("/en/image/jpg-to-webp");
    expect(rendered.appHtml).toContain("Free Online JPG to WebP Converter");
    expect(rendered.appHtml).toContain("How to use this tool");
    expect(rendered.appHtml).toContain("Frequently asked questions");
    expect(rendered.appHtml).toContain("Does conversion replace my original JPG?");
    expect(rendered.headHtml).toContain(
      "Free Online JPG to WebP Converter — Private Browser Tool | NexaForge"
    );
    expect(rendered.headHtml).toContain(
      "https://nexaforge.kimx.info/en/image/jpg-to-webp"
    );
    expect(rendered.headHtml).toContain('"@type":"FAQPage"');
    expect(rendered.headHtml).toContain("Does conversion replace my original JPG?");
  });

  it("prerenders a Chinese Base64 decode page with localized content and schema", async () => {
    const rendered = await renderPage("/developer/base64-decode");

    expect(rendered.lang).toBe("zh-Hant");
    expect(rendered.path).toBe("/developer/base64-decode");
    expect(rendered.appHtml).toContain("免費線上 Base64 解碼");
    expect(rendered.appHtml).toContain("如何使用這項工具");
    expect(rendered.appHtml).toContain("所有 Base64 都能變成文字嗎？");
    expect(rendered.headHtml).toContain(
      "https://nexaforge.kimx.info/developer/base64-decode"
    );
    expect(rendered.headHtml).toContain('"@type":"FAQPage"');
    expect(rendered.headHtml).toContain("所有 Base64 都能變成文字嗎？");
  });
});
