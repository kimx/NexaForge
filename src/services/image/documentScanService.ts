import type { FileProcessResult } from "../../types/tool";

export interface DocumentPoint { x: number; y: number }
export type DocumentCorners = readonly DocumentPoint[];
export type DocumentMode = "color" | "grayscale" | "contrast";
export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_MAX_SOURCE_PIXELS = 20_000_000;
export const DOCUMENT_MAX_OUTPUT_PIXELS = 4_000_000;
export const DOCUMENT_IMAGE_TYPES = "image/jpeg,image/png,image/webp";
export const DEFAULT_DOCUMENT_CORNERS: DocumentCorners = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
];

export class DocumentScanError extends Error {
  constructor(public readonly code: "geometry" | "limit" | "decode" | "process") {
    super(code);
  }
}

/** Clockwise in screen coordinates: top-left, top-right, bottom-right, bottom-left. */
export function validateDocumentCorners(corners: DocumentCorners): boolean {
  if (corners.length !== 4 || corners.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1)) return false;
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4], c = corners[(i + 2) % 4];
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) <= 1e-8) return false;
    area += a.x * b.y - a.y * b.x;
  }
  return area >= 0.0002;
}

function projectiveCoefficients(corners: DocumentCorners): number[] {
  if (!validateDocumentCorners(corners)) throw new DocumentScanError("geometry");
  const [p0, p1, p2, p3] = corners;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  const determinant = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  return [p1.x - p0.x + g * p1.x, p3.x - p0.x + h * p3.x, p0.x,
    p1.y - p0.y + g * p1.y, p3.y - p0.y + h * p3.y, p0.y, g, h];
}

function mapPoint(coefficients: number[], u: number, v: number): DocumentPoint {
  const [a, b, c, d, e, f, g, h] = coefficients;
  const denominator = g * u + h * v + 1;
  return { x: (a * u + b * v + c) / denominator, y: (d * u + e * v + f) / denominator };
}

export function mapDocumentPoint(corners: DocumentCorners, u: number, v: number): DocumentPoint {
  return mapPoint(projectiveCoefficients(corners), u, v);
}

function checkDimensions(width: number, height: number, limit: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8192 || height > 8192 || width * height > limit) throw new DocumentScanError("limit");
}

function renderRows(source: Uint8ClampedArray, sw: number, sh: number, target: Uint8ClampedArray, tw: number, th: number, coefficients: number[], mode: DocumentMode, start: number, end: number): void {
  for (let y = start; y < end; y++) {
    for (let x = 0; x < tw; x++) {
      const point = mapPoint(coefficients, tw === 1 ? 0.5 : x / (tw - 1), th === 1 ? 0.5 : y / (th - 1));
      const sx = Math.max(0, Math.min(sw - 1, point.x * (sw - 1)));
      const sy = Math.max(0, Math.min(sh - 1, point.y * (sh - 1)));
      const left = Math.floor(sx), top = Math.floor(sy), right = Math.min(sw - 1, left + 1), bottom = Math.min(sh - 1, top + 1);
      const fx = sx - left, fy = sy - top;
      const indices = [(top * sw + left) * 4, (top * sw + right) * 4, (bottom * sw + left) * 4, (bottom * sw + right) * 4];
      const weights = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy];
      const offset = (y * tw + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        let value = 0;
        for (let i = 0; i < 4; i++) {
          const alpha = source[indices[i] + 3] / 255;
          value += (source[indices[i] + channel] * alpha + 255 * (1 - alpha)) * weights[i];
        }
        target[offset + channel] = value;
      }
      if (mode !== "color") {
        const gray = Math.round(target[offset] * 0.299 + target[offset + 1] * 0.587 + target[offset + 2] * 0.114);
        const value = mode === "contrast" ? (gray >= 128 ? 255 : 0) : gray;
        target[offset] = target[offset + 1] = target[offset + 2] = value;
      }
      target[offset + 3] = 255;
    }
  }
}

