# NexaForge Search-intent SEO Landing Pages Design

Date: 2026-08-23  
Issue: https://github.com/kimx/NexaForge/issues/24

## Goal

Complete the code-owned portion of issue #24 for capabilities that NexaForge already provides. Each supported search intent receives an indexable, prerendered, bilingual URL with unique metadata, useful visible content, matching structured data, and links to related tools. Account-owned work such as creating Google Search Console and submitting the sitemap remains an operational follow-up.

## Scope

### Existing URLs strengthened in place

- `/image/resize`
- `/image/crop`
- `/pdf/merge`
- `/pdf/split`
- `/pdf/rotate`
- `/data/json-formatter`
- `/text/uuid`
- `/developer/unix-timestamp`
- `/qr-code`
- `/text/diff`
- `/text/markdown`

All other existing tool URLs keep their current functionality and receive the improved common title and description fallback. They remain present in the sitemap.

### New search-intent URLs

- `/image/jpg-to-webp`
- `/image/png-to-webp`
- `/image/webp-to-jpg`
- `/image/heic-to-jpg`
- `/image/jpg-compress`
- `/image/png-compress`
- `/data/json-validator`
- `/developer/base64-encode`
- `/developer/base64-decode`
- `/developer/url-encode`
- `/developer/url-decode`

Every URL also has an English equivalent under `/en`. New routes reuse existing converter, compressor, HEIC, JSON formatter, Base64, and URL encoder functionality. No placeholder route is created for a capability that does not exist, including PDF compression, PDF/image conversion, password generation, or image-to-PDF conversion.

## Architecture

### One SEO catalog

Add a typed, framework-independent catalog keyed by base path. Each entry contains:

- canonical base path and the existing tool ID it reuses;
- route kind and optional functional preset;
- localized title, meta description, H1, introduction, feature/use-case sections, steps, FAQ, and related links;
- optional accepted input description for intent-specific image pages.

The catalog is the source of truth for React route generation, prerender/indexable route generation, metadata, visible SEO copy, FAQ JSON-LD, and related links. Keeping these consumers on one catalog prevents a page from being available in the client but absent from the sitemap or structured data.

### Shared tools with route presets

The existing tool components accept a small optional preset rather than being copied:

- image conversion: source intent and initial output format;
- image compression: source intent and initial output format;
- HEIC conversion: initial output format;
- JSON formatter: validator presentation;
- Base64: initial encode/decode mode;
- URL tools: initial encode/decode mode.

Presets establish the initial state for a search-intent page. The underlying processing service, validation, error states, analytics, and download behavior remain shared. Navigating between two routes that use the same component must reset the relevant preset so client-side navigation shows the correct mode.

### Visible content

`ToolPageTemplate` receives optional SEO content. It renders after the workbench and before related tools with semantic H2/H3 headings, concise paragraphs, steps, use cases, privacy text, and FAQs. The H1 and lead description come from the active landing entry when present; ordinary tool pages keep their localized tool labels.

Content is written for humans first. Chinese pages target roughly 200–400 useful Chinese characters, while English pages provide equivalent information without keyword stuffing. FAQ JSON-LD is emitted only when the same questions and answers are visible on the page.

## Metadata and structured data

`buildPageSeo` resolves the landing catalog before falling back to the existing tool definition. Each page emits:

- a unique search-oriented `<title>`;
- a unique meta description;
- `index,follow,max-image-preview:large`;
- a locale-specific canonical URL;
- reciprocal `zh-Hant`, `en`, and `x-default` alternates;
- Open Graph and Twitter metadata;
- `SoftwareApplication` for tools, `BreadcrumbList`, and visible-content-matched `FAQPage` where applicable.

The homepage keeps `WebSite` structured data. Existing pages without a dedicated catalog entry use a stronger bilingual title pattern emphasizing free, browser-local processing without falsely claiming support for formats or capabilities.

## Routing, prerendering, and sitemap

New base paths are added to the React router for both locales and to the indexable route set. The production build prerenders every indexable URL. `sitemap.xml` includes both locale URLs with reciprocal alternates, and `robots.txt` continues to allow crawling and point to the production sitemap.

Legacy `/text/base64` continues to redirect and remains excluded from indexing. Unknown routes remain 404 pages and must not be introduced into the sitemap.

## Internal links

Search-intent pages show links to sibling intents and adjacent workflows. Examples:

- JPG to WebP links to PNG to WebP, WebP to JPG, JPG compression, and image resize.
- PDF merge links to split and rotate; unavailable PDF compression is not advertised.
- Base64 encode links to decode, URL encode, JSON formatter, and UUID generator.

Links are localized through the existing locale path helper. Link text describes the destination intent rather than using generic “click here” labels.

## Error handling and accessibility

SEO routing introduces no new processing backend. Existing validation and processing errors remain authoritative. Intent-specific pages may narrow accepted input formats in the upload control, but invalid files still use the existing accessible error path.

Semantic heading order is H1 followed by H2 sections. FAQ remains keyboard-operable native `details`/`summary`. Related links are real anchors, and presets do not remove user control over supported output options.

## Testing

Tests are added before implementation and cover:

- catalog uniqueness, supported target routes, localized copy, and valid related destinations;
- route generation and bilingual indexability;
- unique canonical, title, description, hreflang, Open Graph, `SoftwareApplication`, breadcrumb, and FAQ structured data;
- sitemap inclusion of every new localized route and exclusion of legacy/unknown routes;
- prerendered HTML containing the intended H1 and useful visible content;
- shared tool pages selecting the correct conversion/compression/encode/decode preset;
- internal links preserving locale;
- regression coverage for ordinary tool pages and the existing redirects.

Finally, run the complete Vitest suite and production build. Inspect representative generated Chinese and English HTML plus `dist/sitemap.xml` and `dist/robots.txt`.

## Success criteria

- Every in-scope search intent has a stable Chinese and English URL.
- Every new URL is routable, prerendered, indexable, canonicalized, and included in the sitemap.
- Search-intent pages reuse real working tools with the correct initial mode.
- Titles, descriptions, H1s, visible copy, FAQs, and structured data agree.
- No page claims a capability NexaForge does not provide.
- All tests and the production build pass.

## Operational follow-up

After deployment, the owner creates or opens the Google Search Console property for `https://nexaforge.kimx.info`, submits `/sitemap.xml`, requests indexing for representative landing pages, and monitors coverage and Core Web Vitals. These account-level actions cannot be completed from this repository change.
