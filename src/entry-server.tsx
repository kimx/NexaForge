import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import App from "./App";
import { LanguageProvider } from "./context/LanguageContext";
import { localeFromPath, normalizePathname } from "./routing/localePaths";
import { INDEXABLE_ROUTES } from "./routing/routes";
import { buildRobots, buildSitemap } from "./seo/artifacts";
import { buildPageSeo, renderSeoHead, SITE_ORIGIN } from "./seo/siteMeta";

export { buildRobots, buildSitemap, INDEXABLE_ROUTES };

export interface RenderedPage {
  appHtml: string;
  headHtml: string;
  lang: string;
  path: string;
}

export async function renderPage(url: string): Promise<RenderedPage> {
  const parsedUrl = new URL(url, SITE_ORIGIN);
  const locale = localeFromPath(parsedUrl.pathname);
  const seo = buildPageSeo(parsedUrl.pathname, locale);

  const appHtml = await new Promise<string>((resolve, reject) => {
    let renderError: unknown;
    const stream = renderToPipeableStream(
      <StaticRouter location={`${parsedUrl.pathname}${parsedUrl.search}`}>
        <LanguageProvider initialLocale={locale}>
          <App />
        </LanguageProvider>
      </StaticRouter>,
      {
        onAllReady() {
          if (renderError) {
            reject(renderError);
            return;
          }

          const output = new PassThrough();
          const chunks: Buffer[] = [];
          output.on("data", (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          output.on("end", () =>
            resolve(
              Buffer.concat(chunks)
                .toString("utf8")
                .replace(/\u0000/g, "")
            )
          );
          output.on("error", reject);
          stream.pipe(output);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          renderError = error;
        },
      }
    );
  });

  return {
    appHtml,
    headHtml: renderSeoHead(seo),
    lang: locale === "en" ? "en" : "zh-Hant",
    path: normalizePathname(parsedUrl.pathname),
  };
}
