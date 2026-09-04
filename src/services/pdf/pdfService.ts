import { degrees, PDFDocument } from "pdf-lib";
import type { FileProcessResult } from "../../types/tool";
import { assertValidPageRanges, parsePageRanges } from "./pageRange";
import { createPdfResult, loadPdfDocument } from "./pdfToolkit";

export async function getPdfPageCount(file: File): Promise<number> {
  const source = await loadPdfDocument(file);
  return source.getPageCount();
}

export async function mergePdf(files: File[]): Promise<FileProcessResult> {
  const target = await PDFDocument.create();

  for (const file of files) {
    const source = await loadPdfDocument(file);
    const pages = await target.copyPages(source, source.getPageIndices());
    pages.forEach((page) => {
      target.addPage(page);
    });
  }

  const merged = await target.save();
  return createPdfResult(merged, "merged.pdf");
}

export async function splitPdf(file: File, ranges: string): Promise<FileProcessResult> {
  const source = await loadPdfDocument(file);
  const totalPages = source.getPageCount();
  const selectedPages = parsePageRanges(ranges);
  assertValidPageRanges(selectedPages, totalPages);

  if (selectedPages.length === 0) {
    throw new Error("No valid page ranges.");
  }

  const target = await PDFDocument.create();
  const copied = await target.copyPages(
    source,
    selectedPages
  );
  copied.forEach((page) => target.addPage(page));
  const output = await target.save();
  return createPdfResult(output, "split.pdf");
}

export async function rotatePdf(
  file: File,
  degreesToRotate: 90 | 180 | 270,
  pageRangesInput?: string
): Promise<FileProcessResult> {
  const source = await loadPdfDocument(file);
  const totalPages = source.getPageCount();
  const target = await PDFDocument.create();
  const indices = source.getPageIndices();
  const copied = await target.copyPages(source, indices);
  const selectedPages =
    !pageRangesInput || pageRangesInput.trim() === ""
      ? null
      : parsePageRanges(pageRangesInput);
  if (selectedPages) {
    assertValidPageRanges(selectedPages, totalPages);
  }
  copied.forEach((page, idx) => {
    if (!selectedPages) {
      page.setRotation(degrees(degreesToRotate));
      target.addPage(page);
      return;
    }

    if (selectedPages.includes(idx)) {
      page.setRotation(degrees(degreesToRotate));
    }
    target.addPage(page);
  });

  const output = await target.save();
  return createPdfResult(output, "rotated.pdf");
}
