import type { FileProcessResult } from "../../types/tool";

export interface CollageOptions {
  layout: "vertical" | "horizontal" | "grid";
  width: number;
  gap: number;
  columns: number;
}
export interface ImageDimensions { width: number; height: number }
export interface CollagePlacement extends ImageDimensions { x: number; y: number }
export const COLLAGE_MAX_FILES = 20;
export const COLLAGE_MAX_PIXELS = 24_000_000;

export function calculateCollageLayout(images: ImageDimensions[], options: CollageOptions): {
  width: number; height: number; placements: CollagePlacement[];
} {
  const { width, gap, layout } = options;
  if (!images.length || images.length > COLLAGE_MAX_FILES || !Number.isInteger(width) || width < 100 || width > 4096 || !Number.isInteger(gap) || gap < 0 || gap > 200 || !Number.isInteger(options.columns) || options.columns < 1 || options.columns > 6 || !["vertical", "horizontal", "grid"].includes(layout)) {
    throw new Error("invalid-options");
  }
  if (images.some(image => !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0)) throw new Error("invalid-image");
  const placements: CollagePlacement[] = [];
  let height = 0;
  if (layout === "vertical") {
    images.forEach(image => {
      const itemHeight = width * image.height / image.width;
      placements.push({ x: 0, y: height, width, height: itemHeight });
      height += itemHeight + gap;
    });
    height -= gap;
  } else if (layout === "horizontal") {
    const available = width - gap * (images.length - 1);
    if (available <= 0) throw new Error("invalid-options");
    height = available / images.reduce((sum, image) => sum + image.width / image.height, 0);
    let x = 0;
    images.forEach(image => {
      const itemWidth = height * image.width / image.height;
      placements.push({ x, y: 0, width: itemWidth, height });
      x += itemWidth + gap;
    });
  } else {
    const columns = Math.min(options.columns, images.length);
    const cell = (width - gap * (columns - 1)) / columns;
    if (cell < 1) throw new Error("invalid-options");
    height = Math.ceil(images.length / columns) * (cell + gap) - gap;
    images.forEach((image, index) => {
      const scale = Math.min(cell / image.width, cell / image.height);
      const itemWidth = image.width * scale;
      const itemHeight = image.height * scale;
      placements.push({ x: (index % columns) * (cell + gap) + (cell - itemWidth) / 2, y: Math.floor(index / columns) * (cell + gap) + (cell - itemHeight) / 2, width: itemWidth, height: itemHeight });
    });
  }
  height = Math.max(1, Math.ceil(height));
  if (height > 16384 || width * height > COLLAGE_MAX_PIXELS) throw new Error("canvas-limit");
  return { width, height, placements };
}

export async function createCollage(files: File[], options: CollageOptions & { background: string; format: "jpeg" | "png" }, signal?: AbortSignal): Promise<FileProcessResult> {
  if (!files.length || files.length > COLLAGE_MAX_FILES || files.reduce((sum, file) => sum + file.size, 0) > 150 * 1024 * 1024) throw new Error("batch-limit");
  if (!/^#[0-9a-f]{6}$/i.test(options.background) || !["jpeg", "png"].includes(options.format)) throw new Error("invalid-options");
  const dimensions: ImageDimensions[] = [];
  let canvas: HTMLCanvasElement | undefined;
  const check = (): void => { if (signal?.aborted) throw new DOMException("Cancelled", "AbortError"); };
  try {
    for (const file of files) {
      check();
      if (file.size > 50 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("invalid-image");
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width > 8192 || bitmap.height > 8192 || bitmap.width * bitmap.height > 20_000_000) throw new Error("invalid-image");
        dimensions.push({ width: bitmap.width, height: bitmap.height });
      } finally { bitmap.close(); }
    }
    check();
    const plan = calculateCollageLayout(dimensions, options);
    canvas = document.createElement("canvas");
    canvas.width = plan.width;
    canvas.height = plan.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-unavailable");
    context.fillStyle = options.background;
    context.fillRect(0, 0, plan.width, plan.height);
    // Decode and release one source at a time, so a group of phone photos does
    // not keep every full-resolution bitmap resident alongside the output.
    for (let index = 0; index < files.length; index += 1) {
      check();
      const bitmap = await createImageBitmap(files[index]);
      try {
        check();
        const placement = plan.placements[index];
        context.drawImage(bitmap, placement.x, placement.y, placement.width, placement.height);
      } finally { bitmap.close(); }
    }
    const mimeType = `image/${options.format}`;
    const blob = await new Promise<Blob>((resolve, reject) => canvas!.toBlob(value => value ? resolve(value) : reject(new Error("export-failed")), mimeType, 0.9));
    check();
    return { blob, fileName: options.layout === "vertical" ? `long-image.${options.format === "jpeg" ? "jpg" : "png"}` : `collage.${options.format === "jpeg" ? "jpg" : "png"}`, mimeType, size: blob.size, width: plan.width, height: plan.height };
  } finally {
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
