import type {
  FileProcessResult,
  ImageCompressOptions,
  ImageConvertOptions,
  ImageResizeOptions,
} from "../../types/tool";
import { decodeAvif, encodeAvif } from "./avifService";

const mimeMap: Record<ImageResizeOptions["format"], string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

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

async function withCanvasImageBitmap(file: File, cb: (bitmap: ImageBitmap) => Promise<FileProcessResult>): Promise<FileProcessResult> {
  const bitmap = await createImageBitmap(file);
  try {
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
  return withCanvasImageBitmap(file, async (bitmap) => {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable.");
    }
    context.drawImage(bitmap, 0, 0);

    const quality = clampPercent(options.quality);
    const blob = await toBlobPromise(canvas, mimeMap[options.format], quality);
    return {
      blob,
      fileName: filenameWithExtension(file.name, resolveFileExtension(options.format)),
      mimeType: mimeMap[options.format],
      size: blob.size,
    };
  });
}
