import { PDFDocument, PDFName, PDFNumber } from "pdf-lib";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { FileProcessResult } from "../../types/tool";
import { createPdfResult, loadPdfData, PdfToolkitError } from "./pdfToolkit";

export const PDF_COMPRESSION_LIMITS = { pages: 200, pagePixels: 16_000_000, totalPixels: 100_000_000, dimension: 8192 } as const;

export interface PdfCompressionOptions {
  mode: "preserve-text" | "raster";
  quality?: number;
  dpi?: number;
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

export interface PdfCompressionResult extends FileProcessResult {
  originalSize: number;
  attemptedSize: number;
  status: "reduced" | "original-kept";
  mode: PdfCompressionOptions["mode"];
}

export class PdfCompressionError extends Error {
  constructor(readonly code: "invalid-options" | "render-limit", message: string) {
    super(message);
    this.name = "PdfCompressionError";
  }
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Compression cancelled.", "AbortError");
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Compression cancelled.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

function jpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to encode the PDF page.")), "image/jpeg", quality);
  });
}

async function rasterize(bytes: Uint8Array, original: PDFDocument, options: PdfCompressionOptions): Promise<Uint8Array> {
  const pdfjs = await import("pdfjs-dist");
  checkAbort(options.signal);
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  checkAbort(options.signal);
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
  let destroyPromise: Promise<void> | undefined;
  const destroy = () => destroyPromise ??= Promise.resolve(loadingTask.destroy()).catch(() => {});
  const abortLoading = () => { void destroy(); };
  options.signal?.addEventListener("abort", abortLoading, { once: true });
  let source: Awaited<typeof loadingTask.promise> | undefined;
  try {
    source = await abortable(loadingTask.promise, options.signal);
    checkAbort(options.signal);
    if (source.numPages > PDF_COMPRESSION_LIMITS.pages) {
      throw new PdfCompressionError("render-limit", "Use a PDF with at most 200 pages. Split larger documents first.");
    }
    const output = await PDFDocument.create({ updateMetadata: false });
    let totalPixels = 0;
    for (let index = 1; index <= source.numPages; index += 1) {
      checkAbort(options.signal);
      const page = await abortable(source.getPage(index), options.signal);
      let canvas: HTMLCanvasElement | undefined;
      try {
        // Render without rotation and retain the original page boxes/rotation in the output.
        const physical = page.getViewport({ scale: 1, rotation: 0 });
        const viewport = page.getViewport({ scale: (options.dpi ?? 120) / 72, rotation: 0 });
        const width = Math.ceil(viewport.width);
        const height = Math.ceil(viewport.height);
        const pixels = width * height;
        totalPixels += pixels;
        if (![width, height, physical.width, physical.height].every((value) => Number.isFinite(value) && value > 0) ||
            width > PDF_COMPRESSION_LIMITS.dimension || height > PDF_COMPRESSION_LIMITS.dimension ||
            pixels > PDF_COMPRESSION_LIMITS.pagePixels || totalPixels > PDF_COMPRESSION_LIMITS.totalPixels) {
          throw new PdfCompressionError("render-limit", "This PDF exceeds the rendering limits. Try a lower resolution or split the PDF.");
        }
        checkAbort(options.signal);
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas rendering is unavailable.");
        const renderTask = page.render({ canvas, canvasContext: context, viewport, background: "rgb(255,255,255)" });
        const abortRender = () => renderTask.cancel();
        options.signal?.addEventListener("abort", abortRender, { once: true });
        try {
          await abortable(renderTask.promise, options.signal);
        } finally {
          options.signal?.removeEventListener("abort", abortRender);
        }
        checkAbort(options.signal);
        const blob = await abortable(jpegBlob(canvas, options.quality ?? 0.7), options.signal);
        const image = await output.embedJpg(await blob.arrayBuffer());
        checkAbort(options.signal);
        const originalPage = original.getPage(index - 1);
        const media = originalPage.getMediaBox();
        const crop = originalPage.getCropBox();
        const outputPage = output.addPage([media.width, media.height]);
        outputPage.setMediaBox(media.x, media.y, media.width, media.height);
        outputPage.setCropBox(crop.x, crop.y, crop.width, crop.height);
        outputPage.setRotation(originalPage.getRotation());
        if (Number.isFinite(page.userUnit) && page.userUnit > 0 && page.userUnit !== 1) {
          outputPage.node.set(PDFName.of("UserUnit"), PDFNumber.of(page.userUnit));
        }
        // PDF.js uses the intersection of MediaBox and CropBox for its visible view.
        const view = page.view ?? [crop.x, crop.y, crop.x + crop.width, crop.y + crop.height];
        outputPage.drawImage(image, { x: view[0], y: view[1], width: view[2] - view[0], height: view[3] - view[1] });
        options.onProgress?.(index, source.numPages);
      } finally {
        if (canvas) { canvas.width = 0; canvas.height = 0; }
        page.cleanup();
      }
    }
    checkAbort(options.signal);
    return await output.save({ useObjectStreams: true, objectsPerTick: 25 });
  } finally {
    options.signal?.removeEventListener("abort", abortLoading);
    try { await source?.cleanup(); } catch { /* A cancelled worker may already be closed. */ }
    await destroy();
  }
}

export async function compressPdf(file: File, options: PdfCompressionOptions): Promise<PdfCompressionResult> {
  checkAbort(options.signal);
  if (options.mode !== "preserve-text" && options.mode !== "raster") {
    throw new PdfCompressionError("invalid-options", "Choose a compression mode.");
  }
  if (options.mode === "raster" && (!Number.isFinite(options.quality ?? 0.7) || (options.quality ?? 0.7) < 0.1 || (options.quality ?? 0.7) > 1 ||
      !Number.isFinite(options.dpi ?? 120) || (options.dpi ?? 120) < 72 || (options.dpi ?? 120) > 300)) {
    throw new PdfCompressionError("invalid-options", "Use JPEG quality from 10–100% and resolution from 72–300 DPI.");
  }
  try {
    const { document: source, bytes: inputBytes } = await loadPdfData(file, { updateMetadata: false });
    checkAbort(options.signal);
    const pages = source.getPageCount();
    if (pages > PDF_COMPRESSION_LIMITS.pages) {
      throw new PdfCompressionError("render-limit", "Use a PDF with at most 200 pages. Split larger documents first.");
    }
    options.onProgress?.(0, pages);
    checkAbort(options.signal);
    const bytes = options.mode === "raster"
      ? await rasterize(inputBytes, source, options)
      : await source.save({ useObjectStreams: true, updateFieldAppearances: false, objectsPerTick: 25 });
    checkAbort(options.signal);
    if (options.mode === "preserve-text") options.onProgress?.(pages, pages);
    checkAbort(options.signal);
    const reduced = bytes.byteLength < file.size;
    const result = reduced
      ? createPdfResult(bytes, `${file.name.replace(/\.pdf$/i, "") || "document"}-compressed.pdf`)
      : { blob: file, fileName: file.name, mimeType: "application/pdf", size: file.size };
    return { ...result, originalSize: file.size, attemptedSize: bytes.byteLength, status: reduced ? "reduced" : "original-kept", mode: options.mode };
  } catch (error) {
    checkAbort(options.signal);
    if (error instanceof PdfToolkitError || error instanceof PdfCompressionError || (error instanceof Error && error.name === "AbortError")) throw error;
    const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    throw new PdfToolkitError(/password|encrypt/i.test(text) ? "encrypted-pdf" : "broken-pdf", "This PDF could not be processed.", error);
  }
}
