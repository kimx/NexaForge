# ID Photo Layout completion

**Goal:** Complete the existing partial implementation against [Issue #126](https://github.com/kimx/NexaForge/issues/126).

**Architecture:** Reuse ToolPageTemplate, FileDropzone, ImageCropEditor, LanguageContext and pdf-lib. Keep geometry in millimeters and use one page drawing/mark geometry for preview and export. All image data stays in browser memory.

**Design-time UX review:** Follow the existing crop page. Group upload/crop, physical layout, preview and export in task order. Lock rectangular crop ratio; preserve keyboard and pointer adjustment. Show source dimensions, effective resolution warning, invalid layout and decode errors beside the relevant task. Preview one selectable page with per-page and total counts. Disable stale downloads on every edit. Stack sections on mobile. Explain actual-size printing, size-only presets and ZIP for multiple raster pages.

## Tasks

- [x] Add regression tests for discoverability, locked cropping, page controls, invalid input, PDF physical sizes and raster dimensions.
- [x] Complete shared geometry/rendering, safe crop marks, bounded allocations and page yielding.
- [x] Add IDPhotoLayoutPage, bilingual messages, route, tool/search/relationships and generated SEO/sitemap integration.
- [x] Run focused tests, full suite, build and desktop/mobile browser workflows including exports, invalid files and replacement.

## Review focus

Tiny custom photos must not allocate millions of placements. Crop marks must stay outside photos and inside printable boundaries. Delayed previews must never overwrite new source/settings. Invalid or oversized sources must recover through replacement. All output formats must match preview geometry and physical paper size.

## Verification evidence

- Full regression: `npx vitest run --maxWorkers=4` passed 180 files / 959 tests.
- `npm run build`: passed, including TypeScript, client/SSR bundles, bilingual prerendering and sitemap. Both ID photo routes have their own canonical URL.
- Focused regression: 8 files / 70 tests passed (editor, crop geometry, custom aspect ratios, page, exports and sidebar).
- Browser: Chrome at 1440 × 1000 and mobile 390 × 844. Bilingual routes rendered; no page errors; mobile document width remained 390 px. Inspected rendered screenshots in `.codex/everyday-tools-check/id-photo-126-20261110/`.
- Downloaded 4×6 PDF: two pages, each 288 × 432 pt. Downloaded PNG and JPG: each 1200 × 1800 px. Downloaded multipage PNG ZIP: two correctly named page images.
- Exercised presets/custom dimensions, 5×100 mm narrow ratio, rotation, zoom, keyboard pan, reset, page selection, crop marks, A4 landscape, low-resolution warnings, stale-download invalidation, invalid image replacement and 8193 px source rejection.
- Independent read-only review found the narrow-ratio validation issue and minimum resize rounding issue; both were reproduced with failing tests and fixed. Legacy shapes retain existing minimum validation.
- Limits: 50 MB source, 40 MP / 8192 px per side, 100 pages / 10,000 copies. Original photos and exports remain in memory; only tool-use metadata follows existing personalization behavior.
- Unverified: physical printer output and device-specific memory pressure at maximum supported sizes. Presets do not certify regulatory compliance.
