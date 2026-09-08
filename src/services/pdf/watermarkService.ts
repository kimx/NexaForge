import { degrees, rgb, StandardFonts } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import type { FileProcessResult } from "../../types/tool";
import {
  calculatePdfPosition,
  createPdfResult,
  getPdfPageSize,
  loadPdfDocument,
  type PdfMargins,
  type PdfPageSize,
} from "./pdfToolkit";
import { assertValidPageRanges, parsePageRanges } from "./pageRange";

export const PDF_WATERMARK_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type PdfWatermarkPosition = (typeof PDF_WATERMARK_POSITIONS)[number];
export type PdfWatermarkMode = "text" | "image";

export interface PdfWatermarkOptions {
  mode?: PdfWatermarkMode;
  type?: PdfWatermarkMode;
  text?: string;
  image?: File;
  watermarkImage?: File;
  fontSize?: number;
  color?: string;
  scale?: number;
  opacity?: number;
  rotation?: number;
  position?: PdfWatermarkPosition;
  pageRanges?: string;
  margin?: number | PdfMargins;
}

interface NormalizedPdfWatermarkOptions {
  mode: PdfWatermarkMode;
  text: string;
  image?: File;
  fontSize: number;
  color: string;
  scale: number;
  opacity: number;
  rotation: number;
  position: PdfWatermarkPosition;
  pageRanges?: string;
  margin: number | PdfMargins;
}

interface RotatedBounds {
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const DEFAULT_OPTIONS = {
  mode: "text" as const,
  position: "center" as PdfWatermarkPosition,
  fontSize: 48,
  color: "#222222",
  scale: 0.25,
  opacity: 0.35,
  rotation: 0,
  margin: 24,
};

function isWatermarkPosition(value: string): value is PdfWatermarkPosition {
  return (PDF_WATERMARK_POSITIONS as readonly string[]).includes(value);
}

function isWatermarkMode(value: string): value is PdfWatermarkMode {
  return value === "text" || value === "image";
}

function assertFiniteRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
}

function imageFormat(file: File): "png" | "jpeg" {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === "image/png" || name.endsWith(".png")) {
    return "png";
  }
  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return "jpeg";
  }
  throw new Error("Watermark image must be a PNG or JPEG file.");
}

function normalizeOptions(options: PdfWatermarkOptions): NormalizedPdfWatermarkOptions {
  const modeValue = options.mode ?? options.type;
  const mode = modeValue ?? (options.image ?? options.watermarkImage ? "image" : DEFAULT_OPTIONS.mode);
  if (!isWatermarkMode(mode)) {
    throw new Error("The watermark type is invalid.");
  }

  const position = options.position ?? DEFAULT_OPTIONS.position;
  if (!isWatermarkPosition(position)) {
    throw new Error("The watermark position is invalid.");
  }

  const normalized: NormalizedPdfWatermarkOptions = {
    mode,
    text: options.text?.trim() ?? "",
    image: options.image ?? options.watermarkImage,
    fontSize: options.fontSize ?? DEFAULT_OPTIONS.fontSize,
    color: options.color ?? DEFAULT_OPTIONS.color,
    scale: options.scale ?? DEFAULT_OPTIONS.scale,
    opacity: options.opacity ?? DEFAULT_OPTIONS.opacity,
    rotation: options.rotation ?? DEFAULT_OPTIONS.rotation,
    position,
    pageRanges: options.pageRanges,
    margin: options.margin ?? DEFAULT_OPTIONS.margin,
  };

  if (mode === "text" && !normalized.text) {
    throw new Error("Watermark text is required.");
  }
  if (mode === "image" && !normalized.image) {
    throw new Error("A PNG or JPEG watermark image is required.");
  }
  assertFiniteRange(normalized.opacity, 0, 1, "Opacity");
  assertFiniteRange(normalized.rotation, -180, 180, "Rotation");
  if (mode === "text") {
    if (!Number.isFinite(normalized.fontSize) || normalized.fontSize <= 0) {
      throw new Error("Font size must be a positive number.");
    }
    if (!normalized.color.trim()) {
      throw new Error("Watermark color is required.");
    }
    rgbFromHex(normalized.color);
  } else {
    assertFiniteRange(normalized.scale, 0.01, 1, "Scale");
    imageFormat(normalized.image as File);
  }

  return normalized;
}

