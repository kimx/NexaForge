# Issue #23 Complete Tool Suite Design

## Context and outcome

Issue #23 names twenty browser utilities across regex, QR/barcodes, structured data/code generation, and image workflows. Regex Tester is already implemented on this branch. QR generation, EXIF viewing/removal, image conversion, crop, resize, compression, and generic file-to-Base64 also exist, but image conversion lacks AVIF and resize/compression are single-file workflows.

This design completes every issue item as a discoverable, bilingual NexaForge tool while preserving the product's local-only processing model. Existing working tools are extended rather than rewritten. The remaining work is split into three independently testable delivery batches:

1. QR and barcode tools.
2. JSON, XML, and code-generation tools.
3. Advanced and batch image tools.

## Product-wide requirements

- Every issue capability has a dedicated canonical route, an English-prefixed route, registry metadata, search aliases, localized title/description/how-to/FAQ copy, and prerendered SEO output.
- User content and files remain on the device. Analytics events contain only the tool identifier, operation status, and non-sensitive aggregate counts.
- All new pages use `ToolPageTemplate`, the existing workflow states, semantic form controls, visible focus, keyboard access, status announcements, mobile layouts, and at least 44 by 44 CSS-pixel pointer targets.
- Heavy dependencies are dynamically imported only after the relevant user action. The home page and unrelated tools must not eagerly load barcode, HEIC, AVIF, ZIP, or SVG-optimization code.
- Operations expose specific validation errors. Batch operations continue after an individual file failure and show per-file outcomes.
- Existing public routes remain valid. No server API, account, persistence, cloud upload, saved history, or telemetry containing source data is added.

## Route and capability inventory

### Existing and retained

- `/developer/regex-tester`: safe JavaScript regex execution in a Worker.
- `/qr-code`: text/URL QR generation.
- `/image/exif-viewer` and `/image/remove-exif`: JPEG EXIF inspection and removal.
- `/image/crop`: interactive local crop.
- `/developer/base64`: generic text/file Base64 workflows.

### QR and barcode batch

- `/qr-code/reader`: decode a QR code from an uploaded image or a live camera stream. Camera controls stop on user request, route change, and unmount.
- `/barcode/generator`: generate Code 128 or EAN-13 as PNG and SVG. EAN-13 accepts twelve digits and computes the check digit, or validates an existing thirteen-digit value.
- `/qr-code/wifi`: build an escaped `WIFI:` payload for WPA/WPA2, WEP, or open networks, including hidden SSIDs, then generate a downloadable QR image.
- `/qr-code/vcard`: build a vCard 3.0 payload from name, phone, email, company, job title, URL, and address fields, then generate a downloadable QR image.

QR image decoding uses `@zxing/browser`; barcode rendering uses the `bwip-js/browser` package export. Both are imported from their page services only when processing begins. QR payload builders remain pure TypeScript and are tested without the rendering libraries.

### Structured-data batch

- `/developer/json-to-csharp`: parse a JSON object, infer nested C# classes, sanitize and de-duplicate PascalCase identifiers, infer arrays and nullable values, accept a root-class name and optional namespace, and expose copy/download actions.
- `/developer/json-to-typescript`: parse a JSON object, infer nested TypeScript interfaces, sanitize and de-duplicate PascalCase type names and property identifiers, preserve optional/null unions, accept a root-interface name, and expose copy/download actions.
- `/data/json-xml`: convert in both directions with one documented mapping: attributes use `@name`, element text uses `#text`, repeated sibling elements become arrays, and JSON-to-XML requires or supplies one root element. The page exposes direction, indentation, copy, and download controls.
- `/data/xml-formatter`: validate and pretty-print, compact, or minify XML with two-space, four-space, or tab indentation. It reports parser failures without inventing line/column data the browser did not provide.

Code generation and JSON/XML conversion use pure TypeScript plus native `DOMParser`/`XMLSerializer`. XML input containing `DOCTYPE` or `ENTITY` declarations is rejected. The mapping is deterministic but does not promise byte-for-byte or mixed-content-order round trips.

### Image batch

- `/image/heic-converter`: detect HEIC/HEIF content and convert its primary image to JPEG or PNG with a JPEG quality option. `heic-to/csp` is dynamically loaded for local decoding; its third-party license and source link are recorded in a notice file.
- `/image/convert`: retain JPEG/PNG/WebP conversion and add AVIF input/output. Native canvas is used when it proves support; `@jsquash/avif` is the lazy fallback for AVIF decode/encode.
- `/image/resize`: upgrade to one-to-twenty input images with shared dimensions, aspect-ratio, format, and quality options.
- `/image/compress`: upgrade to one-to-twenty input images with shared format and quality options.
- `/image/base64`: provide an image-focused route with raw Base64 and complete Data URL output, copy, and text download. It reuses the existing file-to-Base64 service.
- `/image/svg-optimizer`: optimize one SVG with dynamically imported `svgo`, before/after source and byte comparison, safe image preview, copy, and download. Active content or external-resource references disable preview and are never inserted into the document as HTML.
- `/image/favicon-generator`: accept one square-capable raster image, render 16, 32, 48, 180, 192, and 512 pixel PNGs, create a PNG-backed multi-image ICO containing 16/32/48 sizes, generate a minimal web-app manifest, and offer individual and ZIP downloads.
- `/image/social-resizer`: render selected Open Graph, X landscape, Instagram square, Instagram story, LinkedIn share, and custom presets using contain or cover positioning, show output dimensions, and offer individual and ZIP downloads.

