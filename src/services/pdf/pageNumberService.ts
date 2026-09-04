import { rgb, StandardFonts } from "pdf-lib";
import type { RGB } from "pdf-lib";
import type { FileProcessResult } from "../../types/tool";
import {
  calculatePdfPosition,
  createPdfResult,
  getPdfPageSize,
  loadPdfDocument,
  type PdfMargins,
} from "./pdfToolkit";
import { assertValidPageRanges, parsePageRanges } from "./pageRange";

export const PDF_PAGE_NUMBER_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type PdfPageNumberPosition = (typeof PDF_PAGE_NUMBER_POSITIONS)[number];

export const PDF_PAGE_NUMBER_FORMATS = [
  "{n}",
  "Page {n}",
  "{n} / {total}",
  "Page {n} of {total}",
] as const;

export type PdfPageNumberFormat = (typeof PDF_PAGE_NUMBER_FORMATS)[number];

export interface AddPageNumbersOptions {
  position?: PdfPageNumberPosition;
  startingNumber?: number;
  pageRanges?: string;
  format?: PdfPageNumberFormat;
  fontSize?: number;
  color?: string;
  margin?: number | PdfMargins;
}

const DEFAULT_OPTIONS: Required<Pick<
  AddPageNumbersOptions,
  "position" | "startingNumber" | "format" | "fontSize" | "color" | "margin"
>> = {
  position: "bottom-center",
  startingNumber: 1,
  format: "{n}",
  fontSize: 12,
  color: "#222222",
  margin: 24,
};

function isPageNumberPosition(value: string): value is PdfPageNumberPosition {
  return (PDF_PAGE_NUMBER_POSITIONS as readonly string[]).includes(value);
}

function isPageNumberFormat(value: string): value is PdfPageNumberFormat {
  return (PDF_PAGE_NUMBER_FORMATS as readonly string[]).includes(value);
}

function assertPositiveNumber(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
}

function normalizeOptions(options: AddPageNumbersOptions): Required<
  Pick<AddPageNumbersOptions, "position" | "startingNumber" | "format" | "fontSize" | "color" | "margin">
> & { pageRanges?: string } {
  const normalized = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (!isPageNumberPosition(normalized.position)) {
    throw new Error("The requested page number position is invalid.");
  }
  if (!isPageNumberFormat(normalized.format)) {
    throw new Error("The requested page number format is invalid.");
  }
  if (!Number.isInteger(normalized.startingNumber) || normalized.startingNumber < 0) {
    throw new Error("The starting page number must be zero or a positive integer.");
  }
  assertPositiveNumber(normalized.fontSize, "The font size");
  if (typeof normalized.margin === "number") {
    if (!Number.isFinite(normalized.margin) || normalized.margin < 0) {
      throw new Error("The margin must be a finite non-negative number.");
    }
  }

  return normalized;
}

export function parsePdfColor(value: string): RGB {
  const normalized = value.trim().replace(/^#/, "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;
  if (!/^[\da-f]{6}$/i.test(expanded)) {
    throw new Error("The text color must be a valid hexadecimal color.");
  }

  return rgb(
    Number.parseInt(expanded.slice(0, 2), 16) / 255,
    Number.parseInt(expanded.slice(2, 4), 16) / 255,
    Number.parseInt(expanded.slice(4, 6), 16) / 255
  );
}

export function formatPageNumber(
  format: PdfPageNumberFormat,
  pageNumber: number,
  totalPages: number
): string {
  if (!Number.isInteger(pageNumber) || !Number.isInteger(totalPages) || totalPages < 1) {
    throw new Error("Page number values must be valid integers.");
  }

  switch (format) {
    case "{n}":
      return String(pageNumber);
    case "Page {n}":
      return `Page ${pageNumber}`;
    case "{n} / {total}":
      return `${pageNumber} / ${totalPages}`;
    case "Page {n} of {total}":
      return `Page ${pageNumber} of ${totalPages}`;
    default:
      throw new Error("The requested page number format is invalid.");
  }
}

function getSelectedPageIndices(pageRanges: string | undefined, totalPages: number): number[] {
  if (pageRanges === undefined || pageRanges.trim() === "") {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const selectedPages = parsePageRanges(pageRanges);
  assertValidPageRanges(selectedPages, totalPages);
  if (selectedPages.length === 0) {
    throw new Error("Select at least one page to number.");
  }
  return selectedPages;
}

export async function addPageNumbersToPdf(
  file: File,
  options: AddPageNumbersOptions = {}
): Promise<FileProcessResult> {
  const normalized = normalizeOptions(options);
  const document = await loadPdfDocument(file);
  const totalPages = document.getPageCount();
  const selectedPageIndices = getSelectedPageIndices(normalized.pageRanges, totalPages);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const color = parsePdfColor(normalized.color);

  selectedPageIndices.forEach((pageIndex, selectedIndex) => {
    const page = document.getPage(pageIndex);
    const text = formatPageNumber(
      normalized.format,
      normalized.startingNumber + selectedIndex,
      totalPages
    );
    const textSize = {
      width: font.widthOfTextAtSize(text, normalized.fontSize),
      height: font.heightAtSize(normalized.fontSize),
    };
    const descent = textSize.height - font.heightAtSize(normalized.fontSize, { descender: false });
    const pageSize = getPdfPageSize(page, "crop");
    const position = calculatePdfPosition(
      pageSize,
      textSize,
      normalized.position,
      normalized.margin
    );

    page.drawText(text, {
      x: position.x,
      y: position.y + descent,
      size: normalized.fontSize,
      font,
      color,
    });
  });

  const bytes = await document.save();
  return createPdfResult(bytes, "numbered.pdf");
}

export const addPageNumbers = addPageNumbersToPdf;
