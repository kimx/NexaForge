# Search-intent SEO Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bilingual, prerendered search-intent landing pages that reuse NexaForge's existing tools and emit consistent visible content, metadata, internal links, and structured data.

**Architecture:** A framework-independent landing-page catalog is the single source of truth for route discovery, localized copy, functional presets, and FAQ data. Existing React tool pages resolve the active catalog entry and reuse their current processing services while a shared template renders SEO content. The existing prerender, sitemap, metadata, and locale systems consume the same catalog.

**Tech Stack:** React 18, React Router 6, TypeScript 5.8, Vite 6 SSR/prerender, Vitest, Testing Library, schema.org JSON-LD

**Spec:** `docs/superpowers/specs/2026-08-23-seo-search-landing-pages-design.md`

## Global Constraints

- Only capabilities that already work in NexaForge receive new URLs.
- Every new base URL must also exist under `/en` with reciprocal `hreflang` and a Chinese `x-default`.
- Chinese and English pages must have equivalent claims; neither locale may claim server-side or unavailable functionality.
- Search-intent pages must reuse existing processing services and components.
- FAQ JSON-LD may only contain questions and answers rendered visibly on the same page.
- Legacy `/text/base64` remains redirected and excluded from indexing.
- Do not add dependencies.

---

### Task 1: Typed landing-page catalog and localized content

**Files:**
- Create: `src/seo/landingPages.ts`
- Create: `src/seo/landingPages.test.ts`

**Interfaces:**
- Produces: `LandingPreset`, `LandingContent`, `SeoLandingDefinition`, `SEO_SEARCH_PAGES`, `SEO_ALIAS_PAGES`, `findSeoLanding(path)`, `getSeoLandingContent(path, locale)`.
- Consumes: `Locale` from `src/context/LanguageContext.tsx` and `stripLocalePrefix` from `src/routing/localePaths.ts`.

- [ ] **Step 1: Write catalog tests that define every route and preset**

```ts
const expectedAliases = [
  ["/image/jpg-to-webp", "image-convert", { sourceFormat: "jpeg", outputFormat: "webp" }],
  ["/image/png-to-webp", "image-convert", { sourceFormat: "png", outputFormat: "webp" }],
  ["/image/webp-to-jpg", "image-convert", { sourceFormat: "webp", outputFormat: "jpeg" }],
  ["/image/heic-to-jpg", "heic-converter", { sourceFormat: "heic", outputFormat: "jpeg" }],
  ["/image/jpg-compress", "image-compress", { sourceFormat: "jpeg", outputFormat: "jpeg" }],
  ["/image/png-compress", "image-compress", { sourceFormat: "png", outputFormat: "png" }],
  ["/data/json-validator", "json-formatter", { mode: "validate" }],
  ["/developer/base64-encode", "base64", { mode: "textToBase64" }],
  ["/developer/base64-decode", "base64", { mode: "base64ToText" }],
  ["/developer/url-encode", "url-encoder", { mode: "encode" }],
  ["/developer/url-decode", "url-encoder", { mode: "decode" }],
] as const;

expect(SEO_ALIAS_PAGES.map(({ path, toolId, preset }) => [path, toolId, preset]))
  .toEqual(expectedAliases);
expect(SEO_SEARCH_PAGES.filter(({ isAlias }) => !isAlias).map(({ path }) => path)).toEqual([
  "/image/resize", "/image/crop", "/pdf/merge", "/pdf/split", "/pdf/rotate",
  "/data/json-formatter", "/text/uuid", "/developer/unix-timestamp",
  "/qr-code", "/text/diff", "/text/markdown",
]);
expect(new Set(SEO_SEARCH_PAGES.map(({ path }) => path)).size)
  .toBe(SEO_SEARCH_PAGES.length);
```

