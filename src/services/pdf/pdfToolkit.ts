import { PDFDocument } from "pdf-lib";
import type { PDFPage } from "pdf-lib";
import { FILE_LIMITS } from "../../config/fileLimits";
import type { FileProcessResult, ProcessingState } from "../../types/tool";
import {
  createObjectUrl,
  downloadBlob,
  revokeObjectUrl,
} from "../../utils/download";
import { assertValidPageRanges, parsePageRanges } from "./pageRange";

export const PDF_MIME_TYPE = "application/pdf";
export const PDF_MAX_FILE_SIZE = FILE_LIMITS.pdf;

export type PdfSource = Blob | ArrayBuffer | Uint8Array;
export type PdfFile = Blob & { readonly name?: string };

export type PdfErrorCode =
  | "already-processing"
  | "broken-pdf"
  | "empty-file"
  | "empty-pdf"
  | "file-too-large"
  | "invalid-file-type"
  | "invalid-position"
  | "encrypted-pdf";

export class PdfToolkitError extends Error {
  readonly code: PdfErrorCode;

  constructor(code: PdfErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "PdfToolkitError";
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }

  declare readonly cause?: unknown;
}

export interface PdfValidationResult {
  valid: boolean;
  pageCount?: number;
  error?: PdfToolkitError;
}

export interface PdfValidationOptions {
  maxFileSize?: number;
}

function createError(
  code: PdfErrorCode,
  message: string,
  cause?: unknown
): PdfToolkitError {
  return new PdfToolkitError(code, message, cause);
}

