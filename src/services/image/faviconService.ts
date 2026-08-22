import type { FileProcessResult } from "../../types/tool";
import { calculateFitRect } from "./socialImageService";

export interface IcoImage {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface FaviconOptions {
  background?: string;
  appName?: string;
}

interface FaviconDependencies {
  decode: (file: File) => Promise<ImageBitmap>;
  renderPng: (bitmap: ImageBitmap, size: number, background?: string) => Promise<Blob>;
}

export function buildIco(images: IcoImage[]): Blob {
  if (!images.length || images.length > 65_535) throw new Error("ICO requires at least one image.");
  const headerSize = 6 + images.length * 16;
  const totalSize = headerSize + images.reduce((total, image) => total + image.data.byteLength, 0);
  const bytes = new Uint8Array(totalSize);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0, true); view.setUint16(2, 1, true); view.setUint16(4, images.length, true);
  let offset = headerSize;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    bytes[entry] = image.width >= 256 ? 0 : image.width;
    bytes[entry + 1] = image.height >= 256 ? 0 : image.height;
    bytes[entry + 2] = 0; bytes[entry + 3] = 0;
    view.setUint16(entry + 4, 1, true); view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, image.data.byteLength, true); view.setUint32(entry + 12, offset, true);
    bytes.set(image.data, offset); offset += image.data.byteLength;
  });
  return new Blob([bytes], { type: "image/x-icon" });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to serialize favicon.")), "image/png"));
}

async function renderPng(bitmap: ImageBitmap, size: number, background?: string): Promise<Blob> {
  const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context unavailable.");
  if (background) { context.fillStyle = background; context.fillRect(0, 0, size, size); }
  const rect = calculateFitRect(bitmap.width, bitmap.height, size, size, "contain");
  context.drawImage(bitmap, rect.sx, rect.sy, rect.sWidth, rect.sHeight, rect.dx, rect.dy, rect.dWidth, rect.dHeight);
  return canvasBlob(canvas);
}

function output(blob: Blob, fileName: string, mimeType = blob.type): FileProcessResult {
  return { blob, fileName, mimeType, size: blob.size };
}

export async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try { return { width: bitmap.width, height: bitmap.height }; } finally { bitmap.close(); }
}

export async function generateFaviconSet(file: File, options: FaviconOptions = {}, dependencies?: FaviconDependencies): Promise<FileProcessResult[]> {
  const decode = dependencies?.decode ?? createImageBitmap;
  const render = dependencies?.renderPng ?? renderPng;
  const bitmap = await decode(file);
  try {
    const sizes = [16, 32, 48, 180, 192, 512] as const;
    const rendered = new Map<number, Blob>();
    await Promise.all(sizes.map(async (size) => rendered.set(size, await render(bitmap, size, options.background))));
    const icoImages = await Promise.all([16, 32, 48].map(async (size) => ({ width: size, height: size, data: new Uint8Array(await rendered.get(size)!.arrayBuffer()) })));
    const ico = buildIco(icoImages);
    const manifest = new Blob([JSON.stringify({ name: options.appName || "", short_name: options.appName || "", icons: [
      { src: "android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ], theme_color: "#ffffff", background_color: "#ffffff", display: "standalone" }, null, 2)], { type: "application/manifest+json" });
    return [
      output(ico, "favicon.ico", "image/x-icon"), output(rendered.get(16)!, "favicon-16x16.png"), output(rendered.get(32)!, "favicon-32x32.png"),
      output(rendered.get(180)!, "apple-touch-icon.png"), output(rendered.get(192)!, "android-chrome-192x192.png"), output(rendered.get(512)!, "android-chrome-512x512.png"),
      output(manifest, "site.webmanifest", "application/manifest+json"),
    ];
  } finally {
    bitmap.close();
  }
}
