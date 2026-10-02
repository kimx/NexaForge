# Three file workflows — 2026-10-02

## Delivered behavior

Primary actor: a daily office user preparing images or documents for delivery.
The job is to select source files once, review each transformation, and obtain a
final file without manually downloading and reselecting intermediate results.
Secondary users include developers and people preparing product images.

The three page-local workflows are available from the homepage and relevant tool
pages, in Traditional Chinese and English:

| Route | Ordered stages | Final output |
| --- | --- | --- |
| `/workflows/image-delivery` | Resize → text watermark → ZIP | All transformed images in one ZIP; duplicate names get suffixes |
| `/workflows/document-text` | Four-corner correction → OCR → editable text cleanup | UTF-8 text file or clipboard copy |
| `/workflows/pdf-delivery` | Ordered merge → page numbers → compression | PDF retaining page numbers even if compression cannot reduce size |

Earlier snapshots remain available when returning to a step. Changes invalidate
only the affected step and its successors. Cancellation and failure retain earlier
completed stages; late results and progress cannot overwrite a newer run. Stage
buttons lock until their prerequisites finish, and focus moves to the new heading
when advancing. File and text content is stored only in page memory.

The layout reuses the existing theme tokens, shell, file selection, scanner,
download, privacy, ZIP, image, PDF and OCR services. Wide screens show controls
beside the current preview; narrow screens put the preview after the controls and
wrap step navigation into two rows. PDF previews render only the first page with
bounded dimensions, while retaining the actual document page count.

## Automated verification

- `npx vitest run --maxWorkers=2`: **172 files, 909 tests passed**.
- After final label, cleanup-state and PDF-limit adjustments:
  `npx vitest run src/pages/workflows/FileWorkflows.test.tsx src/hooks/useStagedWorkflow.test.tsx src/services/workflow/fileWorkflowService.test.ts src/data/workflows.test.ts --maxWorkers=2`:
  **4 files, 12 tests passed**.
- Final `npm run build`: passed TypeScript, client and SSR builds, and bilingual
  prerendering. Existing tree-sitter externalization/eval and large-chunk notices remain.
- `git diff --check`: passed.

Tests verify dependency invalidation, duplicate-submit prevention, cancellation,
late-result suppression, retry, input ordering, real PDF page content and numbering
after compression, ZIP collision handling, OCR job termination and UTF-8 output.

An initial full run with three workers, concurrent with the build and browser QA,
timed out waiting for an existing lazy text-cleaner route (908/909 passed). Its
isolated nine-test suite passed; the subsequent full two-worker run passed without
changing that test or its implementation.

## Browser verification

`scripts/verify-file-workflows.mjs` uses real processing services in Chromium with
generated fixtures. It ran at `http://127.0.0.1:5175`, with an English desktop
viewport of 1440 × 1000 and a Traditional Chinese mobile viewport of 390 × 844.

| Fixture / input | Action | Observed result |
| --- | --- | --- |
| Two identically named PNGs | Resize, watermark, package, download | ZIP extracted into two distinct JPEG entries |
| Completed image flow | Change watermark text | Next step and final download stage locked; resized input retained |
| Two PDFs with different widths | Reorder, merge, start numbering at 7, compress, download | Width order 520 → 420; page content contains 7 / 2 and 8 / 2 |
| Broken PDF | Attempt merge, then replace input and retry | Local error, no continuation; retry with valid PDFs succeeds |
| Generated document photo | Correct corners, OCR using real English model | Recognized `NEXAFORGE DOCUMENT` and `Hello workflow 123` |
| OCR model startup | Cancel, then retry | Cancel leaves earlier scan intact; fresh recognition succeeds |
| OCR text | Correct to Chinese, clean, download | Actual saved UTF-8 text is `繁體 中文` |
| Completed document workflow | Refresh | New scan is disabled until a new photo is selected |
| Both viewports | Traverse stages and inspect layout | New-step heading receives focus; no horizontal overflow or page errors |

Verification exposed ambiguous wrapped select/textarea labels. Explicit accessible
names now identify these controls, and the immutable OCR preview has a distinct
name from the editable draft. Browser checks passed again after the fixes.

The final production build was served at `http://127.0.0.1:5176`. All six
prerendered workflow routes hydrated correctly at 390 × 844, had their expected
localized H1 and canonical URL, and produced no page errors or horizontal overflow.
The production homepage displayed all three workflow entries.

Evidence (generated fixtures, screenshots, actual downloads, final build/test logs,
and `results.json`) is retained in the ignored local folder
`.codex/file-workflows-qa-2026-10-02/`.

Repeat with a local Playwright installation, or point `PLAYWRIGHT_MODULE_PATH` at
an existing package. Set `AUDIT_BASE_URL` and `AUDIT_OUTPUT` as needed:

```powershell
node scripts/verify-file-workflows.mjs
```

## Limits

- Camera capture is exposed through the browser file picker; no physical phone
  camera was available. Mobile testing used Chromium emulation and a saved photo.
- Actual OCR verification used English model recognition. Chinese input was
  verified through editing, cleanup and UTF-8 download; no Chinese accuracy claim
  is made. The UI asks users to review recognition results.
- Watermarks in this flow are text watermarks. Existing standalone watermark
  tools retain their other capabilities.
- Image inputs: 20 files, 50 MiB each, 200 MiB total; resized output is bounded to
  8192 pixels per side and 16 million pixels. PDF inputs: 20 files, 100 MiB total,
  matching downstream PDF services; compression supports up to 200 pages.
- JPEG PDF compression removes selectable text, links, forms and signatures;
  this consequence is shown before choosing it. If it cannot reduce size, the
  numbered PDF is retained.
- Refresh or navigation away clears the page-local workflow. OCR language models
  may use the OCR engine's normal browser cache; source content is not persisted.
