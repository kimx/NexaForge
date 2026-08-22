# NexaForge JSON-First UX and SEO Design

**Date:** 2026-08-22  
**Status:** Approved for implementation  
**Primary actor:** Developers working with JSON payloads, configuration, and data exchange  
**Primary job:** Validate, format, repair, transform, compare, copy, and download JSON without uploading it

## 1. Product Direction

NexaForge remains a privacy-first collection of 30 browser-local utilities, but its first-level hierarchy becomes a developer workspace centered on JSON. Image, PDF, text, and other utilities remain available and indexable without competing with the primary JSON workflow.

The dominant journey is:

`Paste or load JSON -> validate -> format or repair -> transform or compare -> copy or download`

The application must continue to work without registration, a backend, or server-side payload processing. JSON and file contents remain in memory and must never be written to local storage. Recent-tool history may store tool identifiers only.

## 2. Information Architecture

### 2.1 Global hierarchy

1. JSON workspace
   - JSON Formatter and Validator
   - JSON Diff
   - JSON to YAML and YAML to JSON
   - JSON to CSV
   - CSV to JSON
2. Other developer utilities
3. Image, PDF, and text utilities

The existing canonical Chinese tool paths remain stable. A new `/json` hub provides a crawlable overview and strong internal links without replacing established paths.

### 2.2 Responsive navigation

- Desktop keeps a compact top header and a left tool navigation.
- The JSON workspace is pinned above the legacy categories.
- Legacy categories are collapsed by default unless the current tool belongs to one.
- Mobile removes the sidebar from document flow. A header control opens it as a modal drawer.
- Opening the drawer moves focus to its close control; closing returns focus to the opener. Escape and backdrop click close it.
- The primary workspace appears in the first viewport on every mobile tool route.

### 2.3 Page hierarchy

Every tool page uses this order:

1. Breadcrumb and one structural H1
2. Concise purpose and local-processing statement
3. Workspace and primary action
4. Processing feedback and result
5. How-to content, FAQ content, and related tools
6. Advertising only after meaningful task content

The existing decorative route landing that duplicates the H1 is removed.

## 3. JSON Workspace

### 3.1 Layout

- Wide screens use an input/options column and a result column.
- Narrow screens stack input, primary action, feedback, and result.
- JSON tools share an in-context navigation bar with ordinary crawlable links.
- The JSON formatter starts with an empty, labeled text editor and offers a secondary “Load sample” action.
- Tree editing remains available as a secondary editor mode.

### 3.2 State model

| State | Required behavior |
|---|---|
| Empty | Primary action disabled; paste, file, and sample affordances are visible |
| Ready | Primary action enabled; `Ctrl/Command + Enter` runs it |
| Processing | Input remains visible; conflicting controls are disabled; status is announced |
| Success | Copy, download, and related transforms are available; result is announced |
| Error | Input is preserved; field is marked invalid; exact line/column detail is associated |
| Retry | Corrected input can run immediately without resetting mode or source |

Small JSON input receives debounced validation feedback. Large input avoids continuous parsing and validates on explicit execution. Transformations never rewrite the source while the developer is typing.

### 3.3 Focus and motion

- New results do not trigger unconditional smooth scrolling.
- If a result appears outside the viewport, it is scrolled into view and its programmatic heading receives focus.
- If it is already visible, an `aria-live` announcement is sufficient.
- Reduced-motion preference disables animated scrolling and non-essential transitions.

## 4. Shared Operation Model

The same empty, ready, processing, success, error, and retry semantics apply to all tools.

- File-processing actions are disabled until the required accepted files exist.
- Empty actions never fail silently.
- File dropzones expose one keyboard stop, not a focusable wrapper plus an input.
- Errors identify the affected field using `aria-invalid` and `aria-describedby`.
- Error messages state what failed and how to correct it; raw service exceptions are not user-facing copy.
- Retry preserves accepted files and user-selected options where safe.
- Copy actions provide non-color feedback.
- Download actions are hidden or disabled consistently until a real output exists.

## 5. Visual and Accessibility System

- The visual language becomes denser and more tool-like while retaining the NexaForge brand.
- Decorative card nesting and gradients are reduced; surfaces indicate real grouping.
- JSON, YAML, CSV, Base64, JWT, and text outputs use an accessible monospace stack.
- Main content width supports two-pane editing without forcing horizontal page scroll.
- Focus indicators remain visible and meet non-text contrast requirements.
- Interactive targets are at least 44 by 44 CSS pixels where layout permits.
- Normal text and semantic status colors meet WCAG AA contrast.
- Landmarks, a skip link, accessible navigation names, labels, descriptions, and live regions are present.
- JSON tree add, remove, key, and value controls have specific accessible names and are not nested inside another interactive element.
- The interface contains one structural H1 per route.
- Traditional Chinese and English dictionaries contain every used key; no raw key or unintended English fallback is visible in the Chinese interface.

