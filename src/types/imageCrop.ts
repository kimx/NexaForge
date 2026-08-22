import type { FileProcessResult } from "./tool";

export type CropShapeKind = "rectangle" | "circle" | "heart" | "star" | "polygon" | "freehand";
export type CropFormat = "jpeg" | "png" | "webp";
export type CropValidationReason =
  | "shape-too-small"
  | "not-enough-points"
  | "shape-not-closed"
  | "self-intersection"
  | "outside-image";

export interface CropPoint {
  x: number;
  y: number;
}

export interface CropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropShape {
  kind: CropShapeKind;
  bounds?: CropBounds;
  points?: CropPoint[];
  closed?: boolean;
}

export interface ImageTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface CropSettings {
  shape: CropShape;
  imageTransform: ImageTransform;
  format: CropFormat;
  quality: number;
}

export interface CropValidation {
  valid: boolean;
  reason?: CropValidationReason;
}

export interface CropRenderPlan {
  outputWidth: number;
  outputHeight: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  quality: number;
  background: "#ffffff" | null;
  shapeBounds: CropBounds;
  pixelsPerStageUnit: number;
  imageDestination: CropBounds;
}

export interface ImageCropResult extends FileProcessResult {
  width: number;
  height: number;
}

export interface ImageCropEditorLabels {
  canvas: string;
  presets: string;
  rectangle: string;
  circle: string;
  heart: string;
  star: string;
  polygon: string;
  freehand: string;
  zoom: string;
  undo: string;
  reset: string;
  closeShape: string;
  addPoint: string;
  point: string;
  xCoordinate: string;
  yCoordinate: string;
  resizeShape: string;
}

