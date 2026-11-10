import { zipSync } from "fflate";
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
  const placements = Array.from({ length: capacity }, (_, index) => ({
    xMm: startX + (index % columns) * (photoWidthMm + spacingMm),
    yMm: startY + Math.floor(index / columns) * (photoHeightMm + spacingMm),
    widthMm: photoWidthMm,
    heightMm: photoHeightMm,
  }));
  if (mmToPixels(paperWidthMm) * mmToPixels(paperHeightMm) > MAX_PAGE_PIXELS) {
    throw new Error("page-too-large");
  }

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

function drawPhotoPage(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  layout: IdPhotoLayout,
  pageIndex: number,
  format: "image/png" | "image/jpeg"
): void {
  const { paperWidthMm, paperHeightMm, copies, cropMarks } = layout.options;
  const width = mmToPixels(paperWidthMm);
  const height = mmToPixels(paperHeightMm);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  const start = pageIndex * layout.capacity;
  const count = Math.min(layout.capacity, copies - start);
  const px = (value: number): number => mmToPixels(value);
  for (const placement of layout.placements.slice(0, count)) {
    const x = px(placement.xMm);
    const y = px(placement.yMm);
    const photoWidth = px(placement.widthMm);
    const photoHeight = px(placement.heightMm);
    context.drawImage(bitmap, x, y, photoWidth, photoHeight);
    if (cropMarks) {
      const offset = Math.max(1, mmToPixels(0.5));
      const length = Math.min(mmToPixels(2), Math.floor(Math.min(photoWidth, photoHeight) / 4));
      const printableLeft = mmToPixels(layout.options.marginMm);
      const printableTop = mmToPixels(layout.options.marginMm);
      const printableRight = width - printableLeft;
      const printableBottom = height - printableTop;
      const gap = mmToPixels(layout.options.spacingMm);
      context.strokeStyle = "#222222";
      context.lineWidth = Math.max(1, mmToPixels(0.1));
      context.beginPath();
      if (x > printableLeft || gap >= mmToPixels(2.5)) {
        context.moveTo(x - offset, y); context.lineTo(x - offset - length, y);
        context.moveTo(x - offset, y + photoHeight); context.lineTo(x - offset - length, y + photoHeight);
      }
      if (y > printableTop || gap >= mmToPixels(2.5)) {
        context.moveTo(x, y - offset); context.lineTo(x, y - offset - length);
        context.moveTo(x + photoWidth, y - offset); context.lineTo(x + photoWidth, y - offset - length);
      }
      if (x + photoWidth < printableRight || gap >= mmToPixels(2.5)) {
        context.moveTo(x + photoWidth + offset, y); context.lineTo(x + photoWidth + offset + length, y);
        context.moveTo(x + photoWidth + offset, y + photoHeight); context.lineTo(x + photoWidth + offset + length, y + photoHeight);
      }
      if (y + photoHeight < printableBottom || gap >= mmToPixels(2.5)) {
        context.moveTo(x, y + photoHeight + offset); context.lineTo(x, y + photoHeight + offset + length);
        context.moveTo(x + photoWidth, y + photoHeight + offset); context.lineTo(x + photoWidth, y + photoHeight + offset + length);
      }
      context.stroke();
    }
  }
  if (format === "image/jpeg") {
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";
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
          const markLength = pointsFromMm(2);
          const gap = pointsFromMm(0.5);
          layout.placements.slice(0, count).forEach((placement) => {
            const x = pointsFromMm(placement.xMm);
            const y = pointsFromMm(options.paperHeightMm - placement.yMm - placement.heightMm);
            const w = pointsFromMm(placement.widthMm);
            const h = pointsFromMm(placement.heightMm);
            const markSegments = [
              [x - gap - markLength, y + h, x - gap, y + h], [x, y + h + gap, x, y + h + gap + markLength],
              [x + w + gap, y + h, x + w + gap + markLength, y + h], [x + w, y + h + gap, x + w, y + h + gap + markLength],
              [x - gap - markLength, y, x - gap, y], [x, y - gap - markLength, x, y - gap],
              [x + w + gap, y, x + w + gap + markLength, y], [x + w, y - gap - markLength, x + w, y - gap],
            ];
            markSegments.forEach(([startX, startY, endX, endY]) => page.drawLine({
              start: { x: startX, y: startY },
              end: { x: endX, y: endY },
              thickness: 0.25,
            }));
          });
        }
      }
      const bytes = await pdf.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      return {
        blob,
        fileName: idPhotoFileName(options.photoWidthMm, options.photoHeightMm, paperName, "pdf"),
        mimeType: "application/pdf",
        size: blob.size,
      };
    }

    const imageFormat = format === "png" ? "image/png" : "image/jpeg";
    const extension = format === "png" ? "png" : "jpg";
    const pages: Record<string, Uint8Array> = {};
    for (let pageIndex = 0; pageIndex < layout.pageCount; pageIndex += 1) {
      canvas = document.createElement("canvas");
      drawPhotoPage(canvas, bitmap, layout, pageIndex, imageFormat);
      const blob = await canvasToBlob(canvas, imageFormat, format === "jpg" ? 0.95 : undefined);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (layout.pageCount === 1) {
        return {
          blob,
          fileName: idPhotoFileName(options.photoWidthMm, options.photoHeightMm, paperName, extension),
          mimeType: imageFormat,
          size: blob.size,
          width: canvas.width,
          height: canvas.height,
        };
      }
      const pageNumber = String(pageIndex + 1).padStart(2, "0");
      const pageName = idPhotoFileName(options.photoWidthMm, options.photoHeightMm, paperName, `${pageNumber}.${extension}`);
      pages[pageName] = bytes;
      canvas.width = 0;
      canvas.height = 0;
      canvas = undefined;
    }
    const blob = new Blob([zipSync(pages)], { type: "application/zip" });
    return {
      blob,
      fileName: idPhotoFileName(options.photoWidthMm, options.photoHeightMm, paperName, "zip"),
      mimeType: "application/zip",
      size: blob.size,
    };
  } finally {
    bitmap.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
