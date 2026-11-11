import type { CropSettings } from "../types/imageCrop";
import { createDefaultCropSettings, getImageStageBounds } from "./imageCropGeometry";

export function createIdPhotoCrop(ratio: number): CropSettings {
  const settings = createDefaultCropSettings();
  const width = Math.min(0.8, 0.8 * ratio);
  const height = width / ratio;
  return { ...settings, format: "png", shape: { kind: "rectangle", aspectRatio: ratio, bounds: { x: (1 - width) / 2, y: (1 - height) / 2, width, height } } };
}

export function fitIdPhotoCrop(settings: CropSettings, ratio: number, source: { width: number; height: number }): CropSettings {
  const bounds = settings.shape.bounds ?? createIdPhotoCrop(ratio).shape.bounds!;
  const width = Math.min(bounds.width, bounds.height * ratio);
  const shape = { kind: "rectangle" as const, aspectRatio: ratio, bounds: { ...bounds, width, height: width / ratio } };
  const transform = { ...settings.imageTransform };
  let image = getImageStageBounds(source.width, source.height, transform);
  transform.scale *= Math.max(1, shape.bounds.width / image.width, shape.bounds.height / image.height);
  image = getImageStageBounds(source.width, source.height, transform);
  const x = Math.min(shape.bounds.x, Math.max(shape.bounds.x + shape.bounds.width - image.width, image.x));
  const y = Math.min(shape.bounds.y, Math.max(shape.bounds.y + shape.bounds.height - image.height, image.y));
  transform.offsetX += x - image.x;
  transform.offsetY += y - image.y;
  return { ...settings, shape, imageTransform: transform, format: "png" };
}
