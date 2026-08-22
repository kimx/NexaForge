# Issue #23 Advanced Image Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete HEIC and AVIF conversion, true batch resize/compression, image Base64, SVG optimization, favicon generation, and social-media resizing while retaining existing image tools.

**Architecture:** Focused browser codec adapters and pure image-plan/container helpers feed a bounded batch runner. Shared result/archive components support batch pages, while heavy HEIC, AVIF, SVG, and ZIP dependencies remain lazy.

**Tech Stack:** React 18, TypeScript 5.8, Canvas/ImageBitmap, `heic-to`, `@jsquash/avif`, `svgo`, `fflate`, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-22-issue-23-complete-tool-suite-design.md`

## Global Constraints

- Keep files local and dynamically import HEIC, AVIF, SVGO, and ZIP dependencies.
- Limit batches to twenty files, 50 MiB each, and 200 MiB total, with two concurrent jobs.
- Continue after individual failures and preserve deterministic input order in results and ZIPs.
- Revoke object URLs, close ImageBitmaps, and ignore stale operation completions.
- Never render SVG with `dangerouslySetInnerHTML`; disable preview for active/external content.
- Preserve existing crop and EXIF routes and existing single-image behavior when one file is selected.

---

### Task 1: Batch runner and ZIP service

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/services/batch/batchService.ts`
- Test: `src/services/batch/batchService.test.ts`
- Create: `src/services/file/zipService.ts`
- Test: `src/services/file/zipService.test.ts`

**Interfaces:**
- Produces: `validateImageBatch(files): BatchValidationError[]`, `runBatch(files, processor, options): Promise<BatchRunResult>`, `createZip(results, fileName, dependencies?): Promise<FileProcessResult>`, `MAX_BATCH_FILES = 20`, and `MAX_BATCH_BYTES = 200 * 1024 * 1024`.

- [ ] **Step 1: Write failing batch/archive tests**

```ts
const result = await runBatch([a, b, c], async (file) => file === b ? Promise.reject(new Error("bad")) : output(file), { concurrency: 2 });
expect(result.items.map((item) => item.status)).toEqual(["success", "error", "success"]);
expect(result.completed).toBe(3);
await expect(validateImageBatch(Array.from({ length: 21 }, () => a))).not.toHaveLength(0);
expect((await createZip([output(a)], "images.zip", fakeZip)).fileName).toBe("images.zip");
```

- [ ] **Step 2: Verify RED**

Run both test files. Expected: FAIL because services are absent.

- [ ] **Step 3: Install fflate and implement bounded ordered processing**

Run: `npm install fflate`

The runner schedules at most two promises, stores results by original index, calls progress after each settlement, supports `AbortSignal`, and never rejects for an individual item. The ZIP adapter dynamically imports `zip`/`strToU8`, sanitizes duplicate paths, and includes only successful blobs.

- [ ] **Step 4: Verify GREEN and commit**

Run both test files. Expected: PASS.

```powershell
git add -- package.json package-lock.json src/services/batch src/services/file/zipService.ts src/services/file/zipService.test.ts
git commit -m "feat: add bounded image batch processing"
```

### Task 2: Batch result UI and resize/compress upgrades

**Files:**
- Create: `src/components/BatchFileResults.tsx`
- Test: `src/components/BatchFileResults.test.tsx`
- Create: `src/components/DownloadCollectionButton.tsx`
- Test: `src/components/DownloadCollectionButton.test.tsx`
- Modify: `src/pages/image/ResizePage.tsx`
- Modify: `src/pages/image/ResizePage.test.tsx`
- Modify: `src/pages/image/CompressPage.tsx`
- Modify: `src/pages/image/CompressPage.test.tsx`
- Modify: `src/i18n/issue23Messages.ts`
- Modify: `src/styles/issue23-tools.css`

**Interfaces:**
- Consumes: Task 1 runner/ZIP service plus existing `resizeImage` and `compressImage`.
- Produces: ordered per-file outcomes, individual downloads, aggregate progress, and ZIP download.

- [ ] **Step 1: Add failing component and page tests**

Change the existing selection tests to accept multiple files. Assert partial success, `2 of 3 completed`, per-file error, single-result download, ZIP enabled with one success, disabled while processing, clear/reset, and batch-limit errors.

- [ ] **Step 2: Verify RED**

Run the four component/page files. Expected: FAIL because batch UI/behavior is absent.

- [ ] **Step 3: Implement batch UI and page migrations**

