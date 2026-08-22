# Image Crop with Custom Shapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-only image crop tool with live preview, rectangle/circle/heart/star presets, polygon and freehand masks, keyboard editing, transparent PNG output, and verified desktop/mobile behavior.

**Architecture:** A focused `ImageCropEditor` owns canvas interaction while the page owns file and workflow state. Preview and export share normalized stage coordinates, geometry validation, path tracing, and render-plan calculations so the downloaded image matches the preview at source resolution. Browser-only image encoding stays in a small service; all geometry and render calculations remain pure and directly testable.

**Tech Stack:** React 18, TypeScript 5.8, Canvas 2D, Vite 6, Vitest 3, Testing Library, existing NexaForge CSS tokens and localization.

**Spec:** `docs/superpowers/specs/2026-08-22-image-crop-custom-shapes-design.md`

## Global Constraints

- Support one JPG, PNG, or WebP file; use the existing browser-safe file-size limit.
- All processing stays in browser memory; do not add a server, storage, analytics payload containing image data, or third-party image editor dependency.
- Coordinates use a square normalized stage from `0` to `1`; preview and output must call the same geometry and image-transform functions.
- Rectangle output supports JPG, PNG, and WebP. Circle, heart, five-point star, polygon, and freehand output is always transparent PNG.
- A rectangle extending beyond the source uses transparency for PNG/WebP and white fill for JPG; the preview must show the same fill behavior.
- Freehand input samples after at least 2 preview pixels, simplifies with tolerance `0.003`, closes automatically, retains 3–500 points, and remains editable.
- Polygon paths require at least three points, must be closed before processing, and must reject self-intersection.
- Preserve the current routing, page template, localization, SEO, analytics, file validation, visual tokens, and responsive conventions.
- Use strict red-green-refactor: every production behavior begins with a focused failing test that is run and observed before implementation.
- Existing unrelated working-tree changes belong to the user; stage and commit only files named in the current task.

## File Structure

- Create `src/types/imageCrop.ts`: public crop state, shape, validation, render-plan, and editor prop types.
- Create `src/utils/imageCropGeometry.ts`: pure preset paths, validation, simplification, normalized image mapping, render-plan calculation, and Canvas path tracing.
- Create `src/utils/imageCropGeometry.test.ts`: literal, hand-derived geometry cases.
- Create `src/services/image/cropService.ts`: bitmap lifecycle, Canvas drawing, format selection, serialization, and result naming.
- Create `src/services/image/cropService.test.ts`: service contract tests with browser-boundary fakes.
- Create `src/components/ImageCropEditor.tsx`: source preview, preset manipulation, custom drawing, history, node list, keyboard interaction, and live status.
- Create `src/components/ImageCropEditor.test.tsx`: user-observable editor interaction tests.
- Create `src/pages/image/CropPage.tsx`: file/workflow state, validation, processing, result preview, content, and analytics.
- Create `src/pages/image/CropPage.test.tsx`: primary, invalid, pending, failure, and recovery flow tests.
- Modify `src/data/tools.ts`: register the image crop tool.
- Modify `src/App.tsx`: register route and landing visual; give every tool page a stable tool-id modifier class.
- Modify `src/App.test.tsx`: assert the real crop route, heading, canonical metadata, and landing visual.
- Modify `src/context/LanguageContext.tsx`: add complete Traditional Chinese and English crop copy.
- Modify `src/styles.css`: add editor, controls, checkerboard, focus, selected, error, and responsive rules scoped to image crop.

---

### Task 1: Crop domain types and normalized preset geometry

**Files:**
- Create: `src/types/imageCrop.ts`
- Create: `src/utils/imageCropGeometry.ts`
- Test: `src/utils/imageCropGeometry.test.ts`

**Interfaces:**
- Consumes: no new feature interfaces.
- Produces: `CropShapeKind`, `CropPoint`, `CropBounds`, `CropShape`, `ImageTransform`, `CropSettings`, `CropValidation`, `CropRenderPlan`, `ImageCropResult`, `createDefaultCropSettings()`, `getCropBounds()`, `validateCropShape(shape, imageBounds?)`, `getImageStageBounds()`, `stagePointToSource()`, and `createCropRenderPlan()`.

- [ ] **Step 1: Write failing tests for defaults, preset bounds, source mapping, and literal render dimensions**

```ts
import { describe, expect, it } from "vitest";
import {
  createCropRenderPlan,
  createDefaultCropSettings,
  getCropBounds,
  getImageStageBounds,
  stagePointToSource,
  validateCropShape,
} from "./imageCropGeometry";

describe("image crop geometry", () => {
  it("centers the default rectangle over 80 percent of the stage", () => {
    expect(createDefaultCropSettings()).toEqual({
      shape: { kind: "rectangle", bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } },
      imageTransform: { offsetX: 0, offsetY: 0, scale: 1 },
      format: "png",
      quality: 0.9,
    });
  });

  it("fits a landscape image into the normalized stage", () => {
    expect(getImageStageBounds(1600, 800, { offsetX: 0, offsetY: 0, scale: 1 })).toEqual({
      x: 0,
      y: 0.25,
      width: 1,
      height: 0.5,
    });
  });

  it("maps the stage center to the source center after a normalized offset", () => {
    expect(stagePointToSource(
      { x: 0.6, y: 0.55 },
      1000,
      500,
      { offsetX: 0.1, offsetY: 0.05, scale: 1 }
    )).toEqual({ x: 500, y: 250 });
  });

  it("creates a source-resolution render plan from a hand-derived square crop", () => {
    const plan = createCropRenderPlan(1000, 500, {
      shape: { kind: "rectangle", bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } },
      imageTransform: { offsetX: 0, offsetY: 0, scale: 1 },
      format: "png",
      quality: 0.9,
    });
    expect(plan).toMatchObject({
      outputWidth: 500,
      outputHeight: 500,
      mimeType: "image/png",
      background: null,
      imageDestination: { x: -250, y: 0, width: 1000, height: 500 },
    });
  });

  it("reports a rectangle below the five-percent minimum as invalid", () => {
    expect(validateCropShape({
      kind: "rectangle",
      bounds: { x: 0.1, y: 0.1, width: 0.04, height: 0.5 },
    })).toEqual({ valid: false, reason: "shape-too-small" });
  });

  it("reports a shape with no image intersection when image bounds are supplied", () => {
    expect(validateCropShape(
      { kind: "rectangle", bounds: { x: 0.8, y: 0.8, width: 0.1, height: 0.1 } },
      { x: 0, y: 0, width: 0.5, height: 0.5 }
    )).toEqual({ valid: false, reason: "outside-image" });
  });

  it.each(["circle", "heart", "star"] as const)("uses bounds for the %s preset", (kind) => {
    expect(getCropBounds({ kind, bounds: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 } }))
      .toEqual({ x: 0.2, y: 0.2, width: 0.6, height: 0.6 });
  });
});
```

