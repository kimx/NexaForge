import { convertImage } from "./imageService";
import * as avifService from "./avifService";

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
