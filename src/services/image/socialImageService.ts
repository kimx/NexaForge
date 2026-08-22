import type { FileProcessResult } from "../../types/tool";

export type ImageFit = "cover" | "contain";
export type SocialImageFormat = "jpeg" | "png";

export interface SocialImageRequest {
  id: string;
  label: string;
  width: number;
  height: number;
  fit: ImageFit;
  format: SocialImageFormat;
  background?: string;
}

export interface ImageDrawRect {
  sx: number; sy: number; sWidth: number; sHeight: number;
  dx: number; dy: number; dWidth: number; dHeight: number;
}

interface SocialImageDependencies {
  decode: (file: File) => Promise<ImageBitmap>;
  render: (bitmap: ImageBitmap, request: SocialImageRequest) => Promise<Blob>;
}

export const SOCIAL_PRESETS: ReadonlyArray<Omit<SocialImageRequest, "fit" | "format">> = [
  { id: "instagram-square", label: "Instagram square", width: 1080, height: 1080 },
  { id: "instagram-portrait", label: "Instagram portrait", width: 1080, height: 1350 },
  { id: "facebook-post", label: "Facebook post", width: 1200, height: 630 },
  { id: "x-post", label: "X post", width: 1600, height: 900 },
  { id: "linkedin-post", label: "LinkedIn post", width: 1200, height: 627 },
  { id: "youtube-thumbnail", label: "YouTube thumbnail", width: 1280, height: 720 },
];

export function calculateFitRect(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, fit: ImageFit): ImageDrawRect {
  if ([sourceWidth, sourceHeight, targetWidth, targetHeight].some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Image dimensions must be positive.");
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (fit === "cover") {
    const sWidth = sourceRatio > targetRatio ? sourceHeight * targetRatio : sourceWidth;
    const sHeight = sourceRatio > targetRatio ? sourceHeight : sourceWidth / targetRatio;
    return { sx: (sourceWidth - sWidth) / 2, sy: (sourceHeight - sHeight) / 2, sWidth, sHeight, dx: 0, dy: 0, dWidth: targetWidth, dHeight: targetHeight };
  }
  const dWidth = sourceRatio > targetRatio ? targetWidth : targetHeight * sourceRatio;
  const dHeight = sourceRatio > targetRatio ? targetWidth / sourceRatio : targetHeight;
  return { sx: 0, sy: 0, sWidth: sourceWidth, sHeight: sourceHeight, dx: (targetWidth - dWidth) / 2, dy: (targetHeight - dHeight) / 2, dWidth, dHeight };
}

function canvasBlob(canvas: HTMLCanvasElement, mimeType: string, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to serialize image.")), mimeType, quality));
}

async function renderSocialImage(bitmap: ImageBitmap, request: SocialImageRequest): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = request.width; canvas.height = request.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context unavailable.");
  if (request.background || request.format === "jpeg") {
    context.fillStyle = request.background ?? "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const rect = calculateFitRect(bitmap.width, bitmap.height, canvas.width, canvas.height, request.fit);
  context.drawImage(bitmap, rect.sx, rect.sy, rect.sWidth, rect.sHeight, rect.dx, rect.dy, rect.dWidth, rect.dHeight);
  return canvasBlob(canvas, request.format === "png" ? "image/png" : "image/jpeg");
}

function safeName(value: string): string {
  return value.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "image";
}

export async function generateSocialImages(file: File, requests: SocialImageRequest[], dependencies?: SocialImageDependencies): Promise<FileProcessResult[]> {
  if (!requests.length) throw new Error("Select at least one output size.");
  requests.forEach(({ width, height }) => {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16 || width > 4096 || height > 4096) throw new Error("Output dimensions must be whole numbers from 16 to 4096 pixels.");
  });
  const decode = dependencies?.decode ?? createImageBitmap;
  const render = dependencies?.render ?? renderSocialImage;
  const bitmap = await decode(file);
  try {
    const results: FileProcessResult[] = [];
    for (const request of requests) {
      try {
        const blob = await render(bitmap, request);
        const extension = request.format === "png" ? "png" : "jpg";
        const mimeType = request.format === "png" ? "image/png" : "image/jpeg";
        results.push({ blob, fileName: `${safeName(file.name)}-${safeName(request.id)}-${request.width}x${request.height}.${extension}`, mimeType, size: blob.size });
      } catch {
        // Preserve successful outputs when an individual canvas serialization fails.
      }
    }
    if (!results.length) throw new Error("Unable to generate any selected output.");
    return results;
  } finally {
    bitmap.close();
  }
}
