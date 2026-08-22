import { convertHeic, isHeicFile } from "./heicService";

function heicFile(name = "photo.heic"): File {
  return new File([new Uint8Array([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])], name, { type: "image/heic" });
}

describe("HEIC service", () => {
  it("validates HEIF family signatures", async () => {
    expect(await isHeicFile(heicFile())).toBe(true);
    expect(await isHeicFile(new File(["not heic"], "fake.heic", { type: "image/heic" }))).toBe(false);
  });

  it("converts to JPEG or PNG with deterministic names", async () => {
    const convert = vi.fn().mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
    const result = await convertHeic(heicFile("holiday.heic"), { format: "jpeg", quality: 0.8 }, { heicTo: convert });
    expect(result.fileName).toBe("holiday.jpg");
    expect(result.mimeType).toBe("image/jpeg");
    expect(convert).toHaveBeenCalledWith(expect.objectContaining({ type: "image/jpeg", quality: 0.8 }));
  });

  it("rejects files without a valid signature", async () => {
    await expect(convertHeic(new File(["x"], "fake.heic"), { format: "png", quality: 1 }, { heicTo: vi.fn() })).rejects.toThrow("valid HEIC");
  });
});