- [ ] **Step 2: Run the geometry test and observe the expected RED state**

Run: `npm test -- --run src/utils/imageCropGeometry.test.ts`

Expected: FAIL because `src/utils/imageCropGeometry.ts` and its exports do not exist.

- [ ] **Step 3: Add exact crop types**

```ts
// src/types/imageCrop.ts
export type CropShapeKind = "rectangle" | "circle" | "heart" | "star" | "polygon" | "freehand";
export type CropFormat = "jpeg" | "png" | "webp";
export type CropValidationReason =
  | "shape-too-small"
  | "not-enough-points"
  | "shape-not-closed"
  | "self-intersection"
  | "outside-image";

export interface CropPoint { x: number; y: number }
export interface CropBounds { x: number; y: number; width: number; height: number }
export interface CropShape {
  kind: CropShapeKind;
  bounds?: CropBounds;
  points?: CropPoint[];
  closed?: boolean;
}
export interface ImageTransform { offsetX: number; offsetY: number; scale: number }
export interface CropSettings {
  shape: CropShape;
  imageTransform: ImageTransform;
  format: CropFormat;
  quality: number;
}
export interface CropValidation { valid: boolean; reason?: CropValidationReason }
export interface CropRenderPlan {
  outputWidth: number;
  outputHeight: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  quality: number;
  background: "#ffffff" | null;
  shapeBounds: CropBounds;
  pixelsPerStageUnit: number;
  imageDestination: CropBounds;
}
export interface ImageCropResult extends FileProcessResult {
  width: number;
  height: number;
}
```

Import `FileProcessResult` from `src/types/tool.ts` for `ImageCropResult`; do not change the shared result contract used by unrelated tools.

- [ ] **Step 4: Implement minimal normalized geometry**

Implement these rules in `src/utils/imageCropGeometry.ts`:

```ts
export const DEFAULT_PRESET_BOUNDS = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } as const;

export function createDefaultCropSettings(): CropSettings {
  return {
    shape: { kind: "rectangle", bounds: { ...DEFAULT_PRESET_BOUNDS } },
    imageTransform: { offsetX: 0, offsetY: 0, scale: 1 },
    format: "png",
    quality: 0.9,
  };
}

export function getImageStageBounds(
  sourceWidth: number,
  sourceHeight: number,
  transform: ImageTransform
): CropBounds {
  const aspect = sourceWidth / sourceHeight;
  const fittedWidth = aspect >= 1 ? 1 : aspect;
  const fittedHeight = aspect >= 1 ? 1 / aspect : 1;
  const width = fittedWidth * transform.scale;
  const height = fittedHeight * transform.scale;
  return {
    x: (1 - width) / 2 + transform.offsetX,
    y: (1 - height) / 2 + transform.offsetY,
    width,
    height,
  };
}

export function stagePointToSource(
  point: CropPoint,
  sourceWidth: number,
  sourceHeight: number,
  transform: ImageTransform
): CropPoint {
  const image = getImageStageBounds(sourceWidth, sourceHeight, transform);
  return {
    x: ((point.x - image.x) / image.width) * sourceWidth,
    y: ((point.y - image.y) / image.height) * sourceHeight,
  };
}
```

For `validateCropShape(shape, imageBounds?)`, validate shape-local rules first and, when image bounds are supplied, require the shape bounds to intersect the image bounds. For `createCropRenderPlan`, derive `pixelsPerStageUnit = sourceWidth / imageBounds.width`, round output dimensions to at least one pixel, force non-rectangle MIME to PNG, clamp quality to `0..1`, and set `background` to white only when rectangle/JPEG is selected. For invalid geometry, throw an Error whose message is exactly `Invalid crop shape: ${reason}`.

- [ ] **Step 5: Run tests and refactor without changing behavior**

Run: `npm test -- --run src/utils/imageCropGeometry.test.ts`

Expected: PASS with no warnings.

- [ ] **Step 6: Commit the domain and base geometry**

```powershell
git add -- src/types/imageCrop.ts src/utils/imageCropGeometry.ts src/utils/imageCropGeometry.test.ts
git commit -m "feat: add normalized image crop geometry"
```

---

### Task 2: Polygon validation, freehand simplification, and shared path tracing

**Files:**
- Modify: `src/utils/imageCropGeometry.ts`
- Modify: `src/utils/imageCropGeometry.test.ts`

**Interfaces:**
- Consumes: crop types and normalized geometry from Task 1.
- Produces: `segmentsIntersect()`, `hasSelfIntersection()`, `simplifyFreehandPoints()`, `traceCropPath()`, and complete `getCropBounds()` / `validateCropShape()` behavior for custom paths.

- [ ] **Step 1: Add failing literal tests for self-intersection, closure, simplification, bounds, and path commands**

```ts
it("rejects a bow-tie polygon because its non-adjacent edges cross", () => {
  expect(validateCropShape({
    kind: "polygon",
    closed: true,
    points: [
      { x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 },
      { x: 0.9, y: 0.1 }, { x: 0.1, y: 0.9 },
    ],
  })).toEqual({ valid: false, reason: "self-intersection" });
});

it("requires a polygon to be explicitly closed", () => {
  expect(validateCropShape({
    kind: "polygon",
    closed: false,
    points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.5, y: 0.9 }],
  })).toEqual({ valid: false, reason: "shape-not-closed" });
});

it("simplifies a straight freehand run while preserving its endpoints and closure", () => {
  expect(simplifyFreehandPoints([
    { x: 0, y: 0 }, { x: 0.25, y: 0 }, { x: 0.5, y: 0 },
    { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  ], 0.003, 500)).toEqual([
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  ]);
});

it("calculates a literal tight bound for custom points", () => {
  expect(getCropBounds({
    kind: "freehand",
    closed: true,
    points: [{ x: 0.2, y: 0.4 }, { x: 0.8, y: 0.3 }, { x: 0.6, y: 0.9 }],
  })).toEqual({ x: 0.2, y: 0.3, width: 0.6, height: 0.6 });
});
```