Set `multiple`, validate count/aggregate bytes, run with concurrency two, expose determinate workflow progress, retain all source file names, and render a semantic list with status text. Keep current option controls and one-file previews; omit twenty simultaneous previews to bound memory.

- [ ] **Step 4: Verify GREEN and commit**

Run the four files from Step 2. Expected: PASS.

```powershell
git add -- src/components/BatchFileResults.tsx src/components/BatchFileResults.test.tsx src/components/DownloadCollectionButton.tsx src/components/DownloadCollectionButton.test.tsx src/pages/image/ResizePage.tsx src/pages/image/ResizePage.test.tsx src/pages/image/CompressPage.tsx src/pages/image/CompressPage.test.tsx src/i18n/issue23Messages.ts src/styles/issue23-tools.css
git commit -m "feat: upgrade resize and compression to batches"
```

### Task 3: HEIC and AVIF codec adapters

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/services/image/heicService.ts`
- Test: `src/services/image/heicService.test.ts`
- Create: `src/services/image/avifService.ts`
- Test: `src/services/image/avifService.test.ts`
- Modify: `src/services/image/imageService.ts`
- Create: `src/services/image/imageService.test.ts`
- Create: `src/pages/image/HeicConverterPage.tsx`
- Test: `src/pages/image/HeicConverterPage.test.tsx`
- Modify: `src/pages/image/ConvertPage.tsx`
- Modify: `src/pages/image/ConvertPage.test.tsx`
- Create: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Produces: `convertHeic(file, options, dependencies?): Promise<FileProcessResult>`, `decodeAvif`, `encodeAvif`, and AVIF-aware `convertImage`.

- [ ] **Step 1: Write failing codec and page tests**

Assert HEIC signature validation, JPEG/PNG output names and MIME types, dynamic dependency failure mapping, AVIF fallback decode/encode, bitmap cleanup, native canvas preference, and AVIF option rendering.

- [ ] **Step 2: Verify RED**

Run the new service/page tests plus `ConvertPage.test.tsx`. Expected: FAIL because codecs/options are absent.

- [ ] **Step 3: Install codecs and implement adapters**

Run: `npm install heic-to @jsquash/avif`

Import `heic-to/csp` and AVIF encode/decode inside async functions. Convert decoded pixel data through ImageData/canvas where required. Probe canvas AVIF serialization once and cache the boolean. Add LGPL/source attribution for heic-to and Apache/source attribution for jSquash to `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 4: Implement HEIC page and AVIF conversion option**

The HEIC page accepts `.heic,.heif,image/heic,image/heif`, offers JPEG/PNG and JPEG quality, preview, size comparison, and download. The existing converter accepts/outputs AVIF and shows a localized unsupported-codec error when neither native nor fallback processing succeeds.

- [ ] **Step 5: Verify GREEN and commit**

Run all files from Step 2, then `npm run build`. Expected: PASS and codec chunks emitted lazily.

```powershell
git add -- package.json package-lock.json src/services/image src/pages/image/HeicConverterPage.tsx src/pages/image/HeicConverterPage.test.tsx src/pages/image/ConvertPage.tsx src/pages/image/ConvertPage.test.tsx THIRD_PARTY_NOTICES.md
git commit -m "feat: add local HEIC and AVIF conversion"
```

### Task 4: Image Base64 and SVG optimizer

