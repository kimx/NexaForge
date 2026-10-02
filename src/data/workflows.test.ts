import { FILE_WORKFLOWS } from "./workflows";
import { INDEXABLE_ROUTES } from "../routing/routes";
import { buildPageSeo } from "../seo/siteMeta";
import { buildSitemap } from "../seo/artifacts";

it("publishes all three workflows in both languages with matching metadata", () => {
  const sitemap = buildSitemap(INDEXABLE_ROUTES);
  for (const item of FILE_WORKFLOWS) {
    for (const locale of ["en", "zh-TW"] as const) {
      const path = `${locale === "en" ? "/en" : ""}${item.path}`;
      expect(INDEXABLE_ROUTES).toContain(path);
      const seo = buildPageSeo(path, locale);
      expect(seo.title).toContain(item[locale].title);
      expect(seo.canonical).toBe(`https://nexaforge.kimx.info${path}`);
      expect(sitemap).toContain(`<loc>https://nexaforge.kimx.info${path}</loc>`);
    }
  }
});