function rgbFromHex(value: string): ReturnType<typeof rgb> {
  const normalized = value.trim().replace(/^#/, "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;
  if (!/^[\da-f]{6}$/i.test(expanded)) {
    throw new Error("The watermark color must be a valid hexadecimal color.");
  }
  return rgb(
    Number.parseInt(expanded.slice(0, 2), 16) / 255,
    Number.parseInt(expanded.slice(2, 4), 16) / 255,
    Number.parseInt(expanded.slice(4, 6), 16) / 255
  );
}

function selectedPageIndices(pageRanges: string | undefined, totalPages: number): number[] {
  if (pageRanges === undefined || pageRanges.trim() === "") {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  const selected = parsePageRanges(pageRanges);
  assertValidPageRanges(selected, totalPages);
  if (selected.length === 0) {
    throw new Error("Select at least one page to watermark.");
  }
  return selected;
}

function rotatedBounds(width: number, height: number, rotation: number): RotatedBounds {
  const radians = rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const corners = [
    [0, 0],
    [width * cosine, width * sine],
    [-height * sine, height * cosine],
    [width * cosine - height * sine, width * sine + height * cosine],
  ];
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
    maxX,
    maxY,
  };
}

function drawOrigin(
  pageSize: PdfPageSize,
  contentSize: { width: number; height: number },
  position: PdfWatermarkPosition,
  rotation: number,
  margin: number | PdfMargins
): { x: number; y: number } {
  const bounds = rotatedBounds(contentSize.width, contentSize.height, rotation);
  const placed = calculatePdfPosition(
    pageSize,
    { width: bounds.width, height: bounds.height },
    position,
    margin
  );
  return {
    x: placed.x + bounds.width / 2 - (bounds.minX + bounds.maxX) / 2,
    y: placed.y + bounds.height / 2 - (bounds.minY + bounds.maxY) / 2,
  };
}

function drawTextWatermark(
  page: PDFPage,
  pageSize: PdfPageSize,
  options: NormalizedPdfWatermarkOptions,
  font: PDFFont
): void {
  const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
  const textHeight = font.heightAtSize(options.fontSize);
  const origin = drawOrigin(
    pageSize,
    { width: textWidth, height: textHeight },
    options.position,
    options.rotation,
    options.margin
  );
  const descent = textHeight - font.heightAtSize(options.fontSize, { descender: false });
  page.drawText(options.text, {
    x: origin.x,
    y: origin.y + descent,
    size: options.fontSize,
    font,
    color: rgbFromHex(options.color),
    opacity: options.opacity,
    rotate: degrees(options.rotation),
  });
}

export function validatePdfWatermarkOptions(options: PdfWatermarkOptions): string[] {
  try {
    normalizeOptions(options);
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

export async function addWatermarkToPdf(
  file: File,
  options: PdfWatermarkOptions = {}
): Promise<FileProcessResult> {
  const normalized = normalizeOptions(options);
  const document = await loadPdfDocument(file);
  const totalPages = document.getPageCount();
  const indices = selectedPageIndices(normalized.pageRanges, totalPages);

  if (normalized.mode === "text") {
    const font = await document.embedFont(StandardFonts.Helvetica);
    indices.forEach((index) => {
      const page = document.getPage(index);
      drawTextWatermark(page, getPdfPageSize(page, "crop"), normalized, font);
    });
  } else {
    const image = normalized.image as File;
    const bytes = new Uint8Array(await image.arrayBuffer());
    const embedded = imageFormat(image) === "png"
      ? await document.embedPng(bytes)
      : await document.embedJpg(bytes);

    indices.forEach((index) => {
      const page = document.getPage(index);
      const pageSize = getPdfPageSize(page, "crop");
      const width = pageSize.width * normalized.scale;
      const height = width * embedded.height / embedded.width;
      const origin = drawOrigin(
        pageSize,
        { width, height },
        normalized.position,
        normalized.rotation,
        normalized.margin
      );
      page.drawImage(embedded, {
        x: origin.x,
        y: origin.y,
        width,
        height,
        opacity: normalized.opacity,
        rotate: degrees(normalized.rotation),
      });
    });
  }

  const bytes = await document.save();
  return createPdfResult(bytes, "watermarked.pdf");
}

export const applyPdfWatermark = addWatermarkToPdf;
export const watermarkPdf = addWatermarkToPdf;