function isPdfHeader(bytes: Uint8Array): boolean {
  const headerEnd = Math.min(bytes.length - 4, 1024);
  for (let index = 0; index <= headerEnd; index += 1) {
    if (
      bytes[index] === 0x25 &&
      bytes[index + 1] === 0x50 &&
      bytes[index + 2] === 0x44 &&
      bytes[index + 3] === 0x46 &&
      bytes[index + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function normalizeLoadError(error: unknown): PdfToolkitError {
  if (error instanceof PdfToolkitError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  if (/encrypt|password|encrypted/i.test(`${name} ${message}`)) {
    return createError(
      "encrypted-pdf",
      "This PDF is encrypted or password-protected and cannot be processed in your browser.",
      error
    );
  }

  return createError(
    "broken-pdf",
    "This PDF is invalid or damaged and could not be read.",
    error
  );
}

async function readPdfBytes(source: PdfSource): Promise<Uint8Array> {
  if (source instanceof Uint8Array) {
    return new Uint8Array(source);
  }
  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }
  return new Uint8Array(await source.arrayBuffer());
}

function yieldToBrowser(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

export function validatePdfFileType(
  file: PdfFile,
  maxFileSize = PDF_MAX_FILE_SIZE
): PdfToolkitError | null {
  if (file.size === 0) {
    return createError("empty-file", "The selected PDF file is empty.");
  }
  if (file.size > maxFileSize) {
    return createError(
      "file-too-large",
      "This PDF is too large to process safely in your browser."
    );
  }

  const type = file.type.toLowerCase();
  const name = file.name?.toLowerCase() ?? "";
  const hasPdfExtension = name.endsWith(".pdf");
  if (
    (name && !hasPdfExtension && type !== PDF_MIME_TYPE) ||
    (!name && type && type !== PDF_MIME_TYPE)
  ) {
    return createError(
      "invalid-file-type",
      "Please select a PDF file."
    );
  }
  return null;
}

export async function loadPdfDocument(
  source: PdfSource
): Promise<PDFDocument> {
  if (!(source instanceof Uint8Array) && !(source instanceof ArrayBuffer)) {
    const typeError = validatePdfFileType(source);
    if (typeError) {
      throw typeError;
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await readPdfBytes(source);
  } catch (error) {
    throw normalizeLoadError(error);
  }
  if (bytes.length === 0) {
    throw createError("empty-file", "The selected PDF file is empty.");
  }
  if (!isPdfHeader(bytes)) {
    throw createError(
      "broken-pdf",
      "This PDF is invalid or damaged and could not be read."
    );
  }

  await yieldToBrowser();
  try {
    const document = await PDFDocument.load(bytes);
    if (document.getPageCount() < 1) {
      throw createError("empty-pdf", "This PDF does not contain any pages.");
    }
    return document;
  } catch (error) {
    throw normalizeLoadError(error);
  }
}

export async function validatePdfFile(
  file: PdfFile,
  options: PdfValidationOptions = {}
): Promise<PdfValidationResult> {
  const typeError = validatePdfFileType(file, options.maxFileSize);
  if (typeError) {
    return { valid: false, error: typeError };
  }

  try {
    const document = await loadPdfDocument(file);
    return { valid: true, pageCount: document.getPageCount() };
  } catch (error) {
    return { valid: false, error: normalizeLoadError(error) };
  }
}

export function createPdfResult(
  bytes: Uint8Array | ArrayBuffer,
  fileName: string
): FileProcessResult {
  const data = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  data.set(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const blob = new Blob([data.buffer], { type: PDF_MIME_TYPE });
  return {
    blob,
    fileName,
    mimeType: PDF_MIME_TYPE,
    size: blob.size,
  };
}

export type PdfPageBox = "crop" | "media";

export interface PdfPageSize {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rotatedWidth: number;
  rotatedHeight: number;
  isLandscape: boolean;
  box: PdfPageBox;
}

export type PdfPageSizeLike = Pick<PdfPageSize, "width" | "height"> &
  Partial<Pick<PdfPageSize, "x" | "y">>;

interface PdfBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPageLike {
  getCropBox?: () => PdfBox;
  getMediaBox?: () => PdfBox;
  getSize?: () => { width: number; height: number };
  getRotation?: () => { angle: number };
}

function isPdfBox(value: unknown): value is PdfBox {
  if (!value || typeof value !== "object") {
    return false;
  }
  const box = value as Partial<PdfBox>;
  const { x, y, width, height } = box;
  return (
    typeof x === "number" &&
    typeof y === "number" &&
    typeof width === "number" &&
    typeof height === "number" &&
    [x, y, width, height].every((part) => Number.isFinite(part)) &&
    width > 0 &&
    height > 0
  );
}

function readPageBox(page: PdfPageLike, box: PdfPageBox): PdfBox {
  const preferred = box === "crop" ? page.getCropBox?.() : page.getMediaBox?.();
  if (isPdfBox(preferred)) {
    return preferred;
  }

  const media = page.getMediaBox?.();
  if (isPdfBox(media)) {
    return media;
  }

  const size = page.getSize?.();
  if (size && isPdfBox({ x: 0, y: 0, ...size })) {
    return { x: 0, y: 0, width: size.width, height: size.height };
  }

  throw createError(
    "broken-pdf",
    "The PDF page has invalid dimensions and could not be processed."
  );
}

export function getPdfPageSize(
  page: PDFPage | PdfPageLike,
  box: PdfPageBox = "crop"
): PdfPageSize {
  const pageBox = readPageBox(page, box);
  const rawRotation = page.getRotation?.()?.angle ?? 0;
  const rotation = ((rawRotation % 360) + 360) % 360;
  const isQuarterTurn = rotation === 90 || rotation === 270;
  const rotatedWidth = isQuarterTurn ? pageBox.height : pageBox.width;
  const rotatedHeight = isQuarterTurn ? pageBox.width : pageBox.height;
  return {
    ...pageBox,
    rotation,
    rotatedWidth,
    rotatedHeight,
    isLandscape: rotatedWidth > rotatedHeight,
    box,
  };
}

export type PdfPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | { x: number; y: number };

export interface PdfContentSize {
  width: number;
  height: number;
}

export interface PdfMargins {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

function normalizeMargins(margin: number | PdfMargins): Required<PdfMargins> {
  const normalize = (value: number | undefined): number => {
    if (value === undefined) {
      return 0;
    }
    if (!Number.isFinite(value)) {
      throw createError("invalid-position", "The margins must be finite numbers.");
    }
    return Math.max(0, value);
  };
  if (typeof margin === "number") {
    const value = normalize(margin);
    return { top: value, right: value, bottom: value, left: value };
  }
  return {
    top: normalize(margin.top),
    right: normalize(margin.right),
    bottom: normalize(margin.bottom),
    left: normalize(margin.left),
  };
}

export function calculatePdfPosition(
  pageSize: PdfPageSizeLike,
  contentSize: PdfContentSize,
  position: PdfPosition,
  margin: number | PdfMargins = 0
): { x: number; y: number } {
  if (
    !Number.isFinite(contentSize.width) ||
    !Number.isFinite(contentSize.height) ||
    contentSize.width < 0 ||
    contentSize.height < 0
  ) {
    throw createError(
      "invalid-position",
      "The content dimensions must be finite and non-negative."
    );
  }
  if (typeof position === "object") {
    if (Number.isFinite(position.x) && Number.isFinite(position.y)) {
      return { x: position.x, y: position.y };
    }
    throw createError("invalid-position", "The custom position is invalid.");
  }

  const margins = normalizeMargins(margin);
  const pageX = pageSize.x ?? 0;
  const pageY = pageSize.y ?? 0;
  const left = pageX + margins.left;
  const right = pageX + pageSize.width - margins.right;
  const bottom = pageY + margins.bottom;
  const top = pageY + pageSize.height - margins.top;
  const horizontalCenter = pageX + pageSize.width / 2 - contentSize.width / 2;
  const verticalCenter = pageY + pageSize.height / 2 - contentSize.height / 2;

  switch (position) {
    case "top-left":
      return { x: left, y: top - contentSize.height };
    case "top-center":
      return { x: horizontalCenter, y: top - contentSize.height };
    case "top-right":
      return { x: right - contentSize.width, y: top - contentSize.height };
    case "center-left":
      return { x: left, y: verticalCenter };
    case "center":
      return { x: horizontalCenter, y: verticalCenter };
    case "center-right":
      return { x: right - contentSize.width, y: verticalCenter };
    case "bottom-left":
      return { x: left, y: bottom };
    case "bottom-center":
      return { x: horizontalCenter, y: bottom };
    case "bottom-right":
      return { x: right - contentSize.width, y: bottom };
    default:
      throw createError("invalid-position", "The requested position is invalid.");
  }
}

export function calculatePosition(
  pageSize: PdfPageSizeLike,
  position: PdfPosition,
  contentSize: PdfContentSize,
  margin: number | PdfMargins = 0
): { x: number; y: number } {
  return calculatePdfPosition(pageSize, contentSize, position, margin);
}

export class PdfProcessingController {
  private currentState: ProcessingState = "idle";
  private readonly listeners = new Set<(state: ProcessingState) => void>();

  get state(): ProcessingState {
    return this.currentState;
  }

  get isProcessing(): boolean {
    return this.currentState === "processing";
  }

  subscribe(listener: (state: ProcessingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    if (!this.isProcessing) {
      this.setState("idle");
    }
  }

  async run<T>(operation: () => Promise<T> | T): Promise<T> {
    if (this.isProcessing) {
      throw createError(
        "already-processing",
        "A PDF operation is already in progress."
      );
    }
    this.setState("processing");
    try {
      const result = await operation();
      this.setState("success");
      return result;
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  private setState(state: ProcessingState): void {
    this.currentState = state;
    this.listeners.forEach((listener) => listener(state));
  }
}

export function createPdfProcessingController(): PdfProcessingController {
  return new PdfProcessingController();
}

export {
  assertValidPageRanges,
  createObjectUrl,
  downloadBlob,
  parsePageRanges,
  revokeObjectUrl,
};

export const createPdfObjectUrl = createObjectUrl;
export const revokePdfObjectUrl = revokeObjectUrl;
export const loadPdf = loadPdfDocument;
export const validatePdf = validatePdfFile;
export const getPageSize = getPdfPageSize;
