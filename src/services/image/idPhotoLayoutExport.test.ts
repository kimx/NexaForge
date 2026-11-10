import { Blob as NodeBlob } from "node:buffer";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultCropSettings } from "../../utils/imageCropGeometry";
import { calculateIdPhotoLayout, createIdPhotoLayoutExport, drawIdPhotoPage } from "./idPhotoLayoutService";
import { cropImage } from "./cropService";

vi.mock("./cropService", () => ({ cropImage: vi.fn() }));
const options = { photoWidthMm: 35, photoHeightMm: 45, paperWidthMm: 101.6, paperHeightMm: 152.4, marginMm: 3, spacingMm: 2, copies: 7, cropMarks: true };
const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="), c => c.charCodeAt(0));
const close = vi.fn();
const drawImage = vi.fn();

beforeEach(() => {
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1, height: 1, close })));
  vi.mocked(cropImage).mockResolvedValue({ blob: new Blob([png]), fileName: "crop.png", size: png.length, mimeType: "image/png", width: 1, height: 1 });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage, fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => callback(new Blob([png], { type })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("ID photo exports", () => {
  it("creates a real multipage PDF with exact physical paper dimensions", async () => {
    const result = await createIdPhotoLayoutExport(new File([], "photo.png"), createDefaultCropSettings(), options, calculateIdPhotoLayout(options), "pdf", "4x6");
    const pdf = await PDFDocument.load(new Uint8Array(await result.blob.arrayBuffer()));
    expect(pdf.getPageCount()).toBe(2);
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(101.6 / 25.4 * 72);
      expect(page.getHeight()).toBeCloseTo(152.4 / 25.4 * 72);
    }
    expect(result.fileName).toBe("id-photo-35x45mm-4x6.pdf");
    expect(close).toHaveBeenCalled();
  });

  it.each(["png", "jpg"] as const)("exports %s at 300 DPI and bundles multiple pages", async format => {
    const single = { ...options, copies: 1 };
    const result = await createIdPhotoLayoutExport(new File([], "photo.png"), createDefaultCropSettings(), single, calculateIdPhotoLayout(single), format, "4x6");
    expect(result.width).toBe(1200);
    expect(result.height).toBe(1800);
    const multiple = await createIdPhotoLayoutExport(new File([], "photo.png"), createDefaultCropSettings(), options, calculateIdPhotoLayout(options), format, "4x6");
    const pages = unzipSync(new Uint8Array(await multiple.blob.arrayBuffer()));
    expect(Object.keys(pages)).toEqual([`id-photo-35x45mm-4x6.01.${format}`, `id-photo-35x45mm-4x6.02.${format}`]);
  });

  it("renders only the remaining copies on the final preview page", () => {
    const canvas = document.createElement("canvas");
    drawIdPhotoPage(canvas, {} as CanvasImageSource, calculateIdPhotoLayout(options), 1);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(1800);
  });
});
