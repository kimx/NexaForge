import { PDFDocument } from "pdf-lib";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { FileProcessResult } from "../../types/tool";
import { readFileAsArrayBuffer } from "../file/fileService";
import { createPdfResult } from "./pdfToolkit";

const PDF_MAX_PAGE_DIMENSION = 14_400;
type PdfImageFormat = "jpeg" | "png" | "webp";

interface PdfViewport {
  width: number;
  height: number;
}

interface PdfRenderPage {
  getViewport(options: { scale: number }): PdfViewport;
  render(options: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }): { promise: Promise<unknown> };
}

export interface PdfRenderDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfRenderPage>;
}

interface CanvasSurface {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

interface RenderPdfOptions {
  fileName: string;
  scale?: number;
  onProgress?: (completed: number, total: number) => void;
  createCanvas?: () => CanvasSurface;
}

function fitPdfPage(width: number, height: number): [number, number] {
  const scale = Math.min(1, PDF_MAX_PAGE_DIMENSION / Math.max(width, height));
  return [Math.max(1, width * scale), Math.max(1, height * scale)];
}

function createBrowserCanvas(): CanvasSurface {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas rendering is unavailable.");
  }
  return { canvas, context };
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to create the page image."));
      }
    }, "image/png");
  });
}

async function convertWebpToPng(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  try {
    const { canvas, context } = createBrowserCanvas();
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    context.drawImage(bitmap, 0, 0);
    return new Uint8Array(await (await canvasToPng(canvas)).arrayBuffer());
  } finally {
    bitmap.close();
  }
}

export function getPdfImageFormat(file: File): PdfImageFormat {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpeg";
  if (type === "image/webp" || name.endsWith(".webp")) return "webp";
  if (type === "image/png" || name.endsWith(".png")) return "png";
  throw new Error("Unsupported image format.");
}

export async function createPdfFromImages(files: File[]): Promise<FileProcessResult> {
  if (files.length === 0) {
    throw new Error("At least one image is required.");
  }

  const document = await PDFDocument.create();
  for (const file of files) {
    const format = getPdfImageFormat(file);
    const input =
      format === "webp"
        ? await convertWebpToPng(file)
        : new Uint8Array(await readFileAsArrayBuffer(file));
    const image =
      format === "jpeg"
        ? await document.embedJpg(input)
        : await document.embedPng(input);
    const [pageWidth, pageHeight] = fitPdfPage(image.width, image.height);
    const page = document.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  }

  const bytes = await document.save();
  return createPdfResult(bytes, "images.pdf");
}

function outputBaseName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.pdf$/i, "") || "document";
  return (
    withoutExtension
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-") || "document"
  );
}

export async function renderPdfDocumentToImages(
  pdfDocument: PdfRenderDocument,
  options: RenderPdfOptions
): Promise<FileProcessResult[]> {
  const scale = options.scale ?? 2;
  const createCanvas = options.createCanvas ?? createBrowserCanvas;
  const pageDigits = Math.max(2, String(pdfDocument.numPages).length);
  const baseName = outputBaseName(options.fileName);
  const results: FileProcessResult[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const { canvas, context } = createCanvas();
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const blob = await canvasToPng(canvas);
    results.push({
      blob,
      fileName: `${baseName}-page-${String(pageNumber).padStart(pageDigits, "0")}.png`,
      mimeType: "image/png",
      size: blob.size,
    });
    options.onProgress?.(pageNumber, pdfDocument.numPages);
  }

  return results;
}

export async function convertPdfToImages(
  file: File,
  onProgress?: (completed: number, total: number) => void
): Promise<FileProcessResult[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await readFileAsArrayBuffer(file)),
  });
  const pdfDocument = await loadingTask.promise;
  try {
    return await renderPdfDocumentToImages(pdfDocument as unknown as PdfRenderDocument, {
      fileName: file.name,
      onProgress,
    });
  } finally {
    await pdfDocument.cleanup();
    await loadingTask.destroy();
  }
}
