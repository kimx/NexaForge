import { describe, expect, it, vi } from "vitest";
import {
  getBarcodeResizeDimensions,
  readBarcodesFromImage,
} from "./barcodeReaderService";

const image = new File(["image"], "barcode.png", { type: "image/png" });

function canvas(): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: vi.fn() }),
  } as unknown as HTMLCanvasElement;
}

describe("barcodeReaderService", () => {
  it("limits oversized images to the configured maximum dimension", () => {
    expect(getBarcodeResizeDimensions(6000, 4000)).toEqual({ width: 2048, height: 1365 });
    expect(getBarcodeResizeDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("uses the native detector for every barcode and revokes the image URL", async () => {
    const revoked: string[] = [];
    const nativeDetector = {
      detect: vi.fn().mockResolvedValue([
        { rawValue: "4006381333931", format: "ean_13" },
        { rawValue: "ABC-128", format: "code_128" },
      ]),
    };

    const result = await readBarcodesFromImage(image, {
      createObjectUrl: () => "blob:barcode",
      revokeObjectUrl: (url) => revoked.push(url),
      loadImage: async () => ({ naturalWidth: 6000, naturalHeight: 4000 }),
      createCanvas: (width, height) => {
        const target = canvas();
        target.width = width;
        target.height = height;
        return target;
      },
      createNativeDetector: async () => nativeDetector,
      decodeFallback: vi.fn(),
    });

    expect(result).toEqual([
      { value: "4006381333931", format: "ean_13" },
      { value: "ABC-128", format: "code_128" },
    ]);
    expect(nativeDetector.detect).toHaveBeenCalled();
    expect(revoked).toEqual(["blob:barcode"]);
  });

  it("falls back to ZXing when native detection is unavailable", async () => {
    const fallback = vi.fn().mockResolvedValue([{ value: "036000291452", format: "UPC_A" }]);
    const result = await readBarcodesFromImage(image, {
      createObjectUrl: () => "blob:barcode",
      revokeObjectUrl: vi.fn(),
      loadImage: async () => ({ naturalWidth: 640, naturalHeight: 480 }),
      createCanvas: canvas,
      createNativeDetector: async () => null,
      decodeFallback: fallback,
    });

    expect(result).toEqual([{ value: "036000291452", format: "UPC_A" }]);
    expect(fallback).toHaveBeenCalled();
  });

  it("reports an empty decode as an error while cleaning up", async () => {
    const revoke = vi.fn();
    await expect(
      readBarcodesFromImage(image, {
        createObjectUrl: () => "blob:barcode",
        revokeObjectUrl: revoke,
        loadImage: async () => ({ naturalWidth: 640, naturalHeight: 480 }),
        createCanvas: canvas,
        createNativeDetector: async () => null,
        decodeFallback: async () => [],
      })
    ).rejects.toThrow("No barcode found");
    expect(revoke).toHaveBeenCalledWith("blob:barcode");
  });
});