- [ ] **Step 2: Run the test and observe failures caused by missing custom-path behavior**

Run: `npm test -- --run src/utils/imageCropGeometry.test.ts`

Expected: FAIL on the new polygon/freehand assertions.

- [ ] **Step 3: Implement robust custom path geometry**

Use orientation/cross-product segment intersection while excluding adjacent polygon edges. Implement Ramer–Douglas–Peucker simplification with squared distances, then uniformly thin only if more than `maxPoints` remain. Clamp stored points to a practical editing range of `-1..2` so slightly off-stage shapes remain possible without unbounded values.

Expose path tracing as behavior over the real Canvas interface:

```ts
export function traceCropPath(
  context: Pick<CanvasRenderingContext2D, "moveTo" | "lineTo" | "bezierCurveTo" | "ellipse" | "rect" | "closePath">,
  shape: CropShape,
  mapPoint: (point: CropPoint) => CropPoint
): void;
```

Rules:

- Rectangle uses `rect`.
- Circle uses `ellipse` centered in bounds with half-width/half-height radii.
- Heart uses four cubic Bézier segments inside bounds and closes the path.
- Five-point star alternates outer radius `0.5 * bounds.width` and inner radius `0.2245 * bounds.width`, begins at `-Math.PI / 2`, and closes.
- Polygon/freehand calls `moveTo` for the first mapped point, `lineTo` for each remaining point, and `closePath` only when `closed` is true.

- [ ] **Step 4: Run geometry tests and add a mutation check for adjacent-edge handling**

Run: `npm test -- --run src/utils/imageCropGeometry.test.ts`

Expected: PASS. Confirm a normal four-corner rectangle polygon remains valid, proving adjacent shared endpoints are not treated as intersections.

- [ ] **Step 5: Commit custom geometry**

```powershell
git add -- src/utils/imageCropGeometry.ts src/utils/imageCropGeometry.test.ts
git commit -m "feat: add custom crop path geometry"
```

---

### Task 3: Source-resolution crop rendering service

**Files:**
- Create: `src/services/image/cropService.ts`
- Create: `src/services/image/cropService.test.ts`

**Interfaces:**
- Consumes: `CropSettings`, `createCropRenderPlan()`, and `traceCropPath()`.
- Produces: `cropImage(file: File, settings: CropSettings): Promise<ImageCropResult>`.

- [ ] **Step 1: Write failing service contract tests**

Install no Canvas package. Fake only the unavailable jsdom browser boundary: `createImageBitmap`, `document.createElement("canvas")`, Canvas 2D methods, and `canvas.toBlob`. Assert returned behavior rather than the existence of the fake.

Define the boundary fakes in the test file so every referenced value is concrete:

```ts
const context = {
  beginPath: vi.fn(), clearRect: vi.fn(), clip: vi.fn(), closePath: vi.fn(),
  drawImage: vi.fn(), ellipse: vi.fn(), fillRect: vi.fn(), lineTo: vi.fn(),
  moveTo: vi.fn(), rect: vi.fn(), restore: vi.fn(), save: vi.fn(),
  bezierCurveTo: vi.fn(), fillStyle: "",
};
const bitmap = { width: 1000, height: 500, close: vi.fn() } as unknown as ImageBitmap;
const canvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => context),
  toBlob: vi.fn((callback: BlobCallback, type?: string) => {
    callback(new Blob(["cropped"], { type: type ?? "image/png" }));
  }),
} as unknown as HTMLCanvasElement;
const validFile = new File(["source"], "photo.png", { type: "image/png" });
const validSettings: CropSettings = {
  shape: { kind: "rectangle", bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } },
  imageTransform: { offsetX: 0, offsetY: 0, scale: 1 },
  format: "png",
  quality: 0.9,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
  vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
    if (tagName.toLowerCase() === "canvas") return canvas;
    return document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
  }) as typeof document.createElement);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
```

