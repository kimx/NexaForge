import { degrees, PDFDocument } from "pdf-lib";
import type { FileProcessResult } from "../../types/tool";
import { readFileAsArrayBuffer } from "../file/fileService";

export interface PdfPageItem {
  id: string;
  originalIndex: number;
  rotation: 0 | 90 | 180 | 270;
  deleted?: boolean;
}

export function createPdfPageItems(pageCount: number): PdfPageItem[] {
  return Array.from({ length: pageCount }, (_, originalIndex) => ({
    id: `page-${originalIndex}`,
    originalIndex,
    rotation: 0,
  }));
}

export async function exportPdfPages(
  file: File,
  pages: PdfPageItem[],
  fileName: string
): Promise<FileProcessResult> {
  if (pages.length === 0) {
    throw new Error("A PDF must contain at least one page.");
  }

  const source = await PDFDocument.load(await readFileAsArrayBuffer(file));
  const target = await PDFDocument.create();
  const copiedPages = await target.copyPages(
    source,
    pages.map(({ originalIndex }) => originalIndex)
  );

  copiedPages.forEach((page, index) => {
    const rotation = pages[index].rotation;
    if (rotation) {
      page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
    }
    target.addPage(page);
  });

  const bytes = await target.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  return {
    blob,
    fileName,
    mimeType: "application/pdf",
    size: blob.size,
  };
}