Also assert that every entry has nonempty localized `title`, `description`, `h1`, `intro`, at least two content sections, at least two FAQs, and at least two valid related paths. Assert that `findSeoLanding("/en/image/jpg-to-webp")` resolves the base entry.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/seo/landingPages.test.ts`  
Expected: FAIL because `src/seo/landingPages.ts` does not exist.

- [ ] **Step 3: Implement the typed catalog**

```ts
export interface LandingPreset {
  sourceFormat?: "jpeg" | "png" | "webp" | "heic";
  outputFormat?: "jpeg" | "png" | "webp";
  mode?: "validate" | "textToBase64" | "base64ToText" | "encode" | "decode";
}

export interface LandingContent {
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  steps: string[];
  privacy: string;
  faq: Array<{ q: string; a: string }>;
  related: Array<{ path: string; label: string }>;
}

export interface SeoLandingDefinition {
  path: string;
  toolId: string;
  isAlias: boolean;
  preset: LandingPreset;
  content: Record<Locale, LandingContent>;
}

export function findSeoLanding(path: string): SeoLandingDefinition | undefined {
  const basePath = stripLocalePrefix(path.split(/[?#]/, 1)[0] || "/");
  return SEO_SEARCH_PAGES.find((entry) => entry.path === basePath);
}

export function getSeoLandingContent(path: string, locale: Locale): LandingContent | undefined {
  return findSeoLanding(path)?.content[locale];
}
```

Populate `SEO_SEARCH_PAGES` with all twenty-two paths in Step 1: eleven `isAlias: true` tuples plus eleven strengthened existing paths. Export `SEO_ALIAS_PAGES` by filtering on `isAlias`. Use small typed copy builders for image conversion, image compression, developer transformations, and ordinary tools so repeated privacy/usage structure stays consistent while each page has unique search-intent headings and claims. Give each locale unique, search-oriented copy that accurately describes browser-local operation. Each content object must contain two explanatory sections, three steps, a privacy paragraph, two FAQs, and four localized related links chosen only from real base routes or other catalog paths.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run src/seo/landingPages.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit the catalog**

```bash
git add src/seo/landingPages.ts src/seo/landingPages.test.ts
git commit -m "feat: add bilingual SEO landing catalog"
```

### Task 2: Route, metadata, structured-data, and sitemap integration

**Files:**
- Modify: `src/routing/routes.ts`
- Modify: `src/seo/siteMeta.ts`
- Modify: `src/seo/siteMeta.test.ts`
- Modify: `src/seo/artifacts.test.ts`

**Interfaces:**
- Consumes: `SEO_SEARCH_PAGES`, `getSeoLandingContent`, and `findSeoLanding` from Task 1.
- Produces: indexable bilingual landing URLs and metadata/JSON-LD for every catalog entry.

- [ ] **Step 1: Add failing route and metadata tests**

```ts
expect(BASE_INDEXABLE_ROUTES).toEqual(expect.arrayContaining([
  "/image/jpg-to-webp",
  "/data/json-validator",
  "/developer/base64-decode",
]));
expect(INDEXABLE_ROUTES).toContain("/en/developer/url-decode");

const seo = buildPageSeo("/en/image/jpg-to-webp", "en");
expect(seo.title).toContain("JPG to WebP");
expect(seo.canonical).toBe(`${SITE_ORIGIN}/en/image/jpg-to-webp`);
expect(seo.alternates["zh-Hant"]).toBe(`${SITE_ORIGIN}/image/jpg-to-webp`);
expect(seo.jsonLd).toEqual(expect.arrayContaining([
  expect.objectContaining({ "@type": "SoftwareApplication" }),
  expect.objectContaining({ "@type": "BreadcrumbList" }),
  expect.objectContaining({ "@type": "FAQPage" }),
]));
```

Extend the sitemap test to iterate over `SEO_SEARCH_PAGES` and assert Chinese and English `<loc>` entries. Add a uniqueness test for all titles, descriptions, and canonicals in each locale.

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm test -- --run src/seo/siteMeta.test.ts src/seo/artifacts.test.ts`  
Expected: FAIL because landing URLs are not indexable and metadata falls back to 404 data.

- [ ] **Step 3: Add catalog paths to the indexable route source**

```ts
export const BASE_INDEXABLE_ROUTES = Array.from(
  new Set([
    "/",
    "/json",
    ...FILE_TOOLS.map((tool) => tool.path),
    ...SEO_SEARCH_PAGES.map((landing) => landing.path),
  ])
).sort(routeSort);
```

- [ ] **Step 4: Resolve landing metadata before ordinary tool metadata**

In `buildPageSeo`, use `getSeoLandingContent(basePath, locale)` for `pageName`, `title`, and `baseDescription`. Emit `SoftwareApplication`, `BreadcrumbList`, and this FAQ object:

```ts
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: landingContent.faq.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
}
```

For ordinary tools change the fallback title to localized search copy:

```ts
const title = locale === "en"
  ? `Free Online ${pageName} — Private Browser Tool | ${siteName}`
  : `免費線上${pageName}｜不用上傳、瀏覽器本機處理 | ${siteName}`;
```

Retain the existing localized description plus local-processing suffix, canonical, alternates, Open Graph, Twitter, home `WebSite`, and JSON hub `CollectionPage` behavior.

- [ ] **Step 5: Run metadata and sitemap tests**

Run: `npm test -- --run src/seo/siteMeta.test.ts src/seo/artifacts.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit route and metadata integration**

```bash
git add src/routing/routes.ts src/seo/siteMeta.ts src/seo/siteMeta.test.ts src/seo/artifacts.test.ts
git commit -m "feat: index search-intent landing routes"
```

### Task 3: Visible SEO content and localized internal links

**Files:**
- Create: `src/components/SeoLandingContent.tsx`
- Create: `src/components/SeoLandingContent.test.tsx`
- Modify: `src/components/ToolPageTemplate.tsx`
- Modify: `src/components/ToolPageTemplate.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `LandingContent` from Task 1 and existing `localizePath`.
- Produces: `SeoLandingContent({ content, locale })` and automatic route-aware SEO content in `ToolPageTemplate`.

- [ ] **Step 1: Write failing semantic-content tests**

Render representative Chinese and English content and assert:

```tsx
expect(screen.getByRole("heading", { level: 2, name: content.sections[0].heading })).toBeVisible();
expect(screen.getByText(content.privacy)).toBeVisible();
expect(screen.getByRole("link", { name: content.related[0].label }))
  .toHaveAttribute("href", `/en${content.related[0].path}`);
expect(screen.getByText(content.faq[0].a)).toBeVisible();
```

Extend `ToolPageTemplate.test.tsx` by rendering it at `/en/image/jpg-to-webp`; assert that catalog H1, description, content, and FAQ are rendered once even though the underlying tool definition is the generic image converter.

- [ ] **Step 2: Run component tests and verify they fail**

Run: `npm test -- --run src/components/SeoLandingContent.test.tsx src/components/ToolPageTemplate.test.tsx`  
Expected: FAIL because the component and prop do not exist.

- [ ] **Step 3: Implement semantic landing content**

```tsx
export function SeoLandingContent({ content, locale }: Props): JSX.Element {
  return (
    <section className="seo-landing" aria-label={content.h1}>
      <p className="seo-landing__intro">{content.intro}</p>
      {content.sections.map((section) => (
        <section key={section.heading} className="seo-landing__section">
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <section className="seo-landing__section">
        <h2>{locale === "en" ? "How to use this tool" : "如何使用這項工具"}</h2>
        <ol>{content.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      </section>
      <section className="seo-landing__section">
        <h2>{locale === "en" ? "Private, local processing" : "隱私與本機處理"}</h2>
        <p>{content.privacy}</p>
      </section>
      <section className="seo-landing__section">
        <h2>{locale === "en" ? "Frequently asked questions" : "常見問題"}</h2>
        {content.faq.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>
      <nav aria-label={locale === "en" ? "Related tools" : "相關工具"}>
        <ul>{content.related.map(({ path, label }) => (
          <li key={path}><Link to={localizePath(path, locale)}>{label}</Link></li>
        ))}</ul>
      </nav>
    </section>
  );
}
```

Inside `ToolPageTemplate`, resolve `getSeoLandingContent(pathname, locale)`. Use catalog H1 and description when present, render `SeoLandingContent` before the existing generic related-tools section, and avoid a second FAQ section by rendering the generic FAQ only when no catalog content exists. This automatically strengthens the eleven existing routes without editing every page component.

- [ ] **Step 4: Add focused responsive styles**

Add `.seo-landing`, `.seo-landing__intro`, `.seo-landing__section`, and related-link grid styles using existing color, spacing, radius, and typography variables. Do not add fixed widths or animation.

- [ ] **Step 5: Run component tests**

Run: `npm test -- --run src/components/SeoLandingContent.test.tsx src/components/ToolPageTemplate.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit visible content**

```bash
git add src/components/SeoLandingContent.tsx src/components/SeoLandingContent.test.tsx src/components/ToolPageTemplate.tsx src/components/ToolPageTemplate.test.tsx src/styles.css
git commit -m "feat: render useful SEO landing content"
```

### Task 4: Shared functional presets and React routes

**Files:**
- Create: `src/hooks/useSeoLanding.ts`
- Create: `src/hooks/useSeoLanding.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/pages/image/ConvertPage.tsx`
- Modify: `src/pages/image/ConvertPage.test.tsx`
- Modify: `src/pages/image/CompressPage.tsx`
- Modify: `src/pages/image/CompressPage.test.tsx`
- Modify: `src/pages/image/HeicConverterPage.tsx`
- Modify: `src/pages/image/HeicConverterPage.test.tsx`
- Modify: `src/pages/data/JsonFormatterPage.tsx`
- Modify: `src/pages/data/JsonFormatterPage.test.tsx`
- Modify: `src/pages/text/Base64Page.tsx`
- Modify: `src/pages/text/Base64Page.test.tsx`
- Modify: `src/pages/developer/DeveloperToolsPage.tsx`
- Modify: `src/pages/developer/DeveloperToolsPage.test.tsx`

**Interfaces:**
- Consumes: Task 1 catalog and Task 3 route-aware `ToolPageTemplate`.
- Produces: `useSeoLanding()` returning `{ definition, content } | undefined`, routable bilingual pages, and correctly initialized tool modes.

- [ ] **Step 1: Write failing hook, route, and preset tests**

Test `useSeoLanding` inside `MemoryRouter` plus `LanguageProvider`:

```ts
expect(result.current?.definition.path).toBe("/image/jpg-to-webp");
expect(result.current?.content.h1).toBe("Free Online JPG to WebP Converter");
```

Add app route tests for `/image/jpg-to-webp` and `/en/developer/base64-decode`. In each affected page test, render the new route and assert the relevant select starts at `webp`, `jpeg`, `png`, `base64ToText`, `encode`, or `decode` as defined by the catalog. Assert the landing H1 and introduction render.

- [ ] **Step 2: Run affected tests and verify they fail**

Run: `npm test -- --run src/hooks/useSeoLanding.test.tsx src/App.test.tsx src/pages/image/ConvertPage.test.tsx src/pages/image/CompressPage.test.tsx src/pages/image/HeicConverterPage.test.tsx src/pages/data/JsonFormatterPage.test.tsx src/pages/text/Base64Page.test.tsx src/pages/developer/DeveloperToolsPage.test.tsx`  
Expected: FAIL because the hook, routes, and presets do not exist.

- [ ] **Step 3: Implement the route-aware hook**

```ts
export function useSeoLanding(): ActiveSeoLanding | undefined {
  const { pathname } = useLocation();
  const { locale } = useLanguage();
  const definition = findSeoLanding(pathname);
  return definition ? { definition, content: definition.content[locale] } : undefined;
}
```

- [ ] **Step 4: Register all catalog routes with shared components**

Create a mapping from alias catalog `toolId` to the existing lazy element and append only `SEO_ALIAS_PAGES` to `APP_ROUTES`. Throw during module initialization if an alias entry has no component mapping so a catalog route cannot silently prerender a 404 page; existing strengthened paths remain registered by their current route entries.

- [ ] **Step 5: Apply presets and landing presentation**

In each shared page, resolve `const landing = useSeoLanding()`. Build metadata from `landing.content` and `landing.definition.path` when active, and initialize/synchronize state from `landing.definition.preset`. `ToolPageTemplate` resolves visible catalog content itself. For example:

```ts
const initialFormat = landing?.definition.preset.outputFormat ?? "png";
const [format, setFormat] = useState(initialFormat);
useEffect(() => {
  setFormat(initialFormat as "jpeg" | "png" | "webp" | "avif");
  clearSelection();
}, [initialFormat, landing?.definition.path]);
```

For JPG/PNG-specific upload pages, narrow the `accept` value to the intended source MIME while retaining existing validation. For JSON validator, keep the formatter workspace but use validator-specific heading/copy; valid and invalid JSON continue to use current parser behavior. For Base64 and URL tools, synchronize the mode select to the active route preset.

- [ ] **Step 6: Run affected tests**

Run the command from Step 2.  
Expected: PASS.

- [ ] **Step 7: Commit functional landing routes**

```bash
git add src/hooks/useSeoLanding.ts src/hooks/useSeoLanding.test.tsx src/App.tsx src/App.test.tsx src/pages/image src/pages/data/JsonFormatterPage.tsx src/pages/data/JsonFormatterPage.test.tsx src/pages/text/Base64Page.tsx src/pages/text/Base64Page.test.tsx src/pages/developer/DeveloperToolsPage.tsx src/pages/developer/DeveloperToolsPage.test.tsx
git commit -m "feat: connect SEO routes to existing tools"
```

### Task 5: Prerender and full regression verification

**Files:**
- Modify: `src/routing/hydration.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified prerender output and deployment/operator documentation.

- [ ] **Step 1: Add failing representative prerender assertions**

```ts
const page = await renderPage("/en/image/jpg-to-webp");
expect(page.headHtml).toContain("Free Online JPG to WebP Converter");
expect(page.appHtml).toContain("How to use this tool");
expect(page.appHtml).toContain("Frequently asked questions");
```

Add Chinese assertions for `/developer/base64-decode` and verify both pages contain matching FAQ copy in HTML and JSON-LD.

- [ ] **Step 2: Run hydration/prerender tests and verify the new assertion fails if integration is incomplete**

Run: `npm test -- --run src/routing/hydration.test.ts`  
Expected before final integration: FAIL; after Tasks 1–4 it may already pass, which confirms the vertical slice is complete.

- [ ] **Step 3: Document generated SEO artifacts and Search Console follow-up**

Add a README section that states `npm run build` prerenders bilingual routes and generates `dist/sitemap.xml` plus `dist/robots.txt`. Document the deployment follow-up: submit `https://nexaforge.kimx.info/sitemap.xml` in Google Search Console and monitor indexing/Core Web Vitals.

- [ ] **Step 4: Run the complete automated suite**

Run: `npm test -- --run`  
Expected: all tests PASS.

- [ ] **Step 5: Run the production build**

Run: `npm run build`  
Expected: TypeScript, client build, SSR build, and prerender all complete successfully.

- [ ] **Step 6: Inspect generated artifacts**

Verify these files contain the expected canonical/H1/content and sitemap entries:

```text
dist/image/jpg-to-webp/index.html
dist/en/image/jpg-to-webp/index.html
dist/developer/base64-decode/index.html
dist/en/developer/base64-decode/index.html
dist/sitemap.xml
dist/robots.txt
```

- [ ] **Step 7: Run a final clean-worktree and diff check**

Run: `git diff --check` and `git status --short`.  
Expected: no whitespace errors; only the intended implementation/plan changes are present.

- [ ] **Step 8: Commit verification and documentation**

```bash
git add src/routing/hydration.test.ts README.md docs/superpowers/plans/2026-08-23-seo-search-landing-pages.md
git commit -m "docs: verify search landing SEO build"
```
