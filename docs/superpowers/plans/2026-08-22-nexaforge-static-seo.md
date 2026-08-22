# NexaForge Static SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship route-specific, bilingual, indexable HTML and SEO artifacts while reducing route payload and returning a true 404 for unknown URLs.

**Architecture:** A locale-aware route and metadata registry is shared by React, runtime head updates, and a Vite SSR prerender entry. The build emits static HTML per route, then writes sitemap and robots artifacts for Azure Static Web Apps.

**Tech Stack:** React DOM client/server, React Router, Vite SSR, Node.js ESM, TypeScript, Vitest, Azure Static Web Apps

**Spec:** `docs/superpowers/specs/2026-08-22-nexaforge-json-first-ux-seo-design.md`

## Global Constraints

- Execute after the UX foundation and JSON workspace plans are green.
- Keep `https://nexaforge.kimx.info` as the only production canonical origin.
- Preserve existing Chinese paths; prefix English with `/en`.
- Keep static hosting and browser-local processing.
- Generated pages must hydrate without metadata or markup divergence.
- Use tests first and leave changes uncommitted.

---

### Task 1: Create Locale Path and Route Registries

**Files:**
- Create: `src/routing/localePaths.test.ts`
- Create: `src/routing/localePaths.ts`
- Create: `src/routing/routes.ts`
- Modify: `src/context/LanguageContext.test.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/ToolSidebar.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/components/ToolPageTemplate.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `type Locale = "zh-TW" | "en"` from `LanguageContext`
- Produces: `stripLocalePrefix(pathname: string): string`
- Produces: `localeFromPath(pathname: string): Locale`
- Produces: `localizePath(path: string, locale: Locale): string`
- Produces: `INDEXABLE_ROUTES: readonly string[]`

- [ ] **Step 1: Write failing pure path tests**

```ts
expect(localeFromPath("/en/developer/json-diff")).toBe("en");
expect(localeFromPath("/developer/json-diff")).toBe("zh-TW");
expect(stripLocalePrefix("/en/data/json-formatter")).toBe("/data/json-formatter");
expect(localizePath("/data/json-formatter", "en")).toBe("/en/data/json-formatter");
expect(localizePath("/data/json-formatter", "zh-TW")).toBe("/data/json-formatter");
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/routing/localePaths.test.ts`

Expected: module does not exist.

- [ ] **Step 3: Implement pure helpers and deterministic provider locale**

Derive initial locale from the URL, not browser language. Update language switching to navigate to the corresponding localized path and persist preference only as a convenience for future explicit navigation.

- [ ] **Step 4: Register both locale route sets**

Render every known base path at its original path and its English-prefixed path. All shared links pass through `localizePath`.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --run src/routing/localePaths.test.ts src/App.test.tsx src/context/LanguageContext.test.tsx`

Expected: both locale variants render the correct content and links.

### Task 2: Build a Shared Metadata and Structured Data Registry

**Files:**
- Create: `src/seo/siteMeta.test.ts`
- Create: `src/seo/siteMeta.ts`
- Modify: `src/types/tool.ts`
- Create: `src/hooks/useSeo.test.tsx`
- Modify: `src/hooks/useSeo.ts`

**Interfaces:**
- Produces: `SITE_ORIGIN = "https://nexaforge.kimx.info"`
- Produces: `buildPageSeo(path: string, locale: Locale): PageSeo`
- Produces: `PageSeo { title; description; canonical; alternates; openGraph; twitter; jsonLd }`
- Consumes: tool registry and localized metadata

- [ ] **Step 1: Write failing metadata tests using hand-derived URLs**

```ts
const seo = buildPageSeo("/data/json-formatter", "en");
expect(seo.canonical).toBe("https://nexaforge.kimx.info/en/data/json-formatter");
expect(seo.alternates).toEqual({
  "zh-Hant": "https://nexaforge.kimx.info/data/json-formatter",
  en: "https://nexaforge.kimx.info/en/data/json-formatter",
  "x-default": "https://nexaforge.kimx.info/data/json-formatter"
});
expect(seo.jsonLd).toEqual(expect.arrayContaining([
  expect.objectContaining({ "@type": "WebApplication", applicationCategory: "DeveloperApplication" })
]));
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/seo/siteMeta.test.ts src/hooks/useSeo.test.tsx`

Expected: registry and complete head behavior are missing.

- [ ] **Step 3: Implement metadata and JSON-LD**

Generate unique localized titles/descriptions, canonical and alternate URLs, OG/Twitter fields, `WebSite` for home, `WebApplication` for tools, `BreadcrumbList`, and a free `Offer` with price `0` and currency `USD`.

- [ ] **Step 4: Make runtime SEO idempotent**

Update or create one tag per stable data attribute. Remove stale locale alternates and structured-data nodes on navigation without deleting tags owned by the base document.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --run src/seo/siteMeta.test.ts src/hooks/useSeo.test.tsx src/App.test.tsx`

Expected: all focused tests pass.

### Task 3: Add Build-Time Prerendering and Hydration

**Files:**
- Create: `src/entry-server.tsx`
- Create: `scripts/prerender.mjs`
- Create: `scripts/prerender.test.ts`
- Modify: `src/main.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `renderPage(url: string): Promise<{ appHtml: string; headHtml: string; lang: string }>`
- Consumes: `INDEXABLE_ROUTES`, `buildPageSeo`
- Produces: `dist/<route>/index.html` for each Chinese and English route

