import { degrees, PDFDocument } from "pdf-lib";
import { readFileAsArrayBuffer } from "../file/fileService";
import type { FileProcessResult } from "../../types/tool";
import { assertValidPageRanges, parsePageRanges } from "./pageRange";

export async function mergePdf(files: File[]): Promise<FileProcessResult> {
  const target = await PDFDocument.create();

  for (const file of files) {
    const bytes = await readFileAsArrayBuffer(file);
    const source = await PDFDocument.load(bytes);
    const pages = await target.copyPages(source, source.getPageIndices());
    pages.forEach((page) => {
      target.addPage(page);
    });
  }

  const merged = await target.save();
  const pdfData = new Uint8Array(merged);
  const blob = new Blob([pdfData], { type: "application/pdf" });
  return {
    blob,
    fileName: "merged.pdf",
    mimeType: "application/pdf",
    size: blob.size,
  };
}

export async function splitPdf(file: File, ranges: string): Promise<FileProcessResult> {
  const source = await PDFDocument.load(await readFileAsArrayBuffer(file));
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
  const pdfData = new Uint8Array(output);
  const blob = new Blob([pdfData], { type: "application/pdf" });
  return {
    blob,
    fileName: "split.pdf",
    mimeType: "application/pdf",
    size: blob.size,
  };
}

export async function rotatePdf(
  file: File,
  degreesToRotate: 90 | 180 | 270,
  pageRangesInput?: string
): Promise<FileProcessResult> {
  const source = await PDFDocument.load(await readFileAsArrayBuffer(file));
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
  const pdfData = new Uint8Array(output);
  const blob = new Blob([pdfData], { type: "application/pdf" });
  return {
    blob,
    fileName: "rotated.pdf",
    mimeType: "application/pdf",
    size: blob.size,
  };
}