```ts
it("returns a transparent PNG contract for a circular crop and closes the bitmap", async () => {
  const file = new File(["source"], "avatar.webp", { type: "image/webp" });
  const result = await cropImage(file, {
    shape: { kind: "circle", bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } },
    imageTransform: { offsetX: 0, offsetY: 0, scale: 1 },
    format: "jpeg",
    quality: 0.4,
  });
  expect(result).toEqual({
    blob: expect.any(Blob),
    fileName: "avatar-cropped.png",
    mimeType: "image/png",
    size: result.blob.size,
    width: 500,
    height: 500,
  });
  expect(result.blob.type).toBe("image/png");
  expect(bitmap.close).toHaveBeenCalledOnce();
});

it("returns JPG with a cropped name for a rectangle", async () => {
  const result = await cropImage(
    new File(["source"], "photo.png", { type: "image/png" }),
    {
      shape: { kind: "rectangle", bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } },
      imageTransform: { offsetX: 0, offsetY: 0, scale: 1 },
      format: "jpeg",
      quality: 0.75,
    }
  );
  expect(result.fileName).toBe("photo-cropped.jpg");
  expect(result.mimeType).toBe("image/jpeg");
});

it("closes the bitmap when canvas serialization fails", async () => {
  vi.mocked(canvas.toBlob).mockImplementation((callback: BlobCallback) => callback(null));
  await expect(cropImage(validFile, validSettings)).rejects.toThrow("Unable to serialize cropped image.");
  expect(bitmap.close).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the service test and observe the missing-module failure**

Run: `npm test -- --run src/services/image/cropService.test.ts`

Expected: FAIL because `cropService.ts` does not exist.

- [ ] **Step 3: Implement the crop rendering lifecycle**

```ts
export async function cropImage(file: File, settings: CropSettings): Promise<FileProcessResult> {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width <= 0 || bitmap.height <= 0) throw new Error("Image has no drawable pixels.");
    const plan = createCropRenderPlan(bitmap.width, bitmap.height, settings);
    const canvas = document.createElement("canvas");
    canvas.width = plan.outputWidth;
    canvas.height = plan.outputHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable.");

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (plan.background) {
      context.fillStyle = plan.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.save();
    context.beginPath();
    traceCropPath(context, settings.shape, (point) => ({
      x: (point.x - plan.shapeBounds.x) * plan.pixelsPerStageUnit,
      y: (point.y - plan.shapeBounds.y) * plan.pixelsPerStageUnit,
    }));
    context.clip();
    context.drawImage(
      bitmap,
      plan.imageDestination.x,
      plan.imageDestination.y,
      plan.imageDestination.width,
      plan.imageDestination.height
    );
    context.restore();

    const blob = await canvasToBlob(canvas, plan.mimeType, plan.quality);
    return {
      blob,
      fileName: croppedFileName(file.name, plan.mimeType),
      mimeType: plan.mimeType,
      size: blob.size,
      width: plan.outputWidth,
      height: plan.outputHeight,
    };
  } finally {
    bitmap.close();
  }
}
```

`canvasToBlob` must reject with `Unable to serialize cropped image.` when callback receives null. `croppedFileName` strips one final extension and maps MIME to `.jpg`, `.png`, or `.webp`.

- [ ] **Step 4: Run service and geometry tests**

Run: `npm test -- --run src/services/image/cropService.test.ts src/utils/imageCropGeometry.test.ts`

Expected: PASS; no bitmap-lifecycle or console warnings.

- [ ] **Step 5: Commit the rendering service**

```powershell
git add -- src/services/image/cropService.ts src/services/image/cropService.test.ts
git commit -m "feat: render source-resolution image crops"
```

---

### Task 4: Editor preview, presets, image movement, and output controls

**Files:**
- Create: `src/components/ImageCropEditor.tsx`
- Create: `src/components/ImageCropEditor.test.tsx`
- Modify: `src/types/imageCrop.ts`

**Interfaces:**
- Consumes: `CropSettings`, `createDefaultCropSettings()`, `getImageStageBounds()`, `traceCropPath()`, and `validateCropShape()`.
- Produces: `ImageCropEditorProps` and a controlled editor that emits complete `CropSettings` plus `CropValidation`.

Define the editor boundary exactly:

```ts
export interface ImageCropEditorProps {
  sourceUrl: string;
  fileName: string;
  value: CropSettings;
  onChange: (next: CropSettings) => void;
  onValidationChange: (validation: CropValidation) => void;
  onSourceStatusChange: (status: "loading" | "ready" | "error") => void;
  labels: {
    canvas: string;
    presets: string;
    rectangle: string;
    circle: string;
    heart: string;
    star: string;
    polygon: string;
    freehand: string;
    zoom: string;
    undo: string;
    reset: string;
  };
}
```

- [ ] **Step 1: Write failing interaction tests for real visible behavior**

Define a stateful harness so tests exercise controlled-component behavior rather than asserting against a static prop fixture:

```tsx
const labels: ImageCropEditorProps["labels"] = {
  canvas: "Crop preview", presets: "Preset shapes", rectangle: "Rectangle",
  circle: "Circle", heart: "Heart", star: "Star", polygon: "Polygon",
  freehand: "Freehand", zoom: "Zoom", undo: "Undo", reset: "Reset",
};
let onChange: ReturnType<typeof vi.fn>;
let onValidationChange: ReturnType<typeof vi.fn>;
let onSourceStatusChange: ReturnType<typeof vi.fn>;

function EditorHarness({ initial = createDefaultCropSettings() }: { initial?: CropSettings }) {
  const [value, setValue] = useState(initial);
  return (
    <ImageCropEditor
      sourceUrl="blob:sample"
      fileName="sample.png"
      value={value}
      onChange={(next) => { setValue(next); onChange(next); }}
      onValidationChange={onValidationChange}
      onSourceStatusChange={onSourceStatusChange}
      labels={labels}
    />
  );
}

function loadSource(width = 1200, height = 800): void {
  const image = screen.getByTestId("crop-source-image");
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: width },
    naturalHeight: { configurable: true, value: height },
  });
  fireEvent.load(image);
}

beforeEach(() => {
  onChange = vi.fn();
  onValidationChange = vi.fn();
  onSourceStatusChange = vi.fn();
});
```

```tsx
it("shows a named preview and changes to a transparent PNG circle", () => {
  render(<EditorHarness />);
  loadSource();
  fireEvent.click(screen.getByRole("button", { name: "Circle" }));
  expect(screen.getByRole("img", { name: "Crop preview" })).toBeInTheDocument();
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    shape: expect.objectContaining({ kind: "circle" }),
    format: "png",
  }));
});

it("moves the image with keyboard arrows and a larger shift step", () => {
  render(<EditorHarness />);
  loadSource();
  const canvas = screen.getByRole("img", { name: "Crop preview" });
  fireEvent.keyDown(canvas, { key: "ArrowRight" });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    imageTransform: expect.objectContaining({ offsetX: 0.005 }),
  }));
  fireEvent.keyDown(canvas, { key: "ArrowDown", shiftKey: true });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    imageTransform: expect.objectContaining({ offsetY: 0.025 }),
  }));
});

it("moves the image by normalized pointer distance", () => {
  render(<EditorHarness />);
  loadSource();
  const canvas = screen.getByRole("img", { name: "Crop preview" }) as HTMLCanvasElement;
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 200,
    width: 200, height: 200, toJSON: () => ({}),
  });
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 120, clientY: 110 });
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 120, clientY: 110 });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    imageTransform: expect.objectContaining({ offsetX: 0.1, offsetY: 0.05 }),
  }));
});

it("shows the zoom value and emits a scale change", () => {
  render(<EditorHarness />);
  loadSource();
  fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), { target: { value: "150" } });
  expect(screen.getByText("150%")).toBeInTheDocument();
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    imageTransform: expect.objectContaining({ scale: 1.5 }),
  }));
});

it("resizes a circle proportionally from a keyboard-operable handle", () => {
  render(<EditorHarness />);
  loadSource();
  fireEvent.click(screen.getByRole("button", { name: "Circle" }));
  fireEvent.keyDown(screen.getByRole("button", { name: "Resize shape southeast" }), {
    key: "ArrowRight",
  });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    shape: expect.objectContaining({
      kind: "circle",
      bounds: { x: 0.1, y: 0.1, width: 0.805, height: 0.805 },
    }),
  }));
});