- [ ] **Step 1: Write a failing prerender transformation test**

Run the script against a temporary HTML template and fake renderer; assert a nested route receives localized `<html lang>`, non-empty `#root`, unique title, canonical, alternates, and JSON-LD while preserving Vite asset tags.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run scripts/prerender.test.ts`

Expected: prerender module is missing.

- [ ] **Step 3: Implement server rendering**

Use `StaticRouter`, `LanguageProvider initialLocale`, and `renderToPipeableStream` with `onAllReady` so lazy route modules resolve during prerender. Return markup and registry-generated head HTML.

- [ ] **Step 4: Implement the post-build generator**

Read `dist/index.html`, replace only the root placeholder and managed head region, write one nested `index.html` per route, and retain absolute asset URLs. Reject any output path that resolves outside `dist`.

- [ ] **Step 5: Hydrate generated markup**

Use `hydrateRoot` when `#root` has child nodes and `createRoot` during ordinary Vite development.

- [ ] **Step 6: Wire the production build**

Use scripts equivalent to:

```json
{
  "build:client": "vite build",
  "build:ssr": "vite build --ssr src/entry-server.tsx --outDir .ssr-dist",
  "build": "tsc --noEmit && npm run build:client && npm run build:ssr && node scripts/prerender.mjs"
}
```

Ignore `.ssr-dist/`; do not modify dependencies or the existing lockfile.

- [ ] **Step 7: Verify GREEN**

Run: `npm test -- --run scripts/prerender.test.ts && npm run build`

Expected: tests pass and representative `dist` routes contain localized, hydrated markup.

### Task 4: Generate Sitemap, Robots, Redirects, and True 404

**Files:**
- Create: `src/seo/artifacts.test.ts`
- Create: `src/seo/artifacts.ts`
- Create or modify: `public/robots.txt`
- Modify: `public/404.html`
- Modify: `public/staticwebapp.config.json`
- Modify: `scripts/prerender.mjs`

**Interfaces:**
- Produces: `buildSitemap(routes: readonly string[]): string`
- Produces: `buildRobots(): string`
- Produces: 301 redirects for both Base64 legacy routes
- Produces: 404 response override with no global navigation fallback

- [ ] **Step 1: Write failing artifact tests**

Assert sitemap URLs are absolute canonical routes, contain reciprocal `xhtml:link` alternates, omit `/text/base64`, and XML-escape values. Assert robots references `https://nexaforge.kimx.info/sitemap.xml`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/seo/artifacts.test.ts`

Expected: artifact functions are missing.

- [ ] **Step 3: Implement generated artifacts**

Write UTF-8 sitemap and robots files during prerender. Replace the JavaScript redirecting 404 document with a visible localized-neutral `noindex` page.

- [ ] **Step 4: Configure Azure behavior**

Remove `navigationFallback`. Add permanent redirect routes for `/text/base64` and `/en/text/base64`, plus a 404 response override that rewrites to `/404.html` while retaining status 404.

- [ ] **Step 5: Verify generated behavior**

Run: `npm run build`

Expected: `dist/robots.txt`, `dist/sitemap.xml`, route HTML, and `dist/404.html` exist; sitemap and robots parse as text and contain only production URLs.

### Task 5: Lazy Load Routes and Defer Advertising

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/AdSlot.test.tsx`
- Modify: `src/components/AdSlot.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: route-level `React.lazy` imports under a shared `Suspense` fallback
- Produces: ad initialization only after idle or near-viewport eligibility

- [ ] **Step 1: Add failing observable behavior tests**

Assert a route renders its localized loading status before a delayed page module resolves. For `AdSlot`, assert the ad script/API is not invoked before eligibility and is invoked once after an intersection event. Assert hook order remains stable when slot validity changes.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/App.test.tsx src/components/AdSlot.test.tsx`

Expected: eager routes and immediate ad initialization fail.

- [ ] **Step 3: Convert page imports to route-level lazy modules**

Keep shared shell and registry eager. Use named-export adapters for page modules and one accessible status fallback. Do not lazy load the primary shell.

- [ ] **Step 4: Defer and stabilize ad initialization**

Call hooks unconditionally, observe the slot container, initialize once when near viewport or during idle fallback, and reserve a responsive but non-dominant size.

- [ ] **Step 5: Verify GREEN and bundle output**

Run: `npm test -- --run src/App.test.tsx src/components/AdSlot.test.tsx && npm run build`

Expected: tests pass and built JSON route HTML no longer module-preloads PDF, QR, and image implementation chunks.

### Task 6: Verify Static SEO End to End

- [ ] **Step 1: Run full automated verification**

Run: `npm test -- --run`

Expected: zero failed files and zero failed tests.

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 2: Inspect representative generated sources**

Check `/`, `/json`, `/data/json-formatter`, `/en`, `/en/json`, and `/en/data/json-formatter` HTML for unique titles, descriptions, canonicals, alternates, one H1, crawlable internal links, and valid JSON-LD.

- [ ] **Step 3: Serve `dist` and verify HTTP behavior**

Run the local static preview using the configured preview command, then request representative routes, `robots.txt`, `sitemap.xml`, and an unknown route. Expected: known routes and artifacts return 200; unknown route behavior matches Azure configuration in artifact inspection and the app renders a noindex not-found page in client navigation.

- [ ] **Step 4: Review against spec Sections 7-12**

Confirm locale URLs, canonical origin, structured data, visible content, no payload persistence, bundle boundaries, advertising order, and external Search Console boundary.
