# Image Watermark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-only tool that applies one shared text or logo watermark to as many as 20 JPG, PNG, or WebP images with an accessible live preview and batch downloads.

**Architecture:** A focused Canvas service owns normalized placement, rotated bounds, preview drawing, and final encoding. A controlled `WatermarkEditor` renders the service output and translates pointer or keyboard input into normalized coordinates; `ImageWatermarkPage` owns files, settings, validation, batch lifecycle, and downloads.

**Tech Stack:** React 18, TypeScript 5.8, HTML Canvas, Pointer Events, Vitest, Testing Library, existing NexaForge batch/download components.

**Spec:** `docs/superpowers/specs/2026-08-24-image-watermark-design.md`

## Global Constraints

- Processing stays entirely in browser memory; no source, logo, or output file is uploaded or persisted.
- Accept one to 20 JPG, PNG, or WebP source images, each no larger than 20 MiB.
- Accept one JPG, PNG, or WebP logo no larger than 20 MiB.
- One processing run uses either one text watermark or one logo watermark, never both.
- Preserve source pixel dimensions and source format; output names end in `-watermarked`.
- Store placement as normalized center coordinates and use the same geometry for preview and output.
- Batch concurrency is exactly 2; individual failures do not discard successful outputs.
- Pointer dragging is optional input: nine-position presets and numeric X/Y inputs expose the full positioning capability to keyboard users.
- Do not add a watermark editing dependency.

---

### Task 1: Canvas watermark model and service

**Files:**
- Create: `src/services/image/watermarkService.ts`
- Create: `src/services/image/watermarkService.test.ts`

**Interfaces:**
- Consumes: browser `createImageBitmap`, `HTMLCanvasElement`, and existing `FileProcessResult`.
- Produces: `WatermarkOptions`, `WatermarkPosition`, `WatermarkPreset`, `getPresetPosition()`, `constrainPosition()`, `drawWatermark()`, and `applyWatermark()`.

- [ ] **Step 1: Write failing geometry and output tests**

```ts
import { applyWatermark, constrainPosition, getPresetPosition } from "./watermarkService";

it("maps bottom-right to a safe normalized position", () => {
  expect(getPresetPosition("bottom-right")).toEqual({ x: 0.94, y: 0.94 });
});

it("keeps a rotated layer inside the image", () => {
  expect(constrainPosition({ x: 0, y: 0 }, { width: 1000, height: 500 }, { width: 200, height: 40 }, 0))
    .toEqual({ x: 0.1, y: 0.04 });
});

it("preserves source format and adds the filename suffix", async () => {
  const result = await applyWatermark(new File(["pixels"], "photo.webp", { type: "image/webp" }), {
    mode: "text", text: "NexaForge", fontFamily: "sans-serif", color: "#ffffff",
    sizeRatio: 0.08, opacity: 0.7, rotation: 0, position: { x: 0.94, y: 0.94 },
  });
  expect(result.fileName).toBe("photo-watermarked.webp");
  expect(result.mimeType).toBe("image/webp");
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run src/services/image/watermarkService.test.ts`

Expected: FAIL because `watermarkService.ts` does not exist.

- [ ] **Step 3: Implement the model, shared geometry, drawing, resource cleanup, and encoding**

```ts
export type WatermarkPosition = { x: number; y: number };
export type WatermarkPreset = "top-left" | "top-center" | "top-right" | "middle-left" | "center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";
type Shared = { position: WatermarkPosition; opacity: number; rotation: number };
export type TextWatermarkOptions = Shared & { mode: "text"; text: string; fontFamily: string; color: string; sizeRatio: number };
export type ImageWatermarkOptions = Shared & { mode: "image"; logo: File; widthRatio: number };
export type WatermarkOptions = TextWatermarkOptions | ImageWatermarkOptions;

export function getPresetPosition(preset: WatermarkPreset): WatermarkPosition;
export function constrainPosition(position: WatermarkPosition, canvas: Size, layer: Size, rotation: number): WatermarkPosition;
export async function drawWatermark(canvas: HTMLCanvasElement, source: CanvasImageSource, options: WatermarkOptions, logo?: CanvasImageSource): Promise<void>;
export async function applyWatermark(file: File, options: WatermarkOptions): Promise<FileProcessResult>;
```

Clamp finite numeric inputs, calculate the rotated axis-aligned box with `abs(width*cos) + abs(height*sin)`, center the drawing around the normalized position, use `globalAlpha`, and always restore Canvas state. Determine output type only from `image/jpeg`, `image/png`, or `image/webp`; encode JPEG/WebP at `0.92`, PNG without a quality value. Close every source and logo `ImageBitmap` in `finally`.

- [ ] **Step 4: Run the service tests and verify they pass**

Run: `npm test -- --run src/services/image/watermarkService.test.ts`

Expected: PASS for geometry, validation, file naming, MIME preservation, draw calls, and bitmap cleanup.

- [ ] **Step 5: Commit the service**

