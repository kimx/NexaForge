import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CropSettings } from "../../types/imageCrop";
import { cropImage } from "./cropService";

const context = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  clip: vi.fn(),
  closePath: vi.fn(),
  drawImage: vi.fn(),
  ellipse: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  rect: vi.fn(),
  rotate: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  save: vi.fn(),
  translate: vi.fn(),
  bezierCurveTo: vi.fn(),
  fillStyle: "",
};

const bitmap = {
  width: 1000,
  height: 500,
  close: vi.fn(),
} as unknown as ImageBitmap;

const canvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => context),
  toBlob: vi.fn(),
} as unknown as HTMLCanvasElement;

const validFile = new File(["source"], "photo.png", { type: "image/png" });
const validSettings: CropSettings = {
  shape: { kind: "rectangle", bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } },
  imageTransform: {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    rotationQuarterTurns: 0,
    flipHorizontal: false,
    flipVertical: false,
  },
  format: "png",
  quality: 0.9,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
  vi.mocked(canvas.toBlob).mockImplementation((callback: BlobCallback, type?: string) => {
    callback(new Blob(["cropped"], { type: type ?? "image/png" }));
  });
  vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
    if (tagName.toLowerCase() === "canvas") {
      return canvas;
    }
    return document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
  }) as typeof document.createElement);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("cropImage", () => {
  it("returns a transparent PNG contract for a circular crop and closes the bitmap", async () => {
    const result = await cropImage(new File(["source"], "avatar.webp", { type: "image/webp" }), {
      shape: { kind: "circle", bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } },
      imageTransform: {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        rotationQuarterTurns: 0,
        flipHorizontal: false,
        flipVertical: false,
      },
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

  it("returns JPG with a cropped name and white fill for a rectangle", async () => {
    const result = await cropImage(validFile, { ...validSettings, format: "jpeg", quality: 0.75 });

    expect(result.fileName).toBe("photo-cropped.jpg");
    expect(result.mimeType).toBe("image/jpeg");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 500, 500);
  });

  it("rotates and flips the draw pass before exporting", async () => {
    await cropImage(validFile, {
      ...validSettings,
      imageTransform: {
        ...validSettings.imageTransform,
        rotationQuarterTurns: 1,
        flipHorizontal: true,
        flipVertical: true,
      },
    });

    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(context.scale).toHaveBeenCalledWith(-1, -1);
  });

  it("closes the bitmap when canvas serialization fails", async () => {
    vi.mocked(canvas.toBlob).mockImplementation((callback: BlobCallback) => callback(null));

    await expect(cropImage(validFile, validSettings)).rejects.toThrow("Unable to serialize cropped image.");
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
