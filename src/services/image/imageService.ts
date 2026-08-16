import type {
  FileProcessResult,
  ImageCompressOptions,
  ImageConvertOptions,
  ImageResizeOptions,
} from "../../types/tool";

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
  return withCanvasImageBitmap(file, async (bitmap) => {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable.");
    }
    context.drawImage(bitmap, 0, 0);

    const blob = await toBlobPromise(canvas, mimeMap[options.format], 0.92);
    return {
      blob,
      fileName: filenameWithExtension(file.name, resolveFileExtension(options.format)),
      mimeType: mimeMap[options.format],
      size: blob.size,
    };
  });
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
