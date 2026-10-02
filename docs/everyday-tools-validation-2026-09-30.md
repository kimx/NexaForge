# Everyday tools verification — 2026-09-30

Implemented PDF compression, image collage/long image, OCR, document scanning,
and batch file renaming in NexaForge. The registry contains 70 tools. New routes
are available in Traditional Chinese and English, included in prerendered output
and the sitemap, and discoverable through search, category navigation, pins and
recent tools.

## Automated checks

- `npx vitest run --maxWorkers=3`: 167 test files and 892 tests passed.
- `npm run build`: passed, including TypeScript, client/SSR builds and prerendering.
- `git diff --check`: passed.
- Generated HTML exists for all five tool routes in both languages. OCR worker
  and WebAssembly assets are present in the build output.

Existing build notices about curlconverter/tree-sitter externalized Node modules,
eval and large chunks remain; the build completed successfully.

## Browser checks

The checks used generated fixtures in the local development site, without
personal files. Screenshots and command logs are retained in the ignored local
folder `.codex/everyday-tools-check/`.

| Tool | Observed result |
| --- | --- |
| PDF compression | Three-page text fixture reduced from 2,184 bytes to about 1.31 KB (38.7%). A noisy scan reduced from 3.59 MB to 126.19 KB (96.6%) in JPEG mode. A larger attempted output kept the original. Cancellation allowed a fresh run. |
| Image collage | Vertical JPG: 600 × 1,351 px. Reordered grid PNG: 600 × 292 px. Horizontal JPG after the final memory change: 600 × 263 px. Previews retained source aspect ratios. |
| OCR | Real engine/model loading, image recognition and cancellation/restart succeeded. English was read accurately using the mixed model. Chinese model recognized the Chinese line with an incorrect character and spacing; review of OCR output remains required. Traditional Chinese is the default, with English and mixed-language alternatives. |
| Document scanner | Saved-photo selection, numeric four-corner correction, color and high-contrast previews succeeded. JPEG: 481 × 421 px. Color result exported a single-page PDF. Changing mode cleared the old output. |
| Batch rename | Duplicate names disabled export. Sequence rules produced `資料-001.txt` and `資料-002.txt`, then a 279-byte ZIP. Automated archive extraction also verified exact renamed entries and unchanged content. |

Mobile layouts were exercised around 375–424 CSS pixels. The PDF page had no
document-wide horizontal overflow. Collage ordering controls and download actions
remained visible. Desktop layouts were checked at 1440 pixels.

## Verification boundaries

- A physical phone camera was not available. The camera picker uses
  `capture="environment"`; a separate saved-photo picker is provided.
- The in-app browser displayed the download-request status, but its download
  event and media-download helpers timed out for Blob URLs. Consequently these
  browser checks do not claim an observed file saved to the operating system.
  Blob generation, filenames and archive/PDF contents were verified by service
  tests; common download click/error behavior was verified by component tests.
- OCR requires an initial model download and a browser supporting worker image
  decoding/OffscreenCanvas. Images are processed locally. OCR accuracy depends
  on image quality, layout and language; the UI asks users to review output.
- JPEG PDF compression produces image-only pages and removes selectable text,
  links, forms and signatures. Text-preserving mode rewrites PDF objects without
  downsampling existing images. Both modes keep the original if no smaller output
  is produced.
- Document scanning uses manually placed corners and a fixed threshold in
  high-contrast mode; automatic edge detection is not claimed.

No deployment or Git commit was performed.
