import type {
  CropBounds,
  CropPoint,
  CropRenderPlan,
  CropSettings,
  CropShape,
  CropValidation,
  ImageTransform,
} from "../types/imageCrop";

export const DEFAULT_PRESET_BOUNDS: Readonly<CropBounds> = {
  x: 0.1,
  y: 0.1,
  width: 0.8,
  height: 0.8,
};

const MIME_BY_FORMAT = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export function createDefaultCropSettings(): CropSettings {
  return {
    shape: { kind: "rectangle", bounds: { ...DEFAULT_PRESET_BOUNDS } },
    imageTransform: { offsetX: 0, offsetY: 0, scale: 1 },
    format: "png",
    quality: 0.9,
  };
}

export function getCropBounds(shape: CropShape): CropBounds {
  if (shape.bounds) {
    return { ...shape.bounds };
  }

  const points = shape.points ?? [];
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

function boundsIntersect(a: CropBounds, b: CropBounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function stableNumber(value: number): number {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000;
}

export function validateCropShape(shape: CropShape, imageBounds?: CropBounds): CropValidation {
  if (shape.kind === "polygon" || shape.kind === "freehand") {
    if ((shape.points?.length ?? 0) < 3) {
      return { valid: false, reason: "not-enough-points" };
    }
    if (!shape.closed) {
      return { valid: false, reason: "shape-not-closed" };
    }
  }

  const bounds = getCropBounds(shape);
  if (bounds.width < 0.05 || bounds.height < 0.05) {
    return { valid: false, reason: "shape-too-small" };
  }
  if (imageBounds && !boundsIntersect(bounds, imageBounds)) {
    return { valid: false, reason: "outside-image" };
  }
  return { valid: true };
}

export function getImageStageBounds(
  sourceWidth: number,
  sourceHeight: number,
  transform: ImageTransform
): CropBounds {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Image dimensions must be positive.");
  }
  const aspect = sourceWidth / sourceHeight;
  const fittedWidth = aspect >= 1 ? 1 : aspect;
  const fittedHeight = aspect >= 1 ? 1 / aspect : 1;
  const width = fittedWidth * transform.scale;
  const height = fittedHeight * transform.scale;
  return {
    x: (1 - width) / 2 + transform.offsetX,
    y: (1 - height) / 2 + transform.offsetY,
    width,
    height,
  };
}

export function stagePointToSource(
  point: CropPoint,
  sourceWidth: number,
  sourceHeight: number,
  transform: ImageTransform
): CropPoint {
  const image = getImageStageBounds(sourceWidth, sourceHeight, transform);
  return {
    x: stableNumber(((point.x - image.x) / image.width) * sourceWidth),
    y: stableNumber(((point.y - image.y) / image.height) * sourceHeight),
  };
}

export function createCropRenderPlan(
  sourceWidth: number,
  sourceHeight: number,
  settings: CropSettings
): CropRenderPlan {
  const imageBounds = getImageStageBounds(sourceWidth, sourceHeight, settings.imageTransform);
  const validation = validateCropShape(settings.shape, imageBounds);
  if (!validation.valid) {
    throw new Error(`Invalid crop shape: ${validation.reason}`);
  }

  const shapeBounds = getCropBounds(settings.shape);
  const pixelsPerStageUnit = sourceWidth / imageBounds.width;
  const mimeType = settings.shape.kind === "rectangle" ? MIME_BY_FORMAT[settings.format] : "image/png";
  return {
    outputWidth: Math.max(1, Math.round(shapeBounds.width * pixelsPerStageUnit)),
    outputHeight: Math.max(1, Math.round(shapeBounds.height * pixelsPerStageUnit)),
    mimeType,
    quality: Math.min(1, Math.max(0, settings.quality)),
    background: mimeType === "image/jpeg" ? "#ffffff" : null,
    shapeBounds,
    pixelsPerStageUnit,
    imageDestination: {
      x: (imageBounds.x - shapeBounds.x) * pixelsPerStageUnit,
      y: (imageBounds.y - shapeBounds.y) * pixelsPerStageUnit,
      width: imageBounds.width * pixelsPerStageUnit,
      height: imageBounds.height * pixelsPerStageUnit,
    },
  };
}