```powershell
git add -- src/services/image/watermarkService.ts src/services/image/watermarkService.test.ts
git commit -m "feat: add canvas watermark service"
```

---

### Task 2: Accessible live preview editor

**Files:**
- Create: `src/components/WatermarkEditor.tsx`
- Create: `src/components/WatermarkEditor.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `WatermarkOptions`, `WatermarkPreset`, `drawWatermark()`, and a source `File`.
- Produces: controlled `WatermarkEditor({ source, options, onPositionChange })` UI.

- [ ] **Step 1: Write failing component tests**

```tsx
render(<WatermarkEditor source={photo} options={options} onPositionChange={onPositionChange} />);
fireEvent.click(screen.getByRole("button", { name: "Bottom right" }));
expect(onPositionChange).toHaveBeenCalledWith({ x: 0.94, y: 0.94 });

fireEvent.change(screen.getByLabelText("Horizontal position"), { target: { value: "25" } });
expect(onPositionChange).toHaveBeenCalledWith({ x: 0.25, y: options.position.y });
```

Also assert that all nine preset buttons are keyboard-focusable, expose `aria-pressed`, and the preview canvas has an accessible label.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run src/components/WatermarkEditor.test.tsx`

Expected: FAIL because `WatermarkEditor.tsx` does not exist.

- [ ] **Step 3: Implement the controlled Canvas editor**

```ts
export interface WatermarkEditorProps {
  source: File;
  options: WatermarkOptions;
  onPositionChange: (position: WatermarkPosition) => void;
}
```

Use an effect to decode the source and optional logo, size the backing canvas to at most 960 CSS-independent pixels on its longest side, and call `drawWatermark()` with scaled geometry. Use a positioned pointer target over the canvas; on pointer movement convert the client coordinate through `getBoundingClientRect()` to a `0..1` center point. Render a fieldset containing the nine preset buttons plus X and Y range inputs from 0 to 100. Revoke object URLs and close decoded preview bitmaps in cleanup.

- [ ] **Step 4: Add responsive and focus-visible styles**

```css
.watermark-editor { display: grid; gap: var(--space-4); }
.watermark-editor__stage { position: relative; max-width: 100%; touch-action: none; }
.watermark-editor__canvas { display: block; width: 100%; height: auto; border-radius: var(--radius-md); }
.watermark-position-grid { display: grid; grid-template-columns: repeat(3, minmax(2.75rem, 1fr)); gap: .5rem; }
.watermark-position-grid button[aria-pressed="true"] { outline: 2px solid var(--color-primary); outline-offset: 2px; }
```

Use tokens that already exist in `src/styles.css`; if a shown token is absent, select the matching existing spacing, radius, and primary-color token rather than adding a duplicate global token.

- [ ] **Step 5: Run the editor tests and verify they pass**

Run: `npm test -- --run src/components/WatermarkEditor.test.tsx`

Expected: PASS for drawing lifecycle, preset selection, numeric positioning, pointer conversion, labels, and focusability.

- [ ] **Step 6: Commit the editor**

```powershell
git add -- src/components/WatermarkEditor.tsx src/components/WatermarkEditor.test.tsx src/styles.css
git commit -m "feat: add accessible watermark editor"
```

---

### Task 3: Batch watermark page

**Files:**
- Create: `src/pages/image/ImageWatermarkPage.tsx`
- Create: `src/pages/image/ImageWatermarkPage.test.tsx`
- Create: `src/i18n/watermarkMessages.ts`
- Modify: `src/context/LanguageContext.tsx`

**Interfaces:**
- Consumes: `WatermarkEditor`, `applyWatermark()`, `runBatch()`, `BatchFileResults`, `DownloadCollectionButton`, and existing tool-page primitives.
- Produces: complete image-watermark workflow and `WATERMARK_ZH_MESSAGES` / `WATERMARK_EN_MESSAGES`.

- [ ] **Step 1: Write failing workflow tests**

```tsx
renderWithProviders(<ImageWatermarkPage />);
await user.upload(screen.getByLabelText(/選擇檔案/), [photoA, photoB]);
expect(screen.getByText(/已選取 2 個檔案/)).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "套用浮水印" }));
expect(await screen.findByText(/已完成 2\/2/)).toBeInTheDocument();
expect(screen.getByRole("button", { name: /下載全部/ })).toBeEnabled();
```

Add cases for 21 files, a file over `20 * 1024 * 1024`, unsupported MIME, blank text, missing logo, a partial batch failure, all failures, stale result clearing, and the disabled busy state.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- --run src/pages/image/ImageWatermarkPage.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement page validation and state**

```ts
const WATERMARK_MAX_BYTES = 20 * 1024 * 1024;
const WATERMARK_ACCEPT = "image/jpeg,image/png,image/webp";
const DEFAULT_TEXT_OPTIONS: TextWatermarkOptions = {
  mode: "text", text: "© NexaForge", fontFamily: "Arial, sans-serif", color: "#ffffff",
  sizeRatio: 0.08, opacity: 0.7, rotation: 0, position: { x: 0.94, y: 0.94 },
};
```

