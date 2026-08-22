import { INDEXABLE_ROUTES } from "../routing/routes";
import { buildRobots, buildSitemap } from "./artifacts";

describe("SEO artifacts", () => {
  it("builds absolute reciprocal bilingual sitemap entries without legacy URLs", () => {
    const sitemap = buildSitemap(INDEXABLE_ROUTES);

    expect(sitemap).toContain(
      "<loc>https://nexaforge.kimx.info/data/json-formatter</loc>"
    );
    expect(sitemap).toContain(
      'hreflang="en" href="https://nexaforge.kimx.info/en/data/json-formatter"'
    );
    expect(sitemap).toContain(
      'hreflang="zh-Hant" href="https://nexaforge.kimx.info/data/json-formatter"'
    );
    expect(sitemap).toContain(
      'hreflang="x-default" href="https://nexaforge.kimx.info/data/json-formatter"'
    );
    expect(sitemap).not.toContain("/text/base64");
    expect(sitemap).not.toContain("localhost");
    expect(sitemap).toContain(
      "<loc>https://nexaforge.kimx.info/developer/regex-tester</loc>"
    );
    expect(sitemap).toContain(
      'hreflang="en" href="https://nexaforge.kimx.info/en/developer/regex-tester"'
    );
  });

  it("XML-escapes route values", () => {
    expect(buildSitemap(["/data/a&b"])).toContain("/data/a&amp;b");
  });

  it("points robots at the production sitemap", () => {
    expect(buildRobots()).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://nexaforge.kimx.info/sitemap.xml\n"
    );
  });
});
