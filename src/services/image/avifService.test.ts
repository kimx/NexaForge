import { decodeAvif, encodeAvif } from "./avifService";

describe("AVIF service", () => {
  it("decodes and encodes through lazy-compatible adapters", async () => {
    const imageData = { data: new Uint8ClampedArray([255, 0, 0, 255]), width: 1, height: 1, colorSpace: "srgb" } as ImageData;
    const decode = vi.fn().mockResolvedValue(imageData);
    const encode = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
    expect(await decodeAvif(new File(["avif"], "x.avif"), { decode, encode })).toBe(imageData);
    const result = await encodeAvif(imageData, 75, { decode, encode });
    expect(result.type).toBe("image/avif");
    expect(result.size).toBe(3);
  });
});
