# Implementation plan

Implement the authorized scope in the existing checkout. Keep module ownership separate for independent tasks and integrate shared registrations centrally.

1. PDF compression: `src/services/pdf/compressService.ts`, `src/pages/pdf/CompressPage.tsx`, feature tests. Reuse existing PDF loaders/rendering, verify rewritten PDFs with pdf-lib, size fallback, invalid inputs and page geometry.
2. OCR: `src/services/ocr/ocrService.ts`, `src/pages/image/OcrPage.tsx`, feature tests, OCR asset staging script. Install tesseract.js centrally; isolate worker lifecycle and verify cancellation/progress with dependency doubles, then recognize an actual generated English fixture in the browser.
3. Document scan: `src/services/image/documentScanService.ts`, `src/components/DocumentScanEditor.tsx`, `src/pages/image/DocumentScanPage.tsx`, tests. Test identity/perspective mapping against hand-derived points, invalid quadrilaterals, pixel transforms and export; verify editor pointer and keyboard interaction.
4. Collage: `src/services/image/collageService.ts`, `src/pages/image/CollagePage.tsx`, tests. Validate independent layout placements and resource limits; exercise real Canvas output in browser with generated colored images.
5. Batch rename: `src/services/file/renameService.ts`, `src/pages/file/BatchRenamePage.tsx`, tests. Assert extension preservation, sequential names, forbidden paths, case-insensitive duplicates and unchanged ZIP payload bytes.
6. Integration: central registry, visuals, metadata messages, App routes, relevant homepage task links and README. Shared FileDropzone rejection hints/capture and DownloadButton status/errors. Preserve existing a11y patterns and mobile styles.
7. Verify: focused tests after each domain, full `npm run test -- --run`, `npm run build`, browser success/error flows and responsive checks. Fix real defects, inspect combined diff, and report verified results and any device-dependent limits.
