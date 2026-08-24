import { afterEach, describe, expect, it, vi } from "vitest";
import { applyWatermark, constrainPosition, getPresetPosition, validateWatermarkOptions } from "./watermarkService";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getPresetPosition", () => {
  it("maps the bottom-right preset to the safe-area anchor", () => {
    expect(getPresetPosition("bottom-right")).toEqual({ x: 0.94, y: 0.94 });
  });
});

describe("constrainPosition", () => {
  it("keeps an unrotated watermark fully inside its source image", () => {
    expect(
      constrainPosition(
        { x: 0, y: 1 },
        { width: 1000, height: 500 },
        { width: 200, height: 40 },
        0
      )
    ).toEqual({ x: 0.1, y: 0.96 });
  });

  it("uses the rotated bounding box when clamping a watermark", () => {
    const constrained = constrainPosition(
      { x: 0.98, y: 0.98 },
      { width: 1000, height: 500 },
      { width: 200, height: 40 },
      90
    );

    expect(constrained.x).toBeCloseTo(0.98);
    expect(constrained.y).toBeCloseTo(0.8);
  });
});

describe("applyWatermark", () => {
  it("draws text, preserves WebP output, and releases the source bitmap", async () => {
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 180 }),
      globalAlpha: 1,
      font: "",
      fillStyle: "",
      textAlign: "start",
      textBaseline: "alphabetic",
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(context),
      toBlob: (callback: BlobCallback, type?: string) => callback(new Blob(["output"], { type })),
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    const result = await applyWatermark(
      new File(["pixels"], "photo.webp", { type: "image/webp" }),
      {
        mode: "text",
        text: "NexaForge",
        fontFamily: "Arial, sans-serif",
        color: "#ffffff",
        sizeRatio: 0.08,
        opacity: 0.7,
        rotation: 0,
        position: { x: 0.94, y: 0.94 },
      }
    );

    expect(context.fillText).toHaveBeenCalledWith("NexaForge", 0, 0);
    expect(result).toMatchObject({ fileName: "photo-watermarked.webp", mimeType: "image/webp" });
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("draws a scaled logo and releases both decoded bitmaps", async () => {
    const source = { width: 1000, height: 500, close: vi.fn() } as unknown as ImageBitmap;
    const logo = { width: 400, height: 200, close: vi.fn() } as unknown as ImageBitmap;
    vi.stubGlobal("createImageBitmap", vi.fn()
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(logo));
    const context = {
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      globalAlpha: 1,
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(context),
      toBlob: (callback: BlobCallback, type?: string) => callback(new Blob(["output"], { type })),
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, "createElement").mockReturnValue(canvas);
    const logoFile = new File(["logo"], "logo.png", { type: "image/png" });

    await applyWatermark(new File(["photo"], "photo.jpg", { type: "image/jpeg" }), {
      mode: "image",
      logo: logoFile,
      widthRatio: 0.2,
      opacity: 0.5,
      rotation: 0,
      position: { x: 0.5, y: 0.5 },
    });

    expect(context.drawImage).toHaveBeenLastCalledWith(logo, -100, -50, 200, 100);
    expect(source.close).toHaveBeenCalledOnce();
    expect(logo.close).toHaveBeenCalledOnce();
  });
});

describe("validateWatermarkOptions", () => {
  it("rejects blank text and non-finite or out-of-range values", () => {
    expect(validateWatermarkOptions({
      mode: "text",
      text: "   ",
      fontFamily: "Arial, sans-serif",
      color: "#fff",
      sizeRatio: Number.NaN,
      opacity: 2,
      rotation: 181,
      position: { x: -1, y: 2 },
    })).toEqual([
      "Watermark text is required.",
      "Opacity must be between 0.05 and 1.",
      "Rotation must be between -180 and 180 degrees.",
      "Position must stay between 0 and 1.",
      "Text size must be between 0.01 and 0.5.",
    ]);
  });

  it("rejects an out-of-range logo width", () => {
    expect(validateWatermarkOptions({
      mode: "image",
      logo: new File(["logo"], "logo.png", { type: "image/png" }),
      widthRatio: 0,
      opacity: 0.7,
      rotation: 0,
      position: { x: 0.5, y: 0.5 },
    })).toEqual(["Logo width must be between 0.01 and 1."]);
  });

  it("prevents invalid options from starting image decoding", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);

    await expect(applyWatermark(new File(["photo"], "photo.png", { type: "image/png" }), {
      mode: "text",
      text: "",
      fontFamily: "Arial, sans-serif",
      color: "#fff",
      sizeRatio: 0.08,
      opacity: 0.7,
      rotation: 0,
      position: { x: 0.5, y: 0.5 },
    })).rejects.toThrow("Watermark text is required.");
    expect(decode).not.toHaveBeenCalled();
  });
});