## 6. Homepage Behavior

- The first viewport explains the JSON-first value proposition and links to the formatter.
- JSON workflows appear before recent tools and legacy categories.
- Searching hides unrelated recent and category sections, so a no-results state never coexists with visible unrelated cards.
- `/` focuses search when focus is not already in an editable control; Escape clears a non-empty search.
- Recent tools remain secondary and store identifiers only.

## 7. Localization and URLs

- Existing paths without a prefix are deterministic Traditional Chinese pages.
- English equivalents use `/en` and `/en/...`.
- Language switching navigates to the matching localized path instead of changing content at one URL.
- Each localized page has a self-referencing canonical plus reciprocal `zh-Hant`, `en`, and `x-default` alternates.
- Existing `/text/base64` permanently redirects to `/developer/base64`; the English equivalent redirects to `/en/developer/base64`.

## 8. Indexable Static Architecture

The deployed application remains static on Azure Static Web Apps.

- Vite creates the client bundle and a server-renderable entry.
- A build-time prerender step renders every known route and locale into its own `index.html`.
- The client hydrates prerendered markup and falls back to `createRoot` in development.
- Initial HTML contains localized title, meta description, canonical, alternate links, Open Graph, Twitter metadata, structured data, headings, content, and internal links.
- One shared metadata registry powers prerendered head output and runtime navigation updates, preventing divergence.
- Canonicals use `https://nexaforge.kimx.info`, never a preview origin.
- Unknown paths return a true HTTP 404 with a crawlable, `noindex` error page. The global SPA navigation fallback is removed after all known routes are generated.

## 9. SEO Content and Structured Data

- Home pages use `WebSite` and `WebApplication` JSON-LD.
- Tool pages use `WebApplication` and `BreadcrumbList`.
- JSON tools use `DeveloperApplication`; other tools use the closest supported application category.
- Free tools include an `Offer` with numeric price `0` and currency `USD`.
- Structured data describes visible content only.
- Titles, descriptions, H1s, and visible introductions are specific and human-readable rather than keyword lists.
- Related-tool links establish JSON topic clusters.
- `robots.txt` allows public crawling and references the absolute sitemap URL.
- `sitemap.xml` is generated from the route registry, contains canonical absolute URLs, and declares language alternates.

## 10. Performance and Advertising

- Route modules are lazy loaded so JSON pages do not preload PDF, image, QR, or CSV implementation bundles.
- The main task content and editor render before advertising code is requested.
- Ad slots use responsive reserved dimensions and never create a large blank block before the primary task.
- Heavy processing does not run during initial render.
- Production acceptance targets at the 75th percentile are LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1.

## 11. Verification Strategy

### 11.1 Automated

- Repair the existing test harness so every page test renders with the language provider.
- Add behavior-first component tests for navigation drawer focus, mobile ordering, search filtering, dropzone focus, result focus, JSON validation, locale paths, metadata, and route registry output.
- Run the complete Vitest suite with zero failures.
- Run TypeScript and the full production build with zero errors.
- Verify generated route HTML, robots, sitemap, structured data, alternates, redirects, and 404 behavior from build artifacts.

### 11.2 Browser

- Verify all known tool routes at 1440x900 and 390x844.
- Confirm no page-level horizontal overflow and that the primary workspace is visible before navigation content on mobile.
- Exercise keyboard-only navigation, drawer focus containment and return, JSON format success, invalid JSON correction, copy/download, file success, and file rejection.
- Inspect console warnings/errors after normal and negative flows.
- Check reduced motion and visible focus styles.

### 11.3 SEO tools after deployment

- Validate representative pages with Rich Results Test and Schema Markup Validator.
- Inspect rendered HTML and canonical selection in Search Console.
- Submit the sitemap and monitor indexing and Core Web Vitals.

Search Console ownership, sitemap submission, recrawl requests, ranking changes, and traffic outcomes require external credentials or elapsed crawl time and are not code-completion conditions.

## 12. Scope Boundaries

- No backend, authentication, cloud storage, or payload persistence.
- No removal of existing tools.
- No breaking change to existing canonical Chinese tool URLs.
- No invented SEO performance claims or guaranteed rankings.
- Preserve unrelated user work, including the pre-existing `package-lock.json` modification.
