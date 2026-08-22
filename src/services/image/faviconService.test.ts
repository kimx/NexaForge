import { buildIco, generateFaviconSet } from "./faviconService";

describe("favicon service", () => {
  it("writes a valid ICO header, directory, and PNG offsets", async () => {
    const blob = buildIco([
      { width: 16, height: 16, data: new Uint8Array([1, 2, 3]) },
      { width: 32, height: 32, data: new Uint8Array([4, 5]) },
    ]);
    const view = new DataView(await blob.arrayBuffer());
    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(2);
    expect(view.getUint32(14, true)).toBe(3);
    expect(view.getUint32(18, true)).toBe(38);
    expect(view.getUint32(30, true)).toBe(2);
    expect(view.getUint32(34, true)).toBe(41);
  });

  it("generates the required icons and manifest", async () => {
    const bitmap = { width: 640, height: 480, close: vi.fn() } as unknown as ImageBitmap;
    const renderPng = vi.fn(async (_bitmap: ImageBitmap, size: number) => new Blob([String(size)], { type: "image/png" }));
    const results = await generateFaviconSet(new File(["x"], "logo.png", { type: "image/png" }), {}, {
      decode: vi.fn(async () => bitmap), renderPng,
    });
    expect(results.map((result) => result.fileName)).toEqual([
      "favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png",
      "android-chrome-192x192.png", "android-chrome-512x512.png", "site.webmanifest",
    ]);
    const manifest = await results.at(-1)?.blob.text();
    expect(manifest).toContain("android-chrome-512x512.png");
    expect(renderPng).toHaveBeenCalledTimes(6);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
