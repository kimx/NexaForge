import { zip } from "fflate";
import { PDFDocument } from "pdf-lib";
import type { CropSettings } from "../../types/imageCrop";
import type { FileProcessResult } from "../../types/tool";
import { cropImage } from "./cropService";

export type IdPhotoExportFormat = "pdf" | "png" | "jpg";

export interface IdPhotoLayoutOptions {
  photoWidthMm: number;
  photoHeightMm: number;
  paperWidthMm: number;
  paperHeightMm: number;
  marginMm: number;
  spacingMm: number;
  copies: number;
  cropMarks: boolean;
}

export interface IdPhotoPlacement {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface IdPhotoLayout {
  options: IdPhotoLayoutOptions;
  columns: number;
  rows: number;
  capacity: number;
  pageCount: number;
  pageWidthMm: number;
  pageHeightMm: number;
  placements: IdPhotoPlacement[];
}

export const ID_PHOTO_DPI = 300;
export const ID_PHOTO_MAX_PAGES = 100;
export const ID_PHOTO_MAX_COPIES = 10_000;
const MAX_PAGE_PIXELS = 12_000_000;

export function mmToPixels(mm: number, dpi = ID_PHOTO_DPI): number {
  return Math.round((mm / 25.4) * dpi);
}

export function calculateIdPhotoLayout(options: IdPhotoLayoutOptions): IdPhotoLayout {
  const {
    photoWidthMm,
    photoHeightMm,
    paperWidthMm,
    paperHeightMm,
    marginMm,
    spacingMm,
    copies,
  } = options;
  const values = [photoWidthMm, photoHeightMm, paperWidthMm, paperHeightMm, marginMm, spacingMm, copies];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    photoWidthMm < 1 ||
    photoHeightMm < 1 ||
    paperWidthMm <= 0 ||
    paperHeightMm <= 0 ||
    marginMm < 0 ||
    spacingMm < 0 ||
    copies < 1 ||
    !Number.isInteger(copies) ||
    marginMm * 2 >= paperWidthMm ||
    marginMm * 2 >= paperHeightMm
  ) {
    throw new Error("invalid-layout");
  }
  if (copies > ID_PHOTO_MAX_COPIES) throw new Error("copy-limit");
  if (mmToPixels(paperWidthMm) * mmToPixels(paperHeightMm) > MAX_PAGE_PIXELS) throw new Error("page-too-large");

  const printableWidth = paperWidthMm - marginMm * 2;
  const printableHeight = paperHeightMm - marginMm * 2;
  const columns = Math.floor((printableWidth + spacingMm) / (photoWidthMm + spacingMm));
  const rows = Math.floor((printableHeight + spacingMm) / (photoHeightMm + spacingMm));
  const capacity = columns * rows;
  if (capacity < 1) throw new Error("photo-does-not-fit");

  const pageCount = Math.ceil(copies / capacity);
  if (pageCount > ID_PHOTO_MAX_PAGES) throw new Error("page-limit");

  const gridWidth = columns * photoWidthMm + (columns - 1) * spacingMm;
  const gridHeight = rows * photoHeightMm + (rows - 1) * spacingMm;
  const startX = marginMm + (printableWidth - gridWidth) / 2;
  const startY = marginMm + (printableHeight - gridHeight) / 2;
  const placements = Array.from({ length: Math.min(capacity, copies) }, (_, index) => ({
    xMm: startX + (index % columns) * (photoWidthMm + spacingMm),
    yMm: startY + Math.floor(index / columns) * (photoHeightMm + spacingMm),
    widthMm: photoWidthMm,
    heightMm: photoHeightMm,
  }));
  return {
    options,
    columns,
    rows,
    capacity,
    pageCount,
    pageWidthMm: paperWidthMm,
    pageHeightMm: paperHeightMm,
    placements,
  };
}

