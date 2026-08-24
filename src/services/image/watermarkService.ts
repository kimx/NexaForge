export interface WatermarkPosition {
  x: number;
  y: number;
}

export type WatermarkPreset =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface SharedWatermarkOptions {
  position: WatermarkPosition;
  opacity: number;
  rotation: number;
}

export interface TextWatermarkOptions extends SharedWatermarkOptions {
  mode: "text";
  text: string;
  fontFamily: string;
  color: string;
  sizeRatio: number;
}

export interface ImageWatermarkOptions extends SharedWatermarkOptions {
  mode: "image";
  logo: File;
  widthRatio: number;
}

export type WatermarkOptions = TextWatermarkOptions | ImageWatermarkOptions;

export interface Size {
  width: number;
  height: number;
}

function isInRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

export function validateWatermarkOptions(options: WatermarkOptions): string[] {
  const errors: string[] = [];
  if (options.mode === "text" && !options.text.trim()) {
    errors.push("Watermark text is required.");
  }
  if (!isInRange(options.opacity, 0.05, 1)) {
    errors.push("Opacity must be between 0.05 and 1.");
  }
  if (!isInRange(options.rotation, -180, 180)) {
    errors.push("Rotation must be between -180 and 180 degrees.");
  }
  if (!isInRange(options.position.x, 0, 1) || !isInRange(options.position.y, 0, 1)) {
    errors.push("Position must stay between 0 and 1.");
  }
  if (options.mode === "text" && !isInRange(options.sizeRatio, 0.01, 0.5)) {
    errors.push("Text size must be between 0.01 and 0.5.");
  }
  if (options.mode === "image" && !isInRange(options.widthRatio, 0.01, 1)) {
    errors.push("Logo width must be between 0.01 and 1.");
  }
  return errors;
}

const PRESET_AXES = {
  left: 0.06,
  center: 0.5,
  right: 0.94,
  top: 0.06,
  middle: 0.5,
  bottom: 0.94,
} as const;

export function getPresetPosition(preset: WatermarkPreset): WatermarkPosition {
  const [vertical, horizontal] = preset === "center" ? ["middle", "center"] : preset.split("-");
  return {
    x: PRESET_AXES[horizontal as "left" | "center" | "right"],
    y: PRESET_AXES[vertical as "top" | "middle" | "bottom"],
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function constrainPosition(
  position: WatermarkPosition,
  canvas: Size,
  layer: Size,
  rotation: number
): WatermarkPosition {
  const radians = rotation * Math.PI / 180;
  const rotatedWidth = Math.abs(layer.width * Math.cos(radians)) + Math.abs(layer.height * Math.sin(radians));
  const rotatedHeight = Math.abs(layer.width * Math.sin(radians)) + Math.abs(layer.height * Math.cos(radians));
  const halfWidthRatio = Math.min(0.5, rotatedWidth / canvas.width / 2);
  const halfHeightRatio = Math.min(0.5, rotatedHeight / canvas.height / 2);

  return {
    x: clamp(position.x, halfWidthRatio, 1 - halfWidthRatio),
    y: clamp(position.y, halfHeightRatio, 1 - halfHeightRatio),
  };
}

function imageSize(source: CanvasImageSource): Size {
  const candidate = source as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
  return {
    width: candidate.naturalWidth ?? candidate.width ?? 0,
    height: candidate.naturalHeight ?? candidate.height ?? 0,
  };
}

export function drawWatermark(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  options: WatermarkOptions,
  logo?: CanvasImageSource
): void {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (options.mode === "image") {
    if (!logo) {
      throw new Error("A logo image is required.");
    }
    const logoSize = imageSize(logo);
    const width = canvas.width * options.widthRatio;
    const height = width * logoSize.height / logoSize.width;
    const position = constrainPosition(options.position, canvas, { width, height }, options.rotation);
    context.save();
    try {
      context.globalAlpha = options.opacity;
      context.translate(position.x * canvas.width, position.y * canvas.height);
      context.rotate(options.rotation * Math.PI / 180);
      context.drawImage(logo, -width / 2, -height / 2, width, height);
    } finally {
      context.restore();
    }
    return;
  }

  const fontSize = Math.max(1, Math.round(Math.min(canvas.width, canvas.height) * options.sizeRatio));
  context.font = `${fontSize}px ${options.fontFamily}`;
  const layer = { width: context.measureText(options.text).width, height: fontSize * 1.2 };
  const position = constrainPosition(options.position, canvas, layer, options.rotation);

  context.save();
  try {
    context.globalAlpha = options.opacity;
    context.fillStyle = options.color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.translate(position.x * canvas.width, position.y * canvas.height);
    context.rotate(options.rotation * Math.PI / 180);
    context.fillText(options.text, 0, 0);
  } finally {
    context.restore();
  }
}

function outputDetails(file: File): { mimeType: "image/jpeg" | "image/png" | "image/webp"; extension: string } {
  if (file.type === "image/png") return { mimeType: "image/png", extension: ".png" };
  if (file.type === "image/webp") return { mimeType: "image/webp", extension: ".webp" };
  if (file.type === "image/jpeg") return { mimeType: "image/jpeg", extension: ".jpg" };
  throw new Error("Unsupported image format.");
}

function serializeCanvas(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const quality = mimeType === "image/png" ? undefined : 0.92;
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to serialize watermarked image."));
    }, mimeType, quality);
  });
}

export async function applyWatermark(file: File, options: WatermarkOptions): Promise<FileProcessResult> {
  const validationErrors = validateWatermarkOptions(options);
  if (validationErrors.length) {
    throw new Error(validationErrors[0]);
  }
  const source = await createImageBitmap(file);
  let logo: ImageBitmap | undefined;
  try {
    if (options.mode === "image") {
      logo = await createImageBitmap(options.logo);
    }
    const canvas = document.createElement("canvas");
    const size = imageSize(source);
    canvas.width = size.width;
    canvas.height = size.height;
    drawWatermark(canvas, source, options, logo);
    const details = outputDetails(file);
    const blob = await serializeCanvas(canvas, details.mimeType);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return {
      blob,
      fileName: `${baseName}-watermarked${details.extension}`,
      mimeType: details.mimeType,
      size: blob.size,
    };
  } finally {
    logo?.close();
    source.close();
  }
}
import type { FileProcessResult } from "../../types/tool";
