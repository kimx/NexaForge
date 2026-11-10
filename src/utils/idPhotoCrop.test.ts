import { describe, expect, it } from "vitest";
import { createIdPhotoCrop, fitIdPhotoCrop } from "./idPhotoCrop";
import { createCropRenderPlan, getImageStageBounds } from "./imageCropGeometry";

describe("ID photo crop", () => {
  it.each([25 / 35, 35 / 45, 40 / 30, 5 / 100, 100 / 5])("locks the crop to ratio %s without stretching the source", ratio => {
    const crop = fitIdPhotoCrop(createIdPhotoCrop(ratio), ratio, { width: 200, height: 800 });
    const bounds = crop.shape.bounds!;
    expect(bounds.width / bounds.height).toBeCloseTo(ratio);
    const image = getImageStageBounds(200, 800, crop.imageTransform);
    expect(image.x).toBeLessThanOrEqual(bounds.x + 1e-10);
    expect(image.x + image.width).toBeGreaterThanOrEqual(bounds.x + bounds.width - 1e-10);
    const plan = createCropRenderPlan(200, 800, crop);
    expect(Math.abs(plan.outputWidth / plan.outputHeight - ratio)).toBeLessThan(0.01);
  });

  it("keeps the crop covered after rotation and extreme panning", () => {
    const crop = createIdPhotoCrop(35 / 45);
    crop.imageTransform.rotationQuarterTurns = 1;
    crop.imageTransform.offsetX = 10;
    crop.imageTransform.offsetY = -10;
    const fitted = fitIdPhotoCrop(crop, 35 / 45, { width: 1600, height: 400 });
    const image = getImageStageBounds(1600, 400, fitted.imageTransform);
    const bounds = fitted.shape.bounds!;
    expect(image.y).toBeLessThanOrEqual(bounds.y + 1e-10);
    expect(image.y + image.height).toBeGreaterThanOrEqual(bounds.y + bounds.height - 1e-10);
  });
});