export function idPhotoFileName(
  widthMm: number,
  heightMm: number,
  paperName: string,
  extension: string
): string {
  const dimension = (value: number): string => Number.isInteger(value) ? String(value) : String(value).replace(".", "-");
  return `id-photo-${dimension(widthMm)}x${dimension(heightMm)}mm-${paperName}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("export-failed")), type, quality);
  });
}

// Canvas serializes resolution as 96 DPI; encode the intended print density.
async function withPrintDensity(blob: Blob, format: "png" | "jpg"): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (format === "jpg") {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("invalid-jpeg");
    let offset = 2;
    while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (length < 2 || offset + 2 + length > bytes.length) throw new Error("invalid-jpeg");
      if (marker === 0xe0 && length >= 16 && String.fromCharCode(...bytes.slice(offset + 4, offset + 9)) === "JFIF\0") {
        bytes.set([1, 1, 44, 1, 44], offset + 11);
        return new Blob([bytes], { type: blob.type });
      }
      offset += length + 2;
    }
    const jfif = Uint8Array.from([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, 1, 44, 1, 44, 0, 0]);
    return new Blob([bytes.slice(0, 2), jfif, bytes.slice(2)], { type: blob.type });
  }
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) throw new Error("invalid-png");
  const chunk = new Uint8Array(21);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4); // pHYs
  chunkView.setUint32(8, Math.round(ID_PHOTO_DPI / 0.0254));
  chunkView.setUint32(12, Math.round(ID_PHOTO_DPI / 0.0254));
  chunk[16] = 1;
  let crc = 0xffffffff;
  for (const byte of chunk.slice(4, 17)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  chunkView.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  const parts: Uint8Array<ArrayBuffer>[] = [bytes.slice(0, 8)];
  let offset = 8;
  let inserted = false;
  while (offset + 12 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("invalid-png");
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (type !== "pHYs") parts.push(bytes.slice(offset, end));
    if (type === "IHDR") { parts.push(chunk); inserted = true; }
    offset = end;
    if (type === "IEND") break;
  }
  if (!inserted || offset !== bytes.length) throw new Error("invalid-png");
  return new Blob(parts, { type: blob.type });
}

export type CropMark = { x1: number; y1: number; x2: number; y2: number };

// Shared millimeter geometry; shorten marks to the available gutter.
export function idPhotoCropMarks(layout: IdPhotoLayout, count: number): CropMark[] {
  const { marginMm: margin, spacingMm: spacing } = layout.options;
  const marks: CropMark[] = [];
  layout.placements.slice(0, count).forEach((p, index) => {
    const col = index % layout.columns;
    const row = Math.floor(index / layout.columns);
    const left = col === 0 ? p.xMm - margin : spacing / 2;
    const right = col === layout.columns - 1 ? layout.pageWidthMm - margin - p.xMm - p.widthMm : spacing / 2;
    const top = row === 0 ? p.yMm - margin : spacing / 2;
    const bottom = row === layout.rows - 1 ? layout.pageHeightMm - margin - p.yMm - p.heightMm : spacing / 2;
    const offset = 0.5;
    for (const y of [p.yMm, p.yMm + p.heightMm]) {
      if (left > offset + 0.1) marks.push({ x1: p.xMm - Math.min(2.5, left - 0.1), y1: y, x2: p.xMm - offset, y2: y });
      if (right > offset + 0.1) marks.push({ x1: p.xMm + p.widthMm + offset, y1: y, x2: p.xMm + p.widthMm + Math.min(2.5, right - 0.1), y2: y });
    }
    for (const x of [p.xMm, p.xMm + p.widthMm]) {
      if (top > offset + 0.1) marks.push({ x1: x, y1: p.yMm - Math.min(2.5, top - 0.1), x2: x, y2: p.yMm - offset });
      if (bottom > offset + 0.1) marks.push({ x1: x, y1: p.yMm + p.heightMm + offset, x2: x, y2: p.yMm + p.heightMm + Math.min(2.5, bottom - 0.1) });
    }
  });
  return marks;
}

export function drawIdPhotoPage(
  canvas: HTMLCanvasElement,
  photo: CanvasImageSource,
  layout: IdPhotoLayout,
  pageIndex: number,
  dpi = ID_PHOTO_DPI
): void {
  const px = (mm: number): number => mmToPixels(mm, dpi);
  canvas.width = px(layout.pageWidthMm);
  canvas.height = px(layout.pageHeightMm);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const count = Math.min(layout.capacity, layout.options.copies - pageIndex * layout.capacity);
  for (const p of layout.placements.slice(0, count)) {
    context.drawImage(photo, px(p.xMm), px(p.yMm), px(p.xMm + p.widthMm) - px(p.xMm), px(p.yMm + p.heightMm) - px(p.yMm));
  }
  if (layout.options.cropMarks) {
    context.strokeStyle = "#222222";
    context.lineWidth = Math.max(0.5, 0.1 / 25.4 * dpi);
    context.beginPath();
    for (const mark of idPhotoCropMarks(layout, count)) {
      context.moveTo(mark.x1 / 25.4 * dpi, mark.y1 / 25.4 * dpi);
      context.lineTo(mark.x2 / 25.4 * dpi, mark.y2 / 25.4 * dpi);
    }
    context.stroke();
  }
}

function pointsFromMm(mm: number): number {
  return (mm / 25.4) * 72;
}

export async function createIdPhotoLayoutExport(
  source: File,
  cropSettings: CropSettings,
  options: IdPhotoLayoutOptions,
  layout: IdPhotoLayout,
  format: IdPhotoExportFormat,
  paperName: string
): Promise<FileProcessResult> {
  const cropped = await cropImage(source, cropSettings);
  const bitmap = await createImageBitmap(cropped.blob);
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (format === "pdf") {
      const pdf = await PDFDocument.create();
      const photoBytes = new Uint8Array(await cropped.blob.arrayBuffer());
      const embeddedImage = cropped.mimeType === "image/jpeg"
        ? await pdf.embedJpg(photoBytes)
        : await pdf.embedPng(photoBytes);
      for (let pageIndex = 0; pageIndex < layout.pageCount; pageIndex += 1) {
        const page = pdf.addPage([
          pointsFromMm(options.paperWidthMm),
          pointsFromMm(options.paperHeightMm),
        ]);
        const pageStart = pageIndex * layout.capacity;
        const count = Math.min(layout.capacity, options.copies - pageStart);
        layout.placements.slice(0, count).forEach((placement) => {
          page.drawImage(embeddedImage, {
            x: pointsFromMm(placement.xMm),
            y: pointsFromMm(options.paperHeightMm - placement.yMm - placement.heightMm),
            width: pointsFromMm(placement.widthMm),
            height: pointsFromMm(placement.heightMm),
          });
        });
        if (options.cropMarks) {
          for (const mark of idPhotoCropMarks(layout, count)) {
            page.drawLine({
              start: { x: pointsFromMm(mark.x1), y: pointsFromMm(options.paperHeightMm - mark.y1) },
              end: { x: pointsFromMm(mark.x2), y: pointsFromMm(options.paperHeightMm - mark.y2) },
              thickness: pointsFromMm(0.1),
            });
          }
        }
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
      const bytes = await pdf.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      return { blob, fileName: idPhotoFileName(options.photoWidthMm, options.photoHeightMm, paperName, "pdf"), mimeType: "application/pdf", size: blob.size };
    }
    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    const pages: Record<string, Uint8Array> = {};
    for (let pageIndex = 0; pageIndex < layout.pageCount; pageIndex += 1) {
      canvas = document.createElement("canvas");
      drawIdPhotoPage(canvas, bitmap, layout, pageIndex);
      const blob = await withPrintDensity(await canvasToBlob(canvas, mimeType, format === "jpg" ? 0.95 : undefined), format);
      if (layout.pageCount === 1) {
        return { blob, fileName: idPhotoFileName(options.photoWidthMm, options.photoHeightMm, paperName, format), mimeType, size: blob.size, width: canvas.width, height: canvas.height };
      }
      pages[idPhotoFileName(options.photoWidthMm, options.photoHeightMm, paperName, `${String(pageIndex + 1).padStart(2, "0")}.${format}`)] = new Uint8Array(await blob.arrayBuffer());
      canvas.width = 0; canvas.height = 0; canvas = undefined;
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    const archive = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
      zip(pages, { level: 0 }, (error, data) => error ? reject(error) : resolve(new Uint8Array(data)));
    });
    const blob = new Blob([archive], { type: "application/zip" });
    return { blob, fileName: idPhotoFileName(options.photoWidthMm, options.photoHeightMm, paperName, "zip"), mimeType: "application/zip", size: blob.size };
  } finally {
    bitmap.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