it("announces source readiness and decode failure", () => {
  const { rerender } = render(<EditorHarness />);
  loadSource();
  expect(onSourceStatusChange).toHaveBeenLastCalledWith("ready");
  rerender(<EditorHarness />);
  fireEvent.error(screen.getByTestId("crop-source-image"));
  expect(onSourceStatusChange).toHaveBeenLastCalledWith("error");
});
```

The production change each test catches is, respectively: wrong shape/format branch, missing keyboard movement, and disconnected zoom feedback.

- [ ] **Step 2: Run the editor test and observe RED**

Run: `npm test -- --run src/components/ImageCropEditor.test.tsx`

Expected: FAIL because the editor component does not exist.

- [ ] **Step 3: Implement the controlled preview and preset controls**

Use a wrapper with a visible Canvas plus an `<img data-testid="crop-source-image" alt="" aria-hidden="true">` used only for decoding/drawing. Give Canvas `role="img"`, `aria-label={labels.canvas}`, `tabIndex={0}`, and a text status describing selected shape and zoom. On every draw:

1. Clear the preview Canvas.
2. Draw the checkerboard/background matching the selected format.
3. Draw the image using `getImageStageBounds()` scaled to Canvas pixels.
4. Draw a semi-transparent overlay across the stage.
5. Trace the selected path and use `globalCompositeOperation = "destination-out"` to reveal the kept region.
6. Restore normal compositing and draw a visible, non-color-only shape outline/handles.

Use pointer capture for image dragging. Convert pointer deltas to normalized stage deltas. Clamp zoom slider to `100..400`, mapping to scale `1..4`; arrow step is `0.005`, Shift+arrow step is `0.025`.

Shape buttons are semantic buttons with `aria-pressed`. Selecting non-rectangle forces `format: "png"`. Preserve format when selecting rectangle only if it is already valid; otherwise default to PNG.

Preset bounds use focusable handle buttons layered over Canvas. Rectangle exposes north, east, south, west, and four corner handles; circle, heart, and star expose four corner handles and preserve a 1:1 bound. Pointer drag updates at interaction time; arrow keys change the relevant edge by `0.005`, Shift+arrow by `0.025`. Clamp preset bounds to `-1..2` and minimum size `0.05`.

Call `onSourceStatusChange("loading")` when `sourceUrl` changes, `ready` after a nonzero natural size loads, and `error` on image error or zero natural dimensions. Once ready, call `onValidationChange(validateCropShape(value.shape, getImageStageBounds(naturalWidth, naturalHeight, value.imageTransform)))` so shapes entirely outside the source are disabled before processing.

- [ ] **Step 4: Run the focused editor tests**

Run: `npm test -- --run src/components/ImageCropEditor.test.tsx`

Expected: PASS with no React act or accessibility warnings.

- [ ] **Step 5: Commit preset editor behavior**

```powershell
git add -- src/types/imageCrop.ts src/components/ImageCropEditor.tsx src/components/ImageCropEditor.test.tsx
git commit -m "feat: add accessible crop preview editor"
```

---

### Task 5: Polygon/freehand editing, history, node keyboard controls, and validation feedback

**Files:**
- Modify: `src/components/ImageCropEditor.tsx`
- Modify: `src/components/ImageCropEditor.test.tsx`

**Interfaces:**
- Consumes: the controlled editor from Task 4 and custom geometry from Task 2.
- Produces: complete custom-shape editing with an internal history of user-emitted settings and accessible node controls.

- [ ] **Step 1: Add failing tests for polygon closure, freehand conversion, node keyboard editing, undo, reset, and inline validity**

Use the `EditorHarness`, `loadSource`, and spies defined in Task 4, plus these literal pointer helpers:

```tsx
function setStageRect(): HTMLCanvasElement {
  const canvas = screen.getByRole("img", { name: "Crop preview" }) as HTMLCanvasElement;
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 200,
    width: 200, height: 200, toJSON: () => ({}),
  });
  return canvas;
}

function addCanvasPoint(x: number, y: number): void {
  const canvas = setStageRect();
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: x * 200, clientY: y * 200 });
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: x * 200, clientY: y * 200 });
}

function drawFreehand(points: Array<[number, number]>): void {
  const canvas = setStageRect();
  const [first, ...rest] = points;
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: first[0], clientY: first[1] });
  rest.forEach(([clientX, clientY]) => {
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX, clientY });
  });
  const last = points[points.length - 1];
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: last[0], clientY: last[1] });
}
```

```tsx
it("keeps crop unavailable until a three-point polygon is closed", () => {
  render(<EditorHarness />);
  loadSource();
  fireEvent.click(screen.getByRole("button", { name: "Polygon" }));
  addCanvasPoint(0.2, 0.2);
  addCanvasPoint(0.8, 0.2);
  expect(screen.getByRole("status")).toHaveTextContent("Add at least 3 points");
  addCanvasPoint(0.5, 0.8);
  expect(screen.getByRole("status")).toHaveTextContent("Close the shape");
  fireEvent.click(screen.getByRole("button", { name: "Close shape" }));
  expect(onValidationChange).toHaveBeenLastCalledWith({ valid: true });
});

it("turns a completed freehand gesture into editable coordinate rows", () => {
  render(<EditorHarness />);
  loadSource();
  fireEvent.click(screen.getByRole("button", { name: "Freehand" }));
  drawFreehand([[20, 20], [100, 20], [100, 100], [20, 100]]);
  expect(screen.getAllByRole("group", { name: /Point \d+/ }).length).toBeGreaterThanOrEqual(3);
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    shape: expect.objectContaining({ kind: "freehand", closed: true }),
  }));
});

it("moves a focused node and deletes it with the keyboard", () => {
  render(<EditorHarness initial={{
    ...createDefaultCropSettings(),
    shape: {
      kind: "polygon",
      closed: true,
      points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.5, y: 0.8 }],
    },
  }} />);
  loadSource();
  const firstNode = screen.getByRole("button", { name: "Point 1" });
  fireEvent.keyDown(firstNode, { key: "ArrowRight" });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    shape: expect.objectContaining({ points: expect.arrayContaining([{ x: 0.205, y: 0.2 }]) }),
  }));
  fireEvent.keyDown(firstNode, { key: "Delete" });
  expect(screen.queryByRole("button", { name: "Point 3" })).not.toBeInTheDocument();
});

