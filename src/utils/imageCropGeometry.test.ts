import { describe, expect, it } from "vitest";
import {
  createCropRenderPlan,
  createDefaultCropSettings,
  getCropBounds,
  getImageStageBounds,
  simplifyFreehandPoints,
  stagePointToSource,
  traceCropPath,
  validateCropShape,
} from "./imageCropGeometry";

describe("image crop geometry", () => {
  it("centers the default rectangle over 80 percent of the stage", () => {
    expect(createDefaultCropSettings()).toEqual({
      shape: { kind: "rectangle", bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } },
      imageTransform: { offsetX: 0, offsetY: 0, scale: 1 },
      format: "png",
      quality: 0.9,
    });
  });

  it("fits a landscape image into the normalized stage", () => {
    expect(getImageStageBounds(1600, 800, { offsetX: 0, offsetY: 0, scale: 1 })).toEqual({
      x: 0,
      y: 0.25,
      width: 1,
      height: 0.5,
    });
  });

  it("maps the stage center to the source center after a normalized offset", () => {
    expect(
      stagePointToSource(
        { x: 0.6, y: 0.55 },
        1000,
        500,
        { offsetX: 0.1, offsetY: 0.05, scale: 1 }
      )
    ).toEqual({ x: 500, y: 250 });
  });

  it("creates a source-resolution render plan from a hand-derived square crop", () => {
    const plan = createCropRenderPlan(1000, 500, {
      shape: { kind: "rectangle", bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } },
      imageTransform: { offsetX: 0, offsetY: 0, scale: 1 },
      format: "png",
      quality: 0.9,
    });

    expect(plan).toMatchObject({
      outputWidth: 500,
      outputHeight: 500,
      mimeType: "image/png",
      background: null,
      imageDestination: { x: -250, y: 0, width: 1000, height: 500 },
    });
  });

  it("reports a rectangle below the five-percent minimum as invalid", () => {
    expect(
      validateCropShape({
        kind: "rectangle",
        bounds: { x: 0.1, y: 0.1, width: 0.04, height: 0.5 },
      })
    ).toEqual({ valid: false, reason: "shape-too-small" });
  });

  it("reports a shape with no image intersection when image bounds are supplied", () => {
    expect(
      validateCropShape(
        { kind: "rectangle", bounds: { x: 0.8, y: 0.8, width: 0.1, height: 0.1 } },
        { x: 0, y: 0, width: 0.5, height: 0.5 }
      )
    ).toEqual({ valid: false, reason: "outside-image" });
  });

  it.each(["circle", "heart", "star"] as const)("uses bounds for the %s preset", (kind) => {
    expect(getCropBounds({ kind, bounds: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 } })).toEqual({
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
    });
  });

  it("rejects a bow-tie polygon because its non-adjacent edges cross", () => {
    expect(
      validateCropShape({
        kind: "polygon",
        closed: true,
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.9, y: 0.9 },
          { x: 0.9, y: 0.1 },
          { x: 0.1, y: 0.9 },
        ],
      })
    ).toEqual({ valid: false, reason: "self-intersection" });
  });

  it("accepts a normal four-corner polygon", () => {
    expect(
      validateCropShape({
        kind: "polygon",
        closed: true,
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.9, y: 0.1 },
          { x: 0.9, y: 0.9 },
          { x: 0.1, y: 0.9 },
        ],
      })
    ).toEqual({ valid: true });
  });

  it("requires a polygon to be explicitly closed", () => {
    expect(
      validateCropShape({
        kind: "polygon",
        closed: false,
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.9, y: 0.1 },
          { x: 0.5, y: 0.9 },
        ],
      })
    ).toEqual({ valid: false, reason: "shape-not-closed" });
  });

  it("simplifies a straight freehand run while preserving corners", () => {
    expect(
      simplifyFreehandPoints(
        [
          { x: 0, y: 0 },
          { x: 0.25, y: 0 },
          { x: 0.5, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
        0.003,
        500
      )
    ).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
  });

  it("calculates a tight bound for custom points", () => {
    expect(
      getCropBounds({
        kind: "freehand",
        closed: true,
        points: [
          { x: 0.2, y: 0.4 },
          { x: 0.8, y: 0.3 },
          { x: 0.6, y: 0.9 },
        ],
      })
    ).toEqual({ x: 0.2, y: 0.3, width: 0.6, height: 0.6 });
  });

  it("traces a polygon through mapped coordinates and closes it", () => {
    const calls: Array<[string, ...number[]]> = [];
    const context = {
      moveTo: (x: number, y: number) => calls.push(["moveTo", x, y]),
      lineTo: (x: number, y: number) => calls.push(["lineTo", x, y]),
      bezierCurveTo: (...values: number[]) => calls.push(["bezierCurveTo", ...values]),
      ellipse: (...values: number[]) => calls.push(["ellipse", ...values]),
      rect: (...values: number[]) => calls.push(["rect", ...values]),
      closePath: () => calls.push(["closePath"]),
    };

    traceCropPath(
      context,
      {
        kind: "polygon",
        closed: true,
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.5, y: 0.2 },
          { x: 0.3, y: 0.8 },
        ],
      },
      (point) => ({ x: point.x * 100, y: point.y * 100 })
    );

    expect(calls).toEqual([
      ["moveTo", 10, 20],
      ["lineTo", 50, 20],
      ["lineTo", 30, 80],
      ["closePath"],
    ]);
  });
});
