import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(moduleDirectory, "..");

function replaceManagedHead(template, headHtml) {
  const startPattern = /<meta\b[^>]*\bname=["']nexaforge-seo-start["'][^>]*>/i;
  const endPattern = /<meta\b[^>]*\bname=["']nexaforge-seo-end["'][^>]*>/i;
  const startMatch = startPattern.exec(template);
  const endMatch = endPattern.exec(template);
  if (!startMatch || !endMatch || endMatch.index <= startMatch.index) {
    throw new Error("Prerender template is missing the managed SEO head markers.");
  }

  const startEnd = startMatch.index + startMatch[0].length;
  return `${template.slice(0, startEnd)}\n${headHtml}\n${template.slice(endMatch.index)}`;
}

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function transformPrerenderTemplate(template, rendered) {
  const withLanguage = template.replace(
    /<html\b([^>]*?)\blang=["'][^"']*["']([^>]*)>/i,
    `<html$1lang="${rendered.lang}"$2>`
  );
  const withHead = replaceManagedHead(withLanguage, rendered.headHtml);
  const rootPattern = /<div\b([^>]*?)\bid=["']root["']([^>]*)>[\s\S]*?<\/div>/i;
  if (!rootPattern.test(withHead)) {
    throw new Error('Prerender template is missing <div id="root">.');
  }
  return withHead.replace(
    rootPattern,
    `<div$1id="root"$2 data-prerender-path="${escapeHtmlAttribute(rendered.path)}">${rendered.appHtml}</div>`
  );
}

function outputPathForRoute(distDirectory, route) {
  const pathname = route.split(/[?#]/, 1)[0];
  if (!pathname.startsWith("/") || pathname.includes("\\")) {
    throw new Error(`Unsafe prerender route: ${route}`);
  }

  const relativeOutput = pathname === "/"
    ? "index.html"
    : `${pathname.slice(1).replace(/\/$/, "")}/index.html`;
  const outputPath = resolve(distDirectory, relativeOutput);
  const relativeToDist = relative(resolve(distDirectory), outputPath);
  if (
    relativeToDist.startsWith("..") ||
    isAbsolute(relativeToDist) ||
    relativeToDist.split(/[\\/]/).includes("..")
  ) {
    throw new Error(`Prerender output escaped dist: ${route}`);
  }
  return outputPath;
}

export async function prerenderRoutes({ distDirectory, routes, renderPage }) {
  const templatePath = resolve(distDirectory, "index.html");
  const template = await readFile(templatePath, "utf8");

  for (const route of routes) {
    const rendered = await renderPage(route);
    const output = transformPrerenderTemplate(template, rendered);
    const outputPath = outputPathForRoute(distDirectory, route);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output, "utf8");
  }
}

async function main() {
  const serverEntry = resolve(projectDirectory, ".ssr-dist", "entry-server.js");
  const renderer = await import(pathToFileURL(serverEntry).href);
  const distDirectory = resolve(projectDirectory, "dist");
  await prerenderRoutes({
    distDirectory,
    routes: renderer.INDEXABLE_ROUTES,
    renderPage: renderer.renderPage,
  });
  await Promise.all([
    writeFile(
      resolve(distDirectory, "sitemap.xml"),
      renderer.buildSitemap(renderer.INDEXABLE_ROUTES),
      "utf8"
    ),
    writeFile(resolve(distDirectory, "robots.txt"), renderer.buildRobots(), "utf8"),
  ]);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