it("undoes the last edit and reset restores the centered rectangle", () => {
  render(<EditorHarness />);
  loadSource();
  fireEvent.click(screen.getByRole("button", { name: "Circle" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ shape: expect.objectContaining({ kind: "rectangle" }) }));
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(onChange).toHaveBeenLastCalledWith(createDefaultCropSettings());
});
```

- [ ] **Step 2: Run the editor test and observe custom-editing failures**

Run: `npm test -- --run src/components/ImageCropEditor.test.tsx`

Expected: FAIL because polygon/freehand/history controls are absent.

- [ ] **Step 3: Implement pointer drawing and accessible node editing**

Maintain a bounded history of the last 50 distinct `CropSettings` snapshots. Push only at interaction boundaries: shape selection, pointer-up, node keyboard key-up, coordinate field commit, close shape, and format change. Undo emits the previous snapshot; reset emits `createDefaultCropSettings()` and clears history.

Custom shape behavior:

- Polygon pointer click appends a normalized point.
- Clicking within 12 CSS pixels of the first point closes a polygon with at least three points; the explicit `Close shape` button provides the same action.
- Freehand pointer-down starts points, pointer-move samples only after a 2-pixel distance, and pointer-up calls `simplifyFreehandPoints(points, 0.003, 500)` and sets `closed: true`.
- Render each node as a real absolutely-positioned button over Canvas named `Point N`; drag it with pointer capture, move with arrows by `0.005` or Shift+arrows by `0.025`, and delete with Delete/Backspace.
- Render a coordinate list below Canvas. Each row is a `role="group"` named `Point N`, with labeled X/Y number inputs expressed as `0..100` percent. An `Add point` button appends `{ x: 0.5, y: 0.5 }`.
- Use a nearby `role="status"` for actionable validity text. Call `onValidationChange(validateCropShape(value.shape))` whenever shape changes.

- [ ] **Step 4: Run editor and geometry tests**

Run: `npm test -- --run src/components/ImageCropEditor.test.tsx src/utils/imageCropGeometry.test.ts`

Expected: PASS; invalid/self-intersecting paths remain editable and expose a textual reason.

- [ ] **Step 5: Commit complete editor interactions**

```powershell
git add -- src/components/ImageCropEditor.tsx src/components/ImageCropEditor.test.tsx
git commit -m "feat: edit polygon and freehand crop masks"
```

---

### Task 6: Crop page workflow, error recovery, result preview, and object URL lifecycle

**Files:**
- Create: `src/pages/image/CropPage.tsx`
- Create: `src/pages/image/CropPage.test.tsx`

**Interfaces:**
- Consumes: `FileDropzone`, `FileInfo`, `ImageCropEditor`, `DownloadButton`, `SizeComparison`, `useBlobUrl`, `cropImage()`, `validateMime()`, and `validateFileSize()`.
- Produces: `ImageCropPage(): JSX.Element` for route registration.

- [ ] **Step 1: Write failing page tests for primary flow and recoverable states**

Define the real provider/router harness and selected-file helper in the test file:

```tsx
function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

function renderCropPageWithSelectedFile(): ReturnType<typeof render> {
  const rendered = renderWithRouter(<ImageCropPage />);
  const input = rendered.container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(["image"], "sample.png", { type: "image/png" })] },
  });
  const image = screen.getByTestId("crop-source-image");
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 1200 },
    naturalHeight: { configurable: true, value: 800 },
  });
  fireEvent.load(image);
  return rendered;
}

type MutableUrlApi = typeof URL & {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};
const urlApi = URL as MutableUrlApi;
const originalCreateObjectURL = urlApi.createObjectURL;
const originalRevokeObjectURL = urlApi.revokeObjectURL;

beforeEach(() => {
  let sequence = 0;
  urlApi.createObjectURL = vi.fn(() => `blob:crop-${++sequence}`);
  urlApi.revokeObjectURL = vi.fn();
});

afterEach(() => {
  urlApi.createObjectURL = originalCreateObjectURL;
  urlApi.revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks();
});
```

```tsx
it("shows a live editor after selecting an image", async () => {
  const { container } = renderWithRouter(<ImageCropPage />);
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(["image"], "sample.png", { type: "image/png" })] } });
  expect(await screen.findByRole("img", { name: "Crop preview" })).toBeInTheDocument();
  const image = screen.getByTestId("crop-source-image");
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 1200 },
    naturalHeight: { configurable: true, value: 800 },
  });
  fireEvent.load(image);
  expect(screen.getByRole("button", { name: "Crop image" })).toBeEnabled();
});

