import { calculateCollageLayout, createCollage } from "./collageService";

describe("collage layout", () => {
  const images = [{ width: 200, height: 100 }, { width: 100, height: 200 }];
  it("makes a long image without stretching either source", () => {
    const result = calculateCollageLayout(images, { layout: "vertical", width: 600, gap: 20, columns: 2 });
    expect(result.width).toBe(600);
    expect(result.height).toBe(1520);
    expect(result.placements).toEqual([{ x: 0, y: 0, width: 600, height: 300 }, { x: 0, y: 320, width: 600, height: 1200 }]);
  });
  it("fits a horizontal strip to the requested total width", () => {
    const result = calculateCollageLayout(images, { layout: "horizontal", width: 600, gap: 20, columns: 2 });
    expect(result.height).toBe(232);
    expect(result.placements).toEqual([{ x: 0, y: 0, width: 464, height: 232 }, { x: 484, y: 0, width: 116, height: 232 }]);
  });
  it("centers mixed aspect ratios in square grid cells without cropping", () => {
    const result = calculateCollageLayout(images, { layout: "grid", width: 600, gap: 20, columns: 2 });
    expect(result.height).toBe(290);
    expect(result.placements).toEqual([{ x: 0, y: 72.5, width: 290, height: 145 }, { x: 382.5, y: 0, width: 145, height: 290 }]);
  });
  it("rejects impossible spacing and oversized long images before allocating canvas", () => {
    expect(() => calculateCollageLayout(images, { layout: "horizontal", width: 100, gap: 120, columns: 2 })).toThrow();
    expect(() => calculateCollageLayout([{ width: 1, height: 10000 }], { layout: "vertical", width: 4000, gap: 0, columns: 1 })).toThrow();
    expect(() => calculateCollageLayout([], { layout: "vertical", width: 600, gap: 0, columns: 1 })).toThrow();
    expect(() => calculateCollageLayout([{ width: 0, height: 1 }], { layout: "grid", width: 600, gap: 0, columns: 1 })).toThrow();
  });
  it("closes a decoded source that exceeds the image limit before allocating output", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 5000, height: 5000, close })));
    try {
      await expect(createCollage([new File(["image"], "photo.png", { type: "image/png" })], { layout: "grid", width: 600, gap: 0, columns: 1, background: "#ffffff", format: "png" })).rejects.toThrow("invalid-image");
      expect(close).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });
});
