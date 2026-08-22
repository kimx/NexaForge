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
    width: stableNumber(Math.max(...xs) - x),
    height: stableNumber(Math.max(...ys) - y),
  };
}

function boundsIntersect(a: CropBounds, b: CropBounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function stableNumber(value: number): number {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000;
}

function orientation(a: CropPoint, b: CropPoint, c: CropPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function isPointOnSegment(a: CropPoint, b: CropPoint, point: CropPoint): boolean {
  const epsilon = 1e-12;
  return (
    Math.abs(orientation(a, b, point)) <= epsilon &&
    point.x >= Math.min(a.x, b.x) - epsilon &&
    point.x <= Math.max(a.x, b.x) + epsilon &&
    point.y >= Math.min(a.y, b.y) - epsilon &&
    point.y <= Math.max(a.y, b.y) + epsilon
  );
}

export function segmentsIntersect(a: CropPoint, b: CropPoint, c: CropPoint, d: CropPoint): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);

  if ((abC > 0) !== (abD > 0) && (cdA > 0) !== (cdB > 0)) {
    return true;
  }
  return (
    isPointOnSegment(a, b, c) ||
    isPointOnSegment(a, b, d) ||
    isPointOnSegment(c, d, a) ||
    isPointOnSegment(c, d, b)
  );
}

export function hasSelfIntersection(points: CropPoint[]): boolean {
  const edgeCount = points.length;
  if (edgeCount < 4) {
    return false;
  }

  for (let first = 0; first < edgeCount; first += 1) {
    const firstNext = (first + 1) % edgeCount;
    for (let second = first + 1; second < edgeCount; second += 1) {
      const secondNext = (second + 1) % edgeCount;
      const adjacent = firstNext === second || secondNext === first;
      if (adjacent) {
        continue;
      }
      if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) {
        return true;
      }
    }
  }
  return false;
}

function squaredDistanceToSegment(point: CropPoint, start: CropPoint, end: CropPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  }
  const amount = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx ** 2 + dy ** 2)));
  const nearestX = start.x + amount * dx;
  const nearestY = start.y + amount * dy;
  return (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2;
}

function simplifySection(points: CropPoint[], toleranceSquared: number): CropPoint[] {
  if (points.length <= 2) {
    return points;
  }

  let largestDistance = 0;
  let largestIndex = -1;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = squaredDistanceToSegment(points[index], points[0], points[points.length - 1]);
    if (distance > largestDistance) {
      largestDistance = distance;
      largestIndex = index;
    }
  }

  if (largestIndex === -1 || largestDistance <= toleranceSquared) {
    return [points[0], points[points.length - 1]];
  }
  const left = simplifySection(points.slice(0, largestIndex + 1), toleranceSquared);
  const right = simplifySection(points.slice(largestIndex), toleranceSquared);
  return [...left.slice(0, -1), ...right];
}

export function simplifyFreehandPoints(points: CropPoint[], tolerance = 0.003, maxPoints = 500): CropPoint[] {
  const clamped = points
    .map((point) => ({
      x: Math.min(2, Math.max(-1, point.x)),
      y: Math.min(2, Math.max(-1, point.y)),
    }))
    .filter((point, index, list) => index === 0 || point.x !== list[index - 1].x || point.y !== list[index - 1].y);
  const simplified = simplifySection(clamped, tolerance ** 2);
  if (simplified.length <= maxPoints) {
    return simplified;
  }

  const thinned: CropPoint[] = [];
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round((index * (simplified.length - 1)) / (maxPoints - 1));
    thinned.push(simplified[sourceIndex]);
  }
  return thinned;
}

export function validateCropShape(shape: CropShape, imageBounds?: CropBounds): CropValidation {
  if (shape.kind === "polygon" || shape.kind === "freehand") {
    if ((shape.points?.length ?? 0) < 3) {
      return { valid: false, reason: "not-enough-points" };
    }
    if (!shape.closed) {
      return { valid: false, reason: "shape-not-closed" };
    }
    if (shape.kind === "polygon" && hasSelfIntersection(shape.points ?? [])) {
      return { valid: false, reason: "self-intersection" };
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

type CropPathContext = Pick<
  CanvasRenderingContext2D,
  "moveTo" | "lineTo" | "bezierCurveTo" | "ellipse" | "rect" | "closePath"
>;

function mappedBounds(bounds: CropBounds, mapPoint: (point: CropPoint) => CropPoint): CropBounds {
  const topLeft = mapPoint({ x: bounds.x, y: bounds.y });
  const bottomRight = mapPoint({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

export function traceCropPath(
  context: CropPathContext,
  shape: CropShape,
  mapPoint: (point: CropPoint) => CropPoint
): void {
  if (shape.kind === "polygon" || shape.kind === "freehand") {
    const points = shape.points ?? [];
    if (points.length === 0) {
      return;
    }
    const first = mapPoint(points[0]);
    context.moveTo(first.x, first.y);
    points.slice(1).forEach((point) => {
      const mapped = mapPoint(point);
      context.lineTo(mapped.x, mapped.y);
    });
    if (shape.closed) {
      context.closePath();
    }
    return;
  }

  const bounds = mappedBounds(getCropBounds(shape), mapPoint);
  if (shape.kind === "rectangle") {
    context.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    return;
  }

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  if (shape.kind === "circle") {
    context.ellipse(centerX, centerY, Math.abs(bounds.width / 2), Math.abs(bounds.height / 2), 0, 0, Math.PI * 2);
    context.closePath();
    return;
  }

  if (shape.kind === "heart") {
    context.moveTo(centerX, bounds.y + bounds.height * 0.28);
    context.bezierCurveTo(
      bounds.x + bounds.width * 0.2,
      bounds.y - bounds.height * 0.02,
      bounds.x,
      bounds.y + bounds.height * 0.25,
      bounds.x + bounds.width * 0.08,
      bounds.y + bounds.height * 0.48
    );
    context.bezierCurveTo(
      bounds.x + bounds.width * 0.14,
      bounds.y + bounds.height * 0.68,
      centerX,
      bounds.y + bounds.height * 0.9,
      centerX,
      bounds.y + bounds.height
    );
    context.bezierCurveTo(
      centerX,
      bounds.y + bounds.height * 0.9,
      bounds.x + bounds.width * 0.86,
      bounds.y + bounds.height * 0.68,
      bounds.x + bounds.width * 0.92,
      bounds.y + bounds.height * 0.48
    );
    context.bezierCurveTo(
      bounds.x + bounds.width,
      bounds.y + bounds.height * 0.25,
      bounds.x + bounds.width * 0.8,
      bounds.y - bounds.height * 0.02,
      centerX,
      bounds.y + bounds.height * 0.28
    );
    context.closePath();
    return;
  }

  const outerRadius = Math.abs(bounds.width / 2);
  const innerRadius = Math.abs(bounds.width * 0.2245);
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const point = { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  }
  context.closePath();
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
