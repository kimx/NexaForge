# Emoji Picker & Unicode Tool Design

## Intent

Add one browser-only tool at `/tools/emoji-picker` for people who need to find and copy emoji quickly, while giving developers trustworthy Unicode encodings for the complete copied sequence. The primary actor is a general user searching and copying an emoji; developers inspecting encodings are secondary.

## Data contract

- Pin Emoji 17.0 from Unicode 17.0.0 and CLDR 48 from the `release-48` tag. Do not fetch data during normal builds or at runtime.
- A manual generator reads the official `emoji-test.txt`, keeps only `fully-qualified` rows, excludes standalone components, preserves source order and group, and joins CLDR `en` and `zh-Hant` TTS names and annotations.
- The committed generated module contains an explicit version/source/license header and stable identifiers made from the complete ordered code-point sequence.
- Missing Traditional Chinese TTS falls back to English. A small Chinese synonym supplement may improve common searches without becoming a parallel emoji catalog.

## Operation model

The user opens the tool, searches in English or Traditional Chinese, optionally narrows to one of the nine Unicode groups, and activates an emoji button to copy the complete string. Copy success alone updates the live message and recent list. Information and favorite controls are separate actions and never copy or update recents.

The page also offers All, Recent, and Favorites views. Recent entries are deduplicated, newest first, limited to 30, and clearable. Favorites toggle independently. Both persist under emoji-specific localStorage keys. Invalid or unavailable storage falls back to in-memory state and shows a non-blocking warning.

The details dialog shows the glyph, localized names, category, code points, UTF-8 bytes, hexadecimal HTML references, and JavaScript code-point escapes. Every value remains selectable and has its own copy action. Clipboard rejection produces an error message and never reports success.

## Layout and accessibility

Reuse the existing page shell, tokens, localization, SEO, related-tools, and route conventions. The work area contains a full-width labeled search field, clear control and result count, horizontally wrapping category/view controls, then a responsive emoji grid. The dialog becomes a comfortable inset panel on wide screens and a near-full-width sheet on narrow screens. Long names and encodings wrap without horizontal page overflow.

Target WCAG 2.1 AA. Use native buttons and dialog semantics, visible focus, 44px-friendly targets, descriptive accessible names, `aria-pressed` for favorite toggles, a polite atomic status region, Escape close, focus containment while open, and focus restoration to the invoking control. Do not rely on color alone.

## Architecture

- `scripts/generate-emoji-data.mjs` and a small parser library own reproducible data generation.
- `src/data/emoji.generated.ts` is a lazy-loaded generated dataset.
- `src/services/text/emojiService.ts` owns normalization, filtering, identifiers, and encoding formats.
- `src/services/text/emojiStorage.ts` owns resilient recent/favorite persistence.
- `src/pages/text/EmojiPickerPage.tsx` owns page state and composes focused emoji components.
- Routing, tool catalog, i18n, SEO, styles, prerendering, sitemap, and related tools are extended through existing mechanisms.

## Privacy and telemetry

No search term, copied emoji, favorite, or recent list is sent to APIs, analytics, or telemetry. The existing generic page-open event may identify only the tool id. The runtime performs no network requests.

## Verification

Unit tests cover normalization and bilingual search; category intersection; complete encodings for 🚀, ❤️, 🇹🇼, 👍🏽, 👩‍💻, 1️⃣ and a tag sequence; recent dedupe/order/limit; corrupt and unavailable storage; and generator parsing. Component tests cover copy success/failure, no false success, independent information/favorite actions, views, clearing, dialog keyboard behavior, localization, and no-results. Integration tests cover tool discovery, localized routes, metadata, indexability, prerendering, and sitemap. Browser checks exercise wide and narrow layouts plus keyboard-only operation.
