# Emoji Picker & Unicode Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the complete bilingual browser-only Emoji Picker and Unicode inspector from issue #107.

**Architecture:** Generate a pinned, committed dataset from official Unicode and CLDR sources, lazy-load it only on the tool route, and keep all query, encoding, clipboard, favorites, and recent behavior in the browser. Separate pure Unicode/search logic, resilient storage, page orchestration, and focused UI components so failures are testable and recoverable.

**Tech Stack:** React 18, TypeScript 5.8, Vite 6, React Router 6, Vitest, Testing Library, Node.js data-generation scripts.

**Spec:** `docs/superpowers/specs/2026-09-22-emoji-picker-design.md`

## Global Constraints

- Pin Emoji 17.0 / Unicode 17.0.0 and CLDR release-48; normal build and runtime must never fetch data.
- Preserve complete code-point sequences and use them as stable ids.
- Store private state only in emoji-specific localStorage keys, with in-memory fallback.
- Never send search, copied values, favorites, or recents to analytics.
- Target WCAG 2.1 AA and preserve the repository's existing shell and tokens.

## Review Focus

- Variation selectors, ZWJ, modifiers, flags, keycaps, and tag sequences must survive every transform unchanged.
- A rejected Clipboard promise must not update recents or announce success.
- A corrupt or throwing localStorage implementation must leave search and copy usable.
- Long localized names and encoding strings must reflow without horizontal page overflow.
- Information and favorite controls must remain distinct from the copy action for pointer and keyboard users.

---

### Task 1: Unicode data generation

**Files:**
- Create: `scripts/emoji-data-lib.mjs`
- Create: `scripts/emoji-data-lib.test.ts`
- Create: `scripts/generate-emoji-data.mjs`
- Create: `src/data/emoji.generated.ts`
- Create: `docs/emoji-data.md`
- Modify: `package.json`
- Modify: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Produces: `EmojiRecord`, `EMOJI_DATA_VERSION`, and `EMOJI_DATA` with `id`, `emoji`, `group`, `order`, `nameEn`, `nameZhHant`, `keywordsEn`, `keywordsZhHant`.

- [ ] Write parser tests with literal fully-qualified, component, group, XML TTS, annotation, escaped-entity, and missing-zh fixtures.
- [ ] Run `npm test -- --run scripts/emoji-data-lib.test.ts`; expect failure because the parser module does not exist.
- [ ] Implement the parser/generator library and rerun the focused test; expect pass.
- [ ] Add the pinned network update script, documentation and notices; run `npm run generate:emoji-data` to create the committed module.
- [ ] Run `npm test -- --run scripts/emoji-data-lib.test.ts`; expect all parser tests to pass.

### Task 2: Unicode, search, and persistence services

**Files:**
- Create: `src/services/text/emojiService.test.ts`
- Create: `src/services/text/emojiService.ts`
- Create: `src/services/text/emojiStorage.test.ts`
- Create: `src/services/text/emojiStorage.ts`

**Interfaces:**
- Consumes: `EmojiRecord` from Task 1.
- Produces: `filterEmoji`, `formatEmojiDetails`, `loadEmojiState`, `saveEmojiState`, `addRecentEmoji`, and `toggleFavoriteEmoji`.

- [ ] Write literal service tests for fire/FIRE/火, heart/愛心, cat/貓, category intersections, and all required compound-sequence encodings.
- [ ] Run `npm test -- --run src/services/text/emojiService.test.ts`; expect missing-module failure.
- [ ] Implement minimal pure search and encoding functions; rerun and expect pass.
- [ ] Write storage tests for dedupe, newest-first order, 30-item cap, corrupt JSON, unavailable storage, and quota failure.
- [ ] Run the storage test; expect missing-module failure, then implement resilient storage and rerun to green.

### Task 3: Accessible Emoji Picker experience

**Files:**
- Create: `src/pages/text/EmojiPickerPage.test.tsx`
- Create: `src/pages/text/EmojiPickerPage.tsx`
- Create: `src/components/emoji/EmojiGrid.tsx`
- Create: `src/components/emoji/EmojiDetailsDialog.tsx`
- Create: `src/i18n/emojiMessages.ts`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: generated data and Task 2 services.
- Produces: lazy-loadable `EmojiPickerPage` with search, nine groups, all/recent/favorite views, copy, details, and recoverable storage/clipboard states.

- [ ] Write component tests for English and Chinese search, result counts, no-results/clear, copy success/failure, favorite isolation, recent behavior, dialog encodings, Escape/focus restoration, and storage warning.
- [ ] Run `npm test -- --run src/pages/text/EmojiPickerPage.test.tsx`; expect missing-page failure.
- [ ] Implement the page and focused components using native semantics and existing tokens; rerun focused tests until green.
- [ ] Add responsive styles with wrapping long values and visible focus; rerun component tests.

### Task 4: Catalog, route, SEO, and prerender integration

**Files:**
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/seo/landingPages.ts`
- Modify: `src/seo/siteMeta.test.ts`
- Modify: `src/routing/routes.ts`
- Modify: `src/routing/localePaths.test.ts`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `EmojiPickerPage` from Task 3.
- Produces: `/tools/emoji-picker` and `/en/tools/emoji-picker` entries in navigation, search, related tools, canonical/hreflang/OG/FAQ/breadcrumb metadata, prerender routes, and sitemap.

- [ ] Add failing integration assertions for discovery, both routes, required titles, canonical/hreflang, FAQ JSON-LD, and indexability.
- [ ] Run the focused integration tests; expect failures because the tool is not registered.
- [ ] Register the tool, lazy route and bilingual SEO content; rerun focused tests to green.

### Task 5: Full verification and real browser pass

**Files:**
- Modify only files required by defects proven during verification.

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: verified release candidate and evidence.

- [ ] Run `npm test -- --run`; expect the complete suite to pass with zero failures.
- [ ] Run `npm run build`; expect type-check, client build, SSR build, prerender, and sitemap generation to exit 0.
- [ ] Run the app and verify the real localized route at wide and 360px viewports with mouse and keyboard: search, category intersection, copy, favorites, recents, details, Escape/focus restoration, long encodings, refresh persistence, and clipboard/storage error paths.
- [ ] Inspect generated route HTML and sitemap for title, description, canonical, hreflang, OG, breadcrumb and FAQ structured data.