Maintain separate text and logo option state so switching modes does not discard user input. Validate exact MIME types, per-file size, total count, trimmed text, finite ranges, and logo presence. Every source, logo, mode, or control change increments an operation token and clears previous outputs.

- [ ] **Step 4: Implement the page layout and batch flow**

Use `ToolPageTemplate` with `layout="split"`. The workspace contains the multi-file dropzone, compact file list, mode selector, mode-specific controls, and `WatermarkEditor` after a source is selected. The primary action snapshots the active options and calls:

```ts
const batch = await runBatch(files, (file) => applyWatermark(file, snapshot), {
  concurrency: 2,
  onProgress: (done) => currentOperation === operationRef.current && setCompleted(done),
});
```

Set workflow state to `success` when at least one result succeeds and `error` only when all fail. Render `BatchFileResults` for every attempted item and ZIP only the success results.

- [ ] **Step 5: Add complete Traditional Chinese and English copy**

Export message records containing title, description, mode labels, all controls, nine positions, preview label, validation errors, processing progress, empty result, three how-it-works strings, and two FAQ pairs. Import and spread the records into both locale maps in `LanguageContext.tsx`.

- [ ] **Step 6: Run the page and language tests**

Run: `npm test -- --run src/pages/image/ImageWatermarkPage.test.tsx src/context/LanguageContext.test.tsx`

Expected: PASS for validation, editing, batch state, downloads, bilingual labels, and stale-operation protection.

- [ ] **Step 7: Commit the workflow**

```powershell
git add -- src/pages/image/ImageWatermarkPage.tsx src/pages/image/ImageWatermarkPage.test.tsx src/i18n/watermarkMessages.ts src/context/LanguageContext.tsx
git commit -m "feat: add image watermark workflow"
```

---

### Task 4: Product registration, SEO, and full verification

**Files:**
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/routing/routes.ts` (covered automatically through `FILE_TOOLS`; change only if a failing route test proves an explicit entry is needed)
- Modify: `README.md`

**Interfaces:**
- Consumes: `ImageWatermarkPage` and the existing localized route/index generation.
- Produces: `/image/watermark`, `/en/image/watermark`, searchable tool metadata, prerendered output, and README documentation.

- [ ] **Step 1: Write failing route and discovery assertions**

```ts
expect(FILE_TOOLS).toContainEqual(expect.objectContaining({
  id: "image-watermark", path: "/image/watermark", category: "Image",
}));
expect(BASE_INDEXABLE_ROUTES).toContain("/image/watermark");
expect(INDEXABLE_ROUTES).toContain("/en/image/watermark");
```

Add route render assertions for the Traditional Chinese and English URLs to `App.test.tsx` following the existing lazy-route pattern.

- [ ] **Step 2: Run focused product-registration tests and verify failure**

Run: `npm test -- --run src/App.test.tsx src/routing/localePaths.test.ts src/seo/artifacts.test.ts`

Expected: FAIL because the tool is not registered or routed.

- [ ] **Step 3: Register the tool and routes**

Add this tool definition near the other image tools:

```ts
{
  id: "image-watermark",
  title: "Image Watermark",
  description: "Add a text or logo watermark to images locally in your browser.",
  path: "/image/watermark",
  category: "Image",
  aliases: ["watermark image", "add logo", "圖片浮水印", "圖片加浮水印"],
  keywords: ["image", "watermark", "logo", "copyright", "batch"],
}
```

Lazy-load `ImageWatermarkPage` in `App.tsx` and add `{ path: "/image/watermark", element: <ImageWatermarkPage /> }` beside the image routes. Add “Image Watermark” to the README image-tool list.

- [ ] **Step 4: Run focused tests, the full suite, and production build**

Run: `npm test -- --run src/App.test.tsx src/routing/localePaths.test.ts src/seo/artifacts.test.ts`

Expected: PASS.

Run: `npm test -- --run`

Expected: all tests PASS.

Run: `npm run build`

Expected: TypeScript, client build, SSR build, and prerender all succeed; `dist/image/watermark/index.html` and `dist/en/image/watermark/index.html` exist.

- [ ] **Step 5: Perform browser smoke checks**

Start `npm run dev -- --host 127.0.0.1`, then verify both localized routes, one text watermark, one transparent PNG logo, a mixed-size two-image batch, pointer drag, keyboard X/Y adjustment, individual download, ZIP download, and a mobile-width layout. Stop the dev server afterward.

- [ ] **Step 6: Commit product registration and documentation**

```powershell
git add -- src/data/tools.ts src/App.tsx src/App.test.tsx README.md
git commit -m "feat: publish image watermark tool"
```

- [ ] **Step 7: Record final verification evidence**

Run: `git status --short && git log -5 --oneline`

Expected: clean worktree with the image-watermark commits at the top of `develop`.
