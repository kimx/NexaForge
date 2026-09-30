# Everyday file tools

The user approved all five proposed mainstream tools and mobile selection, download visibility, and actionable error improvements. Extend the existing React/Vite application and its tool workspace; keep file contents local and provide Traditional Chinese and English. This request authorizes implementation; no new visual redesign or deployment is required.

## Scope and behavior

- PDF compression (`/pdf/compress`): conservative rewriting with selectable text retained; an explicitly chosen raster mode renders pages into JPEG and builds a smaller PDF, preserving page dimensions. Explain loss of selectable text, links/forms/signatures in raster mode. Keep the original when recompression grows the file. Page progress, cancellation, corrupt/encrypted errors, size comparison, download.
- Collage / long image (`/image/collage`): ordered multi-image input, vertical/horizontal/grid layouts, output width and spacing, background, JPEG/PNG export, preview, move/remove controls. Enforce image count and canvas pixel limits.
- OCR (`/image/ocr`): browser worker recognition of PNG/JPEG/WebP, Traditional Chinese plus English or English only. First-run model download explanation, progress, cancellation, copy and UTF-8 text download. Do not upload image contents. Self-host worker/core assets; models may download from the documented upstream model host.
- Document scanner (`/image/document-scan`): camera capture or photo selection, four ordered draggable corners with keyboard adjustment, projective correction, color/grayscale/high-contrast modes, preview and JPEG/PDF export. Explicit manual corner selection, no unimplemented auto-detection promises.
- Batch rename (`/tools/batch-rename`): arbitrary file input, ordered naming rules (base name, find/replace, prefix/suffix, sequence start/padding), extension preservation, original/new name preview, collision/path validation, downloads as renamed copies in ZIP. Original files are never modified. Enforce total bytes and count.
- Shared improvements: mobile-friendly file chooser with visible type/size hints, localized actionable rejection reasons, camera-capable input when requested, clear result filename/size and download feedback/errors. Preserve existing tool semantics.

## Acceptance

All five tools are discoverable through homepage search/category/sidebar, bilingual, lazy-loaded, have canonical/prerender routes and descriptive metadata. Inputs invalidate stale outputs. Busy states prevent incompatible changes; async work is cancelled or ignored after selection/unmount. File/object URLs and PDF/OCR workers are released. Real utility tests cover output content and geometry, meaningful UI tests cover invalidation/errors. Run the complete test suite, TypeScript, prerender production build, and browser verification on desktop and phone-sized views, using generated fixtures rather than personal data.

## Boundaries

No backend, account, cloud sync, or deployment. PDF raster output is a disclosed lossy option, never presented as lossless. OCR accuracy and physical camera capture remain device dependent. Existing analytics only record supported non-content events.
