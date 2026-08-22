import { calculateFitRect, generateSocialImages, SOCIAL_PRESETS } from "./socialImageService";

describe("social image service", () => {
  it("calculates centered cover and contain rectangles", () => {
    expect(calculateFitRect(1200, 600, 100, 100, "cover")).toEqual({ sx: 300, sy: 0, sWidth: 600, sHeight: 600, dx: 0, dy: 0, dWidth: 100, dHeight: 100 });
    expect(calculateFitRect(1200, 600, 100, 100, "contain")).toEqual({ sx: 0, sy: 0, sWidth: 1200, sHeight: 600, dx: 0, dy: 25, dWidth: 100, dHeight: 50 });
  });

  it("publishes exact platform presets", () => {
    expect(SOCIAL_PRESETS.map(({ id, width, height }) => [id, width, height])).toEqual([
      ["instagram-square", 1080, 1080], ["instagram-portrait", 1080, 1350],
      ["facebook-post", 1200, 630], ["x-post", 1600, 900],
      ["linkedin-post", 1200, 627], ["youtube-thumbnail", 1280, 720],
    ]);
  });

  it("keeps successful outputs when one requested size fails", async () => {
    const bitmap = { width: 800, height: 800, close: vi.fn() } as unknown as ImageBitmap;
    const render = vi.fn(async (_bitmap: ImageBitmap, request: { id: string }) => {
      if (request.id === "bad") throw new Error("failed");
      return new Blob(["ok"], { type: "image/jpeg" });
    });
    const results = await generateSocialImages(new File(["x"], "photo.png", { type: "image/png" }), [
      { id: "good", label: "Good", width: 100, height: 100, fit: "cover", format: "jpeg" },
      { id: "bad", label: "Bad", width: 200, height: 200, fit: "cover", format: "jpeg" },
    ], { decode: vi.fn(async () => bitmap), render });
    expect(results.map((result) => result.fileName)).toEqual(["photo-good-100x100.jpg"]);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
