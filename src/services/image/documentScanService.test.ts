import { describe, expect, it, vi, afterEach } from "vitest";
import { mapDocumentPoint, validateDocumentCorners, rectifyDocumentPixels, scanDocument, createDocumentPdf } from "./documentScanService";
import { PDFDocument } from "pdf-lib";

const full = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] as const;

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("document projective geometry", () => {
  it("maps identity and an offset rectangle using independently derived coordinates", () => {
    expect(mapDocumentPoint(full, 0.25, 0.75)).toEqual({ x: 0.25, y: 0.75 });
    expect(mapDocumentPoint([{ x: 0.2, y: 0.1 }, { x: 0.8, y: 0.1 }, { x: 0.8, y: 0.9 }, { x: 0.2, y: 0.9 }], 0.5, 0.25)).toEqual({ x: 0.5, y: 0.30000000000000004 });
  });
  it("uses perspective division rather than bilinear corner interpolation", () => {
    // x=u/(1+v/2), y=v/(1+v/2). The center is (2/5, 2/5).
    const point = mapDocumentPoint([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2 / 3, y: 2 / 3 }, { x: 0, y: 2 / 3 }], 0.5, 0.5);
    expect(point.x).toBeCloseTo(0.4, 12);
    expect(point.y).toBeCloseTo(0.4, 12);
  });
  it("rejects crossed, repeated, collinear, reversed, outside and nonfinite corners", () => {
    expect(validateDocumentCorners(full)).toBe(true);
    for (const corners of [
      [full[0], full[2], full[1], full[3]],
      [full[0], full[1], full[1], full[3]],
      [{ x: 0, y: 0 }, { x: 0.3, y: 0 }, { x: 0.6, y: 0 }, { x: 1, y: 0 }],
      [...full].reverse(),
      [{ x: -0.1, y: 0 }, ...full.slice(1)],
      [{ x: NaN, y: 0 }, ...full.slice(1)],
    ]) expect(validateDocumentCorners(corners)).toBe(false);
  });
});

describe("document pixel output", () => {
  const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
  it("preserves identity pixels and interpolates the independently calculated center", () => {
    expect(Array.from(rectifyDocumentPixels(pixels, 2, 2, full, 2, 2, "color"))).toEqual(Array.from(pixels));
    const output = rectifyDocumentPixels(pixels, 2, 2, full, 3, 3, "color");
    expect(Array.from(output.slice(16, 20))).toEqual([128, 128, 128, 255]);
  });
  it("applies luminance and threshold modes and composites transparency on white", () => {
    const input = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0]);
    expect(Array.from(rectifyDocumentPixels(input, 2, 2, full, 2, 2, "grayscale"))).toEqual([76, 76, 76, 255, 150, 150, 150, 255, 29, 29, 29, 255, 255, 255, 255, 255]);
    expect(Array.from(rectifyDocumentPixels(input, 2, 2, full, 2, 2, "contrast"))).toEqual([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255]);
  });
  it("rejects excessive allocations and invalid geometry before producing pixels", () => {
    expect(() => rectifyDocumentPixels(pixels, 2, 2, full, 10000, 10000, "color")).toThrow();
    expect(() => rectifyDocumentPixels(pixels, 2, 2, [full[0], full[2], full[1], full[3]], 2, 2, "color")).toThrow();
  });
  it("samples the perspective-corrected center from real gradient pixels", () => {
    const gradient = new Uint8ClampedArray([0, 0, 0, 255, 50, 0, 0, 255, 100, 0, 0, 255, 0, 50, 0, 255, 50, 50, 0, 255, 100, 50, 0, 255, 0, 100, 0, 255, 50, 100, 0, 255, 100, 100, 0, 255]);
    const output = rectifyDocumentPixels(gradient, 3, 3, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2 / 3, y: 2 / 3 }, { x: 0, y: 2 / 3 }], 3, 3, "color");
    expect(Array.from(output.slice(16, 20))).toEqual([40, 40, 0, 255]);
  });
  it("does not decode cancelled input", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const controller = new AbortController(); controller.abort();
    await expect(scanDocument(new File(["x"], "scan.png", { type: "image/png" }), full, "color", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(decode).not.toHaveBeenCalled();
  });
  it("releases decoded resources and canvas surfaces after serialization failure", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 2, height: 2, close })));
    const context = { drawImage: vi.fn(), getImageData: () => ({ data: pixels }), createImageData: () => ({ data: new Uint8ClampedArray(16) }), putImageData: vi.fn() };
    const canvases: { width: number; height: number; getContext: () => typeof context; toBlob: (cb: BlobCallback) => void }[] = [];
    vi.spyOn(document, "createElement").mockImplementation((() => {
      const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (cb: BlobCallback) => cb(null) };
      canvases.push(canvas);
      return canvas;
    }) as unknown as typeof document.createElement);
    await expect(scanDocument(new File(["x"], "scan.png", { type: "image/png" }), full, "color")).rejects.toThrow();
    expect(close).toHaveBeenCalledOnce();
    expect(canvases.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true);
  });
  it("exports an actual one-page PDF from the corrected JPEG", async () => {
    // A valid 1×1 PNG is also accepted by the shared conversion utility.
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="), (c) => c.charCodeAt(0));
    const result = await createDocumentPdf({ blob: new Blob([bytes], { type: "image/png" }), fileName: "photo-scanned.png", mimeType: "image/png", size: bytes.length, width: 1, height: 1 });
    const pdf = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 1, height: 1 });
    expect(result.fileName).toBe("photo-scanned.pdf");
  });
});
