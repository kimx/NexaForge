import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { prerenderRoutes } from "./prerender.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("prerenderRoutes", () => {
  it("injects localized route content while preserving Vite assets", async () => {
    const distDirectory = await mkdtemp(join(tmpdir(), "nexaforge-prerender-"));
    temporaryDirectories.push(distDirectory);
    await writeFile(
      join(distDirectory, "index.html"),
      `<!doctype html><html lang="en"><head>
        <meta name="nexaforge-seo-start"><title>Fallback</title><meta name="nexaforge-seo-end">
        <script type="module" crossorigin src="/assets/app-123.js"></script>
        <link rel="stylesheet" crossorigin href="/assets/app-123.css">
      </head><body><div id="root"></div></body></html>`,
      "utf8"
    );

    await prerenderRoutes({
      distDirectory,
      routes: ["/en/data/json-formatter"],
      renderPage: async () => ({
        appHtml: '<main><h1>JSON Formatter</h1><a href="/en/json">JSON tools</a></main>',
        headHtml:
          '<title>JSON Formatter | NexaForge</title><meta name="description" content="Local JSON formatter"><link rel="canonical" href="https://nexaforge.kimx.info/en/data/json-formatter"><link rel="alternate" hreflang="zh-Hant" href="https://nexaforge.kimx.info/data/json-formatter"><script type="application/ld+json">{"@type":"WebApplication"}</script>',
        lang: "en",
        path: "/en/data/json-formatter",
      }),
    });

    const generated = await readFile(
      join(distDirectory, "en", "data", "json-formatter", "index.html"),
      "utf8"
    );
    expect(generated).toContain('<html lang="en">');
    expect(generated).toContain('data-prerender-path="/en/data/json-formatter"');
    expect(generated).toContain("<h1>JSON Formatter</h1>");
    expect(generated).toContain("JSON Formatter | NexaForge");
    expect(generated).toContain('rel="canonical"');
    expect(generated).toContain('hreflang="zh-Hant"');
    expect(generated).toContain('type="application/ld+json"');
    expect(generated).toContain('/assets/app-123.js');
    expect(generated).toContain('/assets/app-123.css');
  });
});