**Files:**
- Create: `src/services/svg/svgOptimizerService.ts`
- Test: `src/services/svg/svgOptimizerService.test.ts`
- Create: `src/pages/image/ImageBase64Page.tsx`
- Test: `src/pages/image/ImageBase64Page.test.tsx`
- Create: `src/pages/image/SvgOptimizerPage.tsx`
- Test: `src/pages/image/SvgOptimizerPage.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `optimizeSvg(source, options, dependencies?): SvgOptimizationResult` and two route-ready pages.

- [ ] **Step 1: Write failing service/page tests**

Assert raw/Data URL output switching, image-only validation, copy/text download, SVG size reduction, active-content preview disabled, external URL preview disabled, safe local SVG preview enabled, optimizer error reporting, and output download.

- [ ] **Step 2: Verify RED**

Run the three files. Expected: FAIL because service/pages are absent.

- [ ] **Step 3: Install SVGO and implement safe workflows**

Run: `npm install svgo`

The optimizer dynamically imports `optimize`, uses `preset-default` with `removeViewBox` disabled, identifies script/foreignObject/event-handler/external-reference content before preview, and returns source/output byte counts. Base64 reuses `fileToBase64` and never creates a raster preview from arbitrary non-image input.

- [ ] **Step 4: Verify GREEN and commit**

Run the three files. Expected: PASS.

```powershell
git add -- package.json package-lock.json src/services/svg src/pages/image/ImageBase64Page.tsx src/pages/image/ImageBase64Page.test.tsx src/pages/image/SvgOptimizerPage.tsx src/pages/image/SvgOptimizerPage.test.tsx
git commit -m "feat: add image Base64 and SVG optimization"
```

### Task 5: Favicon and social image generation

**Files:**
- Create: `src/services/image/faviconService.ts`
- Test: `src/services/image/faviconService.test.ts`
- Create: `src/services/image/socialImageService.ts`
- Test: `src/services/image/socialImageService.test.ts`
- Create: `src/pages/image/FaviconGeneratorPage.tsx`
- Test: `src/pages/image/FaviconGeneratorPage.test.tsx`
- Create: `src/pages/image/SocialResizerPage.tsx`
- Test: `src/pages/image/SocialResizerPage.test.tsx`

**Interfaces:**
- Produces: `buildIco(images): Blob`, `generateFaviconSet(file, options): Promise<FileProcessResult[]>`, `SOCIAL_PRESETS`, and `generateSocialImages(file, requests): Promise<FileProcessResult[]>`.

- [ ] **Step 1: Write failing pure/container and page tests**

Assert ICO header/count/offsets, all required favicon filenames/sizes, manifest content, cover/contain rectangle calculations, exact preset dimensions, custom dimension validation, selected preset processing, partial errors, and ZIP availability.

- [ ] **Step 2: Verify RED**

Run the four files. Expected: FAIL because services/pages are absent.

- [ ] **Step 3: Implement image plans, ICO container, and pages**

Render each size through canvas using shared cover/contain rectangle helpers. Store PNG payloads in ICO entries with little-endian directory fields. Favicon page warns but accepts non-square sources using contain/transparent padding. Social output names include platform and dimensions; custom dimensions are limited to 16–4096 pixels per side.

- [ ] **Step 4: Verify GREEN and commit**

Run the four files. Expected: PASS.

```powershell
git add -- src/services/image/faviconService.ts src/services/image/faviconService.test.ts src/services/image/socialImageService.ts src/services/image/socialImageService.test.ts src/pages/image/FaviconGeneratorPage.tsx src/pages/image/FaviconGeneratorPage.test.tsx src/pages/image/SocialResizerPage.tsx src/pages/image/SocialResizerPage.test.tsx
git commit -m "feat: add favicon and social image generators"
```

### Task 6: Discovery, final suite, and browser verification

**Files:**
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/seo/siteMeta.test.ts`
- Modify: `src/seo/artifacts.test.ts`
- Modify: `src/i18n/issue23Messages.ts`
- Modify: `src/styles/issue23-tools.css`
- Modify: `README.md`

- [ ] **Step 1: Add failing discovery assertions**

Assert canonical and `/en` routes for `/image/heic-converter`, `/image/base64`, `/image/svg-optimizer`, `/image/favicon-generator`, and `/image/social-resizer`; assert upgraded tools advertise AVIF/batch behavior.

- [ ] **Step 2: Verify RED**

Run App, SEO, registry/sidebar, and artifact tests. Expected: FAIL before registration.

- [ ] **Step 3: Register lazy pages and finish bilingual copy**

Add tool metadata, lazy route imports, README entries, how-to/FAQ messages, and scoped responsive result styles. Ensure all issue items appear once in the public inventory.

- [ ] **Step 4: Run fresh automated verification**

Run: `npm test -- --run`

Run: `npm run build`

Run: `git diff --check`

Expected: 0 failed tests, build exit 0, and no whitespace errors.

- [ ] **Step 5: Run browser verification**

Verify every new route at desktop 1440×900 and representative image/structured-data pages at mobile 390×844. Exercise keyboard focus, upload validation, partial batch failure, ZIP download, QR camera-denial fallback, large output scrolling, locale switching, console errors, and document overflow. Confirm generated sitemap/prerender files exist for both locales.

- [ ] **Step 6: Commit final integration**

```powershell
git add -- src/data/tools.ts src/App.tsx src/App.test.tsx src/seo src/i18n/issue23Messages.ts src/styles/issue23-tools.css README.md
git commit -m "feat: complete issue 23 image tool suite"
```