export function rectifyDocumentPixels(source: Uint8ClampedArray, sourceWidth: number, sourceHeight: number, corners: DocumentCorners, outputWidth: number, outputHeight: number, mode: DocumentMode): Uint8ClampedArray {
  checkDimensions(sourceWidth, sourceHeight, DOCUMENT_MAX_SOURCE_PIXELS);
  checkDimensions(outputWidth, outputHeight, DOCUMENT_MAX_OUTPUT_PIXELS);
  if (source.length !== sourceWidth * sourceHeight * 4) throw new DocumentScanError("process");
  const coefficients = projectiveCoefficients(corners);
  const output = new Uint8ClampedArray(outputWidth * outputHeight * 4);
  renderRows(source, sourceWidth, sourceHeight, output, outputWidth, outputHeight, coefficients, mode, 0, outputHeight);
  return output;
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
}

export async function scanDocument(file: File, corners: DocumentCorners, mode: DocumentMode, signal?: AbortSignal): Promise<FileProcessResult> {
  checkAborted(signal);
  if (file.size > DOCUMENT_MAX_BYTES) throw new DocumentScanError("limit");
  if (!DOCUMENT_IMAGE_TYPES.split(",").includes(file.type)) throw new DocumentScanError("decode");
  const coefficients = projectiveCoefficients(corners);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new DocumentScanError("decode"); }
  const surfaces: HTMLCanvasElement[] = [];
  try {
    checkAborted(signal);
    checkDimensions(bitmap.width, bitmap.height, DOCUMENT_MAX_SOURCE_PIXELS);
    const distance = (a: DocumentPoint, b: DocumentPoint) => Math.hypot((a.x - b.x) * (bitmap.width - 1), (a.y - b.y) * (bitmap.height - 1));
    const rawWidth = Math.round(Math.max(distance(corners[0], corners[1]), distance(corners[3], corners[2]))) + 1;
    const rawHeight = Math.round(Math.max(distance(corners[0], corners[3]), distance(corners[1], corners[2]))) + 1;
    const scale = Math.min(1, Math.sqrt(DOCUMENT_MAX_OUTPUT_PIXELS / (rawWidth * rawHeight)), 8192 / Math.max(rawWidth, rawHeight));
    const width = Math.max(1, Math.floor(rawWidth * scale)), height = Math.max(1, Math.floor(rawHeight * scale));
    const sourceCanvas = document.createElement("canvas");
    surfaces.push(sourceCanvas);
    sourceCanvas.width = bitmap.width; sourceCanvas.height = bitmap.height;
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) throw new DocumentScanError("process");
    sourceContext.drawImage(bitmap, 0, 0);
    const source = sourceContext.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const canvas = document.createElement("canvas");
    surfaces.push(canvas);
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new DocumentScanError("process");
    const output = context.createImageData(width, height);
    for (let row = 0; row < height; row += 32) {
      checkAborted(signal);
      renderRows(source, bitmap.width, bitmap.height, output.data, width, height, coefficients, mode, row, Math.min(row + 32, height));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    checkAborted(signal);
    context.putImageData(output, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new DocumentScanError("process")), "image/jpeg", 0.92));
    checkAborted(signal);
    return { blob, fileName: `${file.name.replace(/\.[^/.]+$/, "") || "document"}-scanned.jpg`, mimeType: "image/jpeg", size: blob.size, width, height };
  } finally {
    bitmap.close();
    for (const canvas of surfaces) { canvas.width = 0; canvas.height = 0; }
  }
}

export async function createDocumentPdf(result: FileProcessResult): Promise<FileProcessResult> {
  const { createPdfFromImages } = await import("../pdf/conversionService");
  const output = await createPdfFromImages([new File([result.blob], result.fileName, { type: result.mimeType })]);
  return { ...output, fileName: result.fileName.replace(/\.[^/.]+$/, ".pdf") };
}
