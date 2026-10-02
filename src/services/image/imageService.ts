import type {
  FileProcessResult,
  ImageCompressOptions,
  ImageConvertOptions,
  ImageResizeOptions,
  ImageTargetCompressOptions,
} from "../../types/tool";
import { decodeAvif, encodeAvif } from "./avifService";

const mimeMap: Record<ImageResizeOptions["format"], string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const MIN_TARGET_QUALITY = 0.01;
const MAX_TARGET_QUALITY_ITERATIONS = 8;
const MAX_TARGET_RESIZE_ITERATIONS = 8;

function resolveFileExtension(format: ImageResizeOptions["format"]): string {
  switch (format) {
    case "jpeg":
      return ".jpg";
    case "png":
      return ".png";
    case "webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

function filenameWithExtension(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return `${baseName}${extension}`;
}

function convertFormatDetails(format: ImageConvertOptions["format"]): { mime: string; extension: string } {
  if (format === "avif") return { mime: "image/avif", extension: ".avif" };
  return { mime: mimeMap[format], extension: resolveFileExtension(format) };
}

function clampPercent(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortError();
  }
}

async function withCanvasImageBitmap(
  file: File,
  cb: (bitmap: ImageBitmap) => Promise<FileProcessResult>,
  signal?: AbortSignal
): Promise<FileProcessResult> {
  throwIfAborted(signal);
  const bitmap = await createImageBitmap(file);
  try {
    throwIfAborted(signal);
    return await cb(bitmap);
  } finally {
    bitmap.close();
  }
}

function toBlobPromise(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to serialize image from canvas."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

async function renderBitmap(
  file: File,
  bitmap: ImageBitmap,
  width: number,
  height: number,
  format: ImageResizeOptions["format"],
  quality: number,
  signal?: AbortSignal
): Promise<FileProcessResult> {
  throwIfAborted(signal);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await toBlobPromise(canvas, mimeMap[format], quality);
  throwIfAborted(signal);
  return {
    blob,
    fileName: filenameWithExtension(file.name, resolveFileExtension(format)),
    mimeType: mimeMap[format],
    size: blob.size,
    width,
    height,
  };
}

export async function resizeImage(file: File, options: ImageResizeOptions): Promise<FileProcessResult> {
  return withCanvasImageBitmap(file, async (bitmap) => {
    const quality = clampPercent(options.quality);
    let width = Number.isFinite(options.width) ? options.width : 0;
    let height = Number.isFinite(options.height) ? options.height : 0;
    const ratio = bitmap.width / bitmap.height;

    if (options.keepAspectRatio) {
      if (width > 0) {
        height = Math.max(1, Math.round(width / ratio));
      } else if (height > 0) {
        width = Math.max(1, Math.round(height * ratio));
      } else {
        width = bitmap.width;
        height = bitmap.height;
      }
    } else {
      width = width > 0 ? width : bitmap.width;
      height = height > 0 ? height : bitmap.height;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable.");
    }
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await toBlobPromise(canvas, mimeMap[options.format], quality);
    return {
      blob,
      fileName: filenameWithExtension(file.name, resolveFileExtension(options.format)),
      mimeType: mimeMap[options.format],
      size: blob.size,
    };
  });
}

export async function convertImage(file: File, options: ImageConvertOptions): Promise<FileProcessResult> {
  const drawBitmap = async (bitmap: ImageBitmap): Promise<FileProcessResult> => {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable.");
    }
    context.drawImage(bitmap, 0, 0);

    const details = convertFormatDetails(options.format);
    let blob: Blob;
    if (options.format === "avif") {
      try {
        const native = await toBlobPromise(canvas, details.mime, 0.82);
        blob = native.type === details.mime ? native : await encodeAvif(context.getImageData(0, 0, canvas.width, canvas.height), 82);
      } catch {
        blob = await encodeAvif(context.getImageData(0, 0, canvas.width, canvas.height), 82);
      }
    } else {
      blob = await toBlobPromise(canvas, details.mime, 0.92);
    }
    return {
      blob,
      fileName: filenameWithExtension(file.name, details.extension),
      mimeType: details.mime,
      size: blob.size,
    };
  };

  try {
    return await withCanvasImageBitmap(file, drawBitmap);
  } catch (cause) {
    if (file.type !== "image/avif" && !/\.avif$/i.test(file.name)) throw cause;
    const image = await decodeAvif(file);
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable.");
    context.putImageData(image, 0, 0);
    const details = convertFormatDetails(options.format);
    const blob = options.format === "avif" ? await encodeAvif(image, 82) : await toBlobPromise(canvas, details.mime, 0.92);
    return { blob, fileName: filenameWithExtension(file.name, details.extension), mimeType: details.mime, size: blob.size };
  }
}

export async function compressImage(file: File, options: ImageCompressOptions): Promise<FileProcessResult> {
  return withCanvasImageBitmap(
    file,
    async (bitmap) => {
      const result = await renderBitmap(
        file,
        bitmap,
        bitmap.width,
        bitmap.height,
        options.format,
        clampPercent(options.quality),
        options.signal
      );
      return { ...result, originalWidth: bitmap.width, originalHeight: bitmap.height };
    },
    options.signal
  );
}

interface TargetAttempt {
  result: FileProcessResult;
  met: boolean;
}

function targetStatusFor(attempt: TargetAttempt, width: number, height: number): NonNullable<FileProcessResult["targetStatus"]> {
  if (attempt.met) {
    return "met";
  }
  return width > 1 || height > 1 ? "resize-available" : "unmet";
}

function targetResult(attempt: TargetAttempt, targetBytes: number, originalWidth: number, originalHeight: number): FileProcessResult {
  return {
    ...attempt.result,
    originalWidth,
    originalHeight,
    targetBytes,
    targetStatus: targetStatusFor(attempt, attempt.result.width ?? originalWidth, attempt.result.height ?? originalHeight),
  };
}

async function findQualityCandidate(
  file: File,
  bitmap: ImageBitmap,
  width: number,
  height: number,
  options: ImageTargetCompressOptions
): Promise<TargetAttempt> {
  const signal = options.signal;
  const highQuality = await renderBitmap(file, bitmap, width, height, options.format, 1, signal);
  if (highQuality.size <= options.targetBytes) {
    return { result: highQuality, met: true };
  }

  const lowQuality = await renderBitmap(file, bitmap, width, height, options.format, MIN_TARGET_QUALITY, signal);
  if (lowQuality.size > options.targetBytes) {
    return { result: lowQuality, met: false };
  }

  let best = lowQuality;
  let low = MIN_TARGET_QUALITY;
  let high = 1;
  for (let iteration = 0; iteration < MAX_TARGET_QUALITY_ITERATIONS; iteration += 1) {
    throwIfAborted(signal);
    const quality = (low + high) / 2;
    const candidate = await renderBitmap(file, bitmap, width, height, options.format, quality, signal);
    if (candidate.size <= options.targetBytes) {
      best = candidate;
      low = quality;
    } else {
      high = quality;
    }
  }

  return { result: best, met: true };
}

function scaledDimensions(width: number, height: number, scale: number): { width: number; height: number } {
  return {
    width: Math.max(1, Math.min(width, Math.round(width * scale))),
    height: Math.max(1, Math.min(height, Math.round(height * scale))),
  };
}

export async function compressImageToTarget(file: File, options: ImageTargetCompressOptions): Promise<FileProcessResult> {
  if (!Number.isFinite(options.targetBytes) || options.targetBytes <= 0) {
    throw new Error("Target size must be greater than zero.");
  }

  return withCanvasImageBitmap(
    file,
    async (bitmap) => {
      const originalWidth = bitmap.width;
      const originalHeight = bitmap.height;
      const original = await findQualityCandidate(file, bitmap, originalWidth, originalHeight, options);
      if (original.met || !options.allowResize || (originalWidth <= 1 && originalHeight <= 1)) {
        return targetResult(original, options.targetBytes, originalWidth, originalHeight);
      }

      const smallestScale = 1 / Math.max(originalWidth, originalHeight);
      const smallest = scaledDimensions(originalWidth, originalHeight, smallestScale);
      const smallestAttempt = await findQualityCandidate(file, bitmap, smallest.width, smallest.height, options);
      if (!smallestAttempt.met) {
        return targetResult(smallestAttempt, options.targetBytes, originalWidth, originalHeight);
      }

      let best = smallestAttempt;
      let lowScale = smallestScale;
      let highScale = 1;
      let previousDimensions = `${smallest.width}x${smallest.height}`;
      for (let iteration = 0; iteration < MAX_TARGET_RESIZE_ITERATIONS; iteration += 1) {
        throwIfAborted(options.signal);
        const scale = (lowScale + highScale) / 2;
        const dimensions = scaledDimensions(originalWidth, originalHeight, scale);
        const dimensionKey = `${dimensions.width}x${dimensions.height}`;
        if (dimensionKey === previousDimensions) {
          highScale = scale;
          continue;
        }
        previousDimensions = dimensionKey;
        const attempt = await findQualityCandidate(file, bitmap, dimensions.width, dimensions.height, options);
        if (attempt.met) {
          best = attempt;
          lowScale = scale;
        } else {
          highScale = scale;
        }
      }

      return targetResult(best, options.targetBytes, originalWidth, originalHeight);
    },
    options.signal
  );
}