Batch selection is limited to twenty files, 50 MiB per input, and 200 MiB total. Processing uses at most two concurrent image jobs, reports determinate progress, and releases intermediate bitmaps/object URLs. ZIP assembly uses dynamically imported `fflate`. A failed file remains in the result list with a localized reason while the rest continue.

## Shared architecture

### Pure domain modules

Pure modules own QR payload escaping, EAN validation, code-generation inference, JSON/XML mapping, XML formatting, ICO container construction, social preset definitions, batch limits, and filename normalization. They accept serializable values and return serializable values or typed errors. These modules carry most edge-case coverage and have no React dependency.

### Browser adapters

Small service adapters own DOM, canvas, camera, Worker, and third-party-library access. Dynamic imports occur inside adapter functions rather than at module scope. Adapters return the existing `FileProcessResult` shape or focused result types. Object URL ownership remains in React hooks/components so URLs are revoked predictably.

### Shared workflow components

- `CodeOutputPanel` renders read-only generated text with accessible copy/download actions.
- `BatchFileResults` renders file name, state, output size, error, and individual download while announcing aggregate progress.
- `DownloadCollectionButton` lazily packages successful results into a ZIP.

These components are introduced only where at least two tools use them. Existing `FileDropzone`, `FileInfo`, `DownloadButton`, `SizeComparison`, and `ToolPageTemplate` remain the primary building blocks.

### Registration and localization

The tool category union gains `QR & Barcode`; existing `/qr-code` moves from the Image category without changing its route. New issue-specific strings live in `src/i18n/issue23Messages.ts` and are spread into the existing language dictionaries to avoid adding another large block to `LanguageContext.tsx`. New scoped styles live in `src/styles/issue23-tools.css` and are imported by the app entry point.

## Data flow

1. A page validates required fields/files and creates an operation-specific request.
2. A pure domain module performs syntax, mapping, or naming work; a browser adapter performs canvas, camera, codec, renderer, or archive work.
3. The page records only `process_start`, `process_success`, or `process_failed` with the tool id and, for batch tools, the selected/succeeded/failed counts.
4. Results remain in memory until replaced or the page unmounts. Download actions serialize only the local results requested by the user.
5. Starting a replacement operation cancels or supersedes the previous operation where the underlying adapter supports cancellation; stale completions are ignored everywhere.

## Error handling

- Field errors are associated through `aria-describedby`; workflow-level errors use the template alert region.
- JSON, XML, Wi-Fi, vCard, EAN-13, and file-limit validation errors are specific and localized.
- Camera denial, missing camera hardware, no QR found, unsupported codec, invalid image data, canvas serialization failure, and ZIP failure have distinct messages and a retry path.
- Batch results distinguish pending, processing, success, and error. A collection can be downloaded when at least one output succeeds.
- Heavy operations expose progress and never disable navigation. Camera streams and active jobs are cleaned up on unmount.
- SVG is never rendered with `dangerouslySetInnerHTML`. XML rejects DTD/entity declarations. Generated code is rendered as text.

## Testing and verification

- Every pure domain function is introduced by a failing Vitest test and implemented through red-green-refactor.
- Service tests inject or mock browser boundaries only where JSDOM lacks camera, canvas codecs, Workers, or dynamic third-party implementations. Assertions target returned behavior and cleanup, not mock call counts alone.
- Page tests cover accessible names, validation, processing, success, error, retry/reprocess, copy/download visibility, per-file partial failure, and Traditional Chinese copy.
- Registry, routes, localized routes, SEO metadata, sitemap, README inventory, and lazy-load boundaries receive focused regression coverage.
- Each delivery batch ends with its focused tests and a production build. Final delivery requires the complete Vitest suite, TypeScript/client/SSR/prerender build, `git diff --check`, and browser verification on desktop and mobile.
- Browser verification includes keyboard-only workflows, camera fallback messaging without granting permission, long/generated output scrolling, batch partial failure, ZIP creation, object URL cleanup, and absence of document-level horizontal overflow.

## Delivery order

1. QR/barcode payloads and render/read adapters, then four pages and discovery integration.
2. Code-generation and XML domain modules, then four pages and discovery integration.
3. Shared batch/archive primitives, batch resize/compress upgrades, HEIC and AVIF codecs, then Base64, SVG, favicon, and social-resizer pages.
4. Cross-suite localization, SEO, performance, accessibility, browser, and full-build verification.

Each batch is committed separately and leaves the application usable. No batch depends on unfinished UI from a later batch.
