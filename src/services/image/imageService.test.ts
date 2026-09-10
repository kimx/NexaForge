import { compressImageToTarget, convertImage } from "./imageService";
import * as avifService from "./avifService";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("image conversion service", () => {
  it("falls back to the AVIF encoder when canvas cannot serialize AVIF", async () => {
    const bitmap = { width: 1, height: 1, close: vi.fn() } as unknown as ImageBitmap;
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    const imageData = { data: new Uint8ClampedArray(4), width: 1, height: 1, colorSpace: "srgb" } as ImageData;
    const context = { drawImage: vi.fn(), getImageData: vi.fn().mockReturnValue(imageData) };
    const canvas = { width: 0, height: 0, getContext: vi.fn().mockReturnValue(context), toBlob: (callback: BlobCallback) => callback(null) } as unknown as HTMLCanvasElement;
    vi.spyOn(document, "createElement").mockReturnValue(canvas);
    vi.spyOn(avifService, "encodeAvif").mockResolvedValue(new Blob(["avif"], { type: "image/avif" }));

    const result = await convertImage(new File(["png"], "photo.png", { type: "image/png" }), { format: "avif" });
    expect(result.fileName).toBe("photo.avif");
    expect(bitmap.close).toHaveBeenCalled();
  });
});

describe("target-size image compression", () => {
  function setupCanvas(bitmap: ImageBitmap, toBlob: HTMLCanvasElement["toBlob"]): void {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    vi.spyOn(document, "createElement").mockReturnValue({
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
      toBlob,
    } as unknown as HTMLCanvasElement);
  }

  it("uses actual Blob bytes when searching for a quality at the boundary", async () => {
    const bitmap = { width: 100, height: 50, close: vi.fn() } as unknown as ImageBitmap;
    const toBlob = vi.fn((callback: BlobCallback, _type?: string, quality = 0) => {
      callback(new Blob([new Uint8Array(Math.round(200 + quality * 1000))], { type: "image/jpeg" }));
    });
    setupCanvas(bitmap, toBlob);

    const result = await compressImageToTarget(
      new File(["source"], "photo.png", { type: "image/png" }),
      { format: "jpeg", targetBytes: 700 }
    );

    expect(result.size).toBe(result.blob.size);
    expect(result.size).toBeLessThanOrEqual(700);
    expect(result.targetStatus).toBe("met");
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
    expect(bitmap.close).toHaveBeenCalled();
    expect(toBlob.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it("does not pretend PNG quality can meet an unreachable target, then resizes only when allowed", async () => {
    const bitmap = { width: 100, height: 50, close: vi.fn() } as unknown as ImageBitmap;
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
      toBlob: vi.fn((callback: BlobCallback, type?: string) => {
        callback(new Blob([new Uint8Array(canvas.width * canvas.height * 2 + 100)], { type }));
      }),
    } as unknown as HTMLCanvasElement;
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    vi.spyOn(document, "createElement").mockReturnValue(canvas);
    const file = new File(["source"], "transparent.png", { type: "image/png" });

    const withoutResize = await compressImageToTarget(file, { format: "png", targetBytes: 200 });
    expect(withoutResize.targetStatus).toBe("resize-available");
    expect(withoutResize.size).toBeGreaterThan(200);
    expect(withoutResize.width).toBe(100);
    expect(withoutResize.height).toBe(50);

    const withResize = await compressImageToTarget(file, { format: "png", targetBytes: 200, allowResize: true });
    expect(withResize.targetStatus).toBe("met");
    expect(withResize.size).toBeLessThanOrEqual(200);
    expect(withResize.width).toBeLessThan(100);
    expect(withResize.height).toBeLessThan(50);
    expect((withResize.width ?? 0) / (withResize.height ?? 1)).toBeCloseTo(2, 0);
  });

  it("stops the bounded search when cancelled", async () => {
    const controller = new AbortController();
    const bitmap = { width: 100, height: 50, close: vi.fn() } as unknown as ImageBitmap;
    const toBlob = vi.fn((callback: BlobCallback) => {
      controller.abort();
      callback(new Blob(["output"], { type: "image/jpeg" }));
    });
    setupCanvas(bitmap, toBlob);

    await expect(compressImageToTarget(
      new File(["source"], "photo.jpg", { type: "image/jpeg" }),
      { format: "jpeg", targetBytes: 100, signal: controller.signal }
    )).rejects.toMatchObject({ name: "AbortError" });
    expect(bitmap.close).toHaveBeenCalled();
    expect(toBlob).toHaveBeenCalledTimes(1);
  });
});
