import type { FileProcessResult } from "../../types/tool";

export interface HeicConvertOptions {
  format: "jpeg" | "png";
  quality: number;
}

interface HeicDependencies {
  heicTo: (options: { blob: Blob; type: "image/jpeg" | "image/png"; quality?: number }) => Promise<Blob>;
}

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);

export async function isHeicFile(file: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length < 12 || String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp") return false;
  return HEIF_BRANDS.has(String.fromCharCode(...bytes.slice(8, 12)));
}

export async function convertHeic(file: File, options: HeicConvertOptions, dependencies?: HeicDependencies): Promise<FileProcessResult> {
  if (!(await isHeicFile(file))) throw new Error("Select a valid HEIC or HEIF image.");
  const { heicTo } = dependencies ?? await import("heic-to/csp");
  const mimeType = options.format === "jpeg" ? "image/jpeg" : "image/png";
  const blob = await heicTo({ blob: file, type: mimeType, quality: options.format === "jpeg" ? Math.min(1, Math.max(0, options.quality)) : undefined });
  const base = file.name.replace(/\.[^/.]+$/, "");
  return { blob, fileName: `${base}${options.format === "jpeg" ? ".jpg" : ".png"}`, mimeType, size: blob.size };
}