it("disables processing and explains an invalid polygon", async () => {
  renderCropPageWithSelectedFile();
  fireEvent.click(screen.getByRole("button", { name: "Polygon" }));
  expect(screen.getByRole("button", { name: "Crop image" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Add at least 3 points");
});

it("keeps the editor and disables duplicate submission while processing", async () => {
  vi.spyOn(cropService, "cropImage").mockImplementation(() => new Promise<ImageCropResult>(() => {}));
  renderCropPageWithSelectedFile();
  fireEvent.click(screen.getByRole("button", { name: "Crop image" }));
  expect(await screen.findByRole("button", { name: "Cropping..." })).toBeDisabled();
  expect(screen.getByRole("img", { name: "Crop preview" })).toBeInTheDocument();
});

it("preserves crop controls and offers retry after processing fails", async () => {
  vi.spyOn(cropService, "cropImage").mockRejectedValue(new Error("failure"));
  renderCropPageWithSelectedFile();
  fireEvent.click(screen.getByRole("button", { name: "Crop image" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to crop this image");
  expect(screen.getByRole("img", { name: "Crop preview" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
});

it("keeps processing disabled and shows a recoverable decode error", () => {
  const rendered = renderWithRouter(<ImageCropPage />);
  const input = rendered.container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(["bad"], "bad.png", { type: "image/png" })] } });
  fireEvent.error(screen.getByTestId("crop-source-image"));
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to decode this image");
  expect(screen.getByRole("button", { name: "Crop image" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Clear all" })).toBeEnabled();
});
```

- [ ] **Step 2: Run the page test and observe RED**

Run: `npm test -- --run src/pages/image/CropPage.test.tsx`

Expected: FAIL because `CropPage.tsx` does not exist.

- [ ] **Step 3: Implement page-owned workflow state**

Use these state owners:

```ts
const [files, setFiles] = useState<File[]>([]);
const [settings, setSettings] = useState<CropSettings>(createDefaultCropSettings);
const [validation, setValidation] = useState<CropValidation>({ valid: true });
const [sourceStatus, setSourceStatus] = useState<"loading" | "ready" | "error">("loading");
const [processing, setProcessing] = useState<ProcessingState>("idle");
const [result, setResult] = useState<ImageCropResult | null>(null);
const [error, setError] = useState<string | null>(null);
const sourceUrl = useBlobUrl(files[0]);
const resultUrl = useBlobUrl(result?.blob);
```

When a new accepted file arrives, clear result/error, reset settings, keep the page workflow at `idle`, and set source status to `loading`. Pass `setSourceStatus` to the editor. While source status is loading, show localized decoding feedback and keep the crop button disabled. On source error, show a nearby `role="alert"`, retain the selected file, and keep Clear/replace available. `handleProcess` revalidates MIME/size/shape, sets `processing`, calls `cropImage(files[0], settings)`, then sets success/result or error while retaining file/settings. Clearing the file resets all page state and lets both `useBlobUrl` instances revoke prior URLs.

Render format and quality controls in page options:

- Rectangle: JPG/PNG/WebP format select. Show quality for JPG/WebP only.
- Non-rectangle: read-only text `Transparent PNG`; do not expose a misleading format select or quality slider.
- The primary button is disabled when no file, source status is not ready, shape is invalid, or processing is active. Its label is `Crop image` / `Cropping...`.

Use `ToolPageTemplate.workflow` for processing/error/success. The result section uses the actual `resultUrl`, `SizeComparison`, a visible localized `width × height px` line sourced from `ImageCropResult`, and `DownloadButton`. Keep editor visible in workspace during pending/error/success states.

- [ ] **Step 4: Add success and lifecycle tests**

Add a success fixture returning a real Blob and assert the visible result image, pixel dimensions, and enabled download button:

```tsx
it("shows the encoded result dimensions and enables download", async () => {
  const blob = new Blob(["cropped"], { type: "image/png" });
  vi.spyOn(cropService, "cropImage").mockResolvedValue({
    blob,
    fileName: "sample-cropped.png",
    mimeType: "image/png",
    size: blob.size,
    width: 400,
    height: 400,
  });
  renderCropPageWithSelectedFile();
  fireEvent.click(screen.getByRole("button", { name: "Crop image" }));
  expect(await screen.findByRole("img", { name: "Cropped image preview" })).toHaveAttribute("src", "blob:crop-2");
  expect(screen.getByText("400 × 400 px")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
});
```

Use the URL boundary setup from Step 1 to verify replacing, clearing, and unmounting revokes the corresponding prior URL. The behavior under test is released browser memory; URL revocation is asserted because it is the observable browser resource boundary.

- [ ] **Step 5: Run page, editor, service, and geometry tests**

Run: `npm test -- --run src/pages/image/CropPage.test.tsx src/components/ImageCropEditor.test.tsx src/services/image/cropService.test.ts src/utils/imageCropGeometry.test.ts`

Expected: PASS with processing state, preserved editor, result preview, and lifecycle covered.

- [ ] **Step 6: Commit the page workflow**

```powershell
git add -- src/pages/image/CropPage.tsx src/pages/image/CropPage.test.tsx
git commit -m "feat: add image crop workflow"
```

---

### Task 7: Route, catalog, localization, and responsive visual integration

**Files:**
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/styles.css`
- Modify: `src/pages/image/CropPage.test.tsx`

**Interfaces:**
- Consumes: `ImageCropPage` from Task 6.
- Produces: public `/image/crop` route, discoverable tool metadata, complete English/Traditional Chinese UI, and responsive crop-editor presentation.

- [ ] **Step 1: Add the failing public route test**

Add `"/image/crop": "Image Crop"` to `ROUTE_HEADINGS` in `src/App.test.tsx`, then run:

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because the unknown route redirects to Home instead of rendering Image Crop.

- [ ] **Step 2: Register the tool and route**

Add this tool immediately after Image Resize:

```ts
{
  id: "image-crop",
  title: "Image Crop",
  description: "Crop images into rectangles, circles, presets, or custom shapes with live preview.",
  path: "/image/crop",
  category: "Image",
  aliases: ["crop image", "circle crop", "custom shape crop", "freehand crop"],
  keywords: ["photo", "image", "crop", "mask", "circle", "polygon", "transparent png"],
},
```

In `App.tsx`, import `ImageCropPage`, add `"image-crop": { label: "✂", tone: "violet" }`, and register:

```tsx
<Route path="/image/crop" element={<ToolFrame><ImageCropPage /></ToolFrame>} />
```

Change the ToolPageTemplate root class construction from a one-off JSON modifier to a safe tool-id modifier:

```tsx
<main className={`tool-page tool-page--${tool.id}`}>
```

Preserve the existing `.tool-page--json-formatter` behavior through the new generic class.

- [ ] **Step 3: Add complete localized content and assert user-facing behavior**

Add Traditional Chinese and English keys for:

- Tool title and description.
- Shape names and shape group names.
- Crop canvas accessible name and selected-shape status.
- Zoom, coordinate X/Y, point name, add/delete point, close shape, undo, reset.
- Transparent PNG, white JPG fill explanation, crop/cropping actions.
- Validation reasons for too small, too few points, open path, self-intersection, and no image intersection.
- Image decode/crop processing errors.
- Four how-it-works steps and two FAQ entries covering local processing and transparent output.

Use exact English labels referenced in Tasks 4–6 tests and natural Traditional Chinese equivalents. Add one page test rendered under the Traditional Chinese language state that finds `影像裁切`, `圓形`, and `透明 PNG` by accessible text; this catches missing localization consumption rather than testing the dictionary directly.

```tsx
it("exposes the crop workflow in Traditional Chinese", () => {
  window.localStorage.setItem("nexaforge-locale", "zh-TW");
  renderCropPageWithSelectedFile();
  expect(screen.getByRole("heading", { level: 1, name: "影像裁切" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "圓形" }));
  expect(screen.getByText("透明 PNG")).toBeInTheDocument();
  window.localStorage.removeItem("nexaforge-locale");
});
```

Add `window.localStorage.removeItem("nexaforge-locale")` to the test file's `afterEach` so a failed assertion cannot leak locale into later tests.

- [ ] **Step 4: Run route and page tests and observe GREEN before styling**

Run: `npm test -- --run src/App.test.tsx src/pages/image/CropPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Implement scoped editor styles**

Add styles under `.tool-page--image-crop` and `.image-crop-editor` only:

- Desktop duo columns `minmax(0, 7fr) minmax(260px, 3fr)`.
- Square preview stage with `max-inline-size: 720px`, `aspect-ratio: 1`, `overflow: hidden`, existing line/radius tokens, and a checkerboard using existing surface colors.
- Canvas fills the stage without stretching its internal bitmap; resize bitmap with `ResizeObserver` at device-pixel ratio and redraw.
- Shape button grid uses at least 44px targets, visible text, existing secondary button style, and a selected style that differs by border/weight as well as color.
- Nodes are at least 24px visual handles with a 44px invisible hit target; focused nodes use `var(--focus-ring)`.
- Coordinate rows wrap without horizontal page overflow.
- Error/status text stays adjacent to the editor and uses existing error/text tokens.
- At the existing layout failure breakpoint, use one column with DOM order upload/editor → shape controls → output controls.
- At 200% zoom and 320 CSS px width, controls wrap and remain reachable; no fixed/sticky element covers the final action.
- Add `@media (prefers-reduced-motion: reduce)` handling if any preview continuity animation is introduced; otherwise use no animation.

- [ ] **Step 6: Run the complete automated suite and production build**

Run: `npm test -- --run`

Expected: all Vitest tests pass.

Run: `npm run build`

Expected: TypeScript and Vite production build complete without errors.

- [ ] **Step 7: Commit public integration**

```powershell
git add -p -- src/data/tools.ts src/App.tsx src/App.test.tsx src/context/LanguageContext.tsx src/styles.css src/pages/image/CropPage.test.tsx
git diff --cached --check
git diff --cached -- src/data/tools.ts src/App.tsx src/App.test.tsx src/context/LanguageContext.tsx src/styles.css src/pages/image/CropPage.test.tsx
git commit -m "feat: integrate custom shape crop tool"
```

Accept only image-crop hunks during `git add -p`; reject every pre-existing unrelated hunk, especially in `LanguageContext.tsx` and `styles.css`.

---

### Task 8: Browser verification and defect correction

**Files:**
- Modify only files from Tasks 1–7 when a verified defect requires correction.
- Create optional retained evidence under the workspace only when it materially demonstrates responsive layout or preview/output parity; do not commit generated screenshots unless the user requests them.

**Interfaces:**
- Consumes: complete `/image/crop` feature.
- Produces: observed functional, responsive, keyboard, error-recovery, and downloaded-output evidence.

- [ ] **Step 1: Start the real app**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite reports a local URL and remains running for browser verification.

- [ ] **Step 2: Verify the primary wide-screen flow**

Fixture: a locally generated or existing non-sensitive 1200×800 PNG with clearly different colored quadrants.

Viewport/input: 1440×900; pointer, then keyboard.

Actions and expected observations:

1. Open `/image/crop` from the real route.
2. Upload the fixture; editor appears without page jump or upload.
3. Pan and zoom; the mask stays aligned.
4. Select circle, heart, star; preview reports transparent PNG.
5. Crop and download each; result preview and downloaded file have matching framing, tight dimensions, and transparent outside pixels.
6. Tab through shape controls, focus Canvas, move image with arrows and Shift+arrows, and confirm visible focus and status updates.

- [ ] **Step 3: Verify polygon, freehand, and recovery**

Viewport/input: 1440×900; pointer and keyboard.

Actions and expected observations:

1. Create a two-point polygon; crop is disabled with a nearby reason.
2. Add the third point but leave open; reason changes to close-shape guidance.
3. Close and crop; output matches path.
4. Create a self-intersecting bow tie; processing remains disabled and points stay editable.
5. Draw a freehand loop; nodes appear, can be arrow-moved and deleted, and the shape can be undone/reset.
6. Force a processing error through a temporary browser/dev fixture only if available; confirm the source and shape remain and Retry is available. Do not commit failure hooks.

- [ ] **Step 4: Verify narrow, translation, zoom, and format edge cases**

Fixture: the same image plus Traditional Chinese language.

Viewport/input: 390×844 and 320×700; touch emulation and keyboard; browser zoom 200% at a representative wide viewport.

Expected observations:

- Editor precedes controls; labels wrap without clipping or horizontal page scroll.
- Shape and node targets remain operable; coordinate rows remain readable.
- Primary crop action and validation messages remain visible and unobscured.
- Rectangle PNG/WebP shows transparency outside source; rectangle JPG preview and output use white fill.
- Long Traditional Chinese validation and FAQ content does not overlap controls.

- [ ] **Step 5: Correct each observed defect with a fresh red-green cycle**

For every defect: add the smallest automated regression test where jsdom can observe the behavior, run it to confirm the expected failure, make the focused implementation/style correction, rerun the focused test, then repeat the affected browser pass. Do not change unrelated dirty files.

- [ ] **Step 6: Run final verification**

Run: `npm test -- --run`

Expected: all tests pass with no warnings.

Run: `npm run build`

Expected: exit code 0.

Record in the handoff: exact commands/results; route, fixture, viewport/input, action, and observed result for each browser pass; defects corrected; any unavailable checks and remaining risks.

- [ ] **Step 7: Commit verification-driven corrections if any**

Stage only crop-correction hunks from the explicit feature file set below; reject unrelated pre-existing hunks:

```powershell
git add -p -- src/types/imageCrop.ts src/utils/imageCropGeometry.ts src/utils/imageCropGeometry.test.ts src/services/image/cropService.ts src/services/image/cropService.test.ts src/components/ImageCropEditor.tsx src/components/ImageCropEditor.test.tsx src/pages/image/CropPage.tsx src/pages/image/CropPage.test.tsx src/data/tools.ts src/App.tsx src/App.test.tsx src/context/LanguageContext.tsx src/styles.css
git diff --cached --check
git commit -m "fix: correct verified image crop interactions"
```

If no correction was needed, do not create an empty commit.
