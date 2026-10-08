import type { FileProcessResult } from "../../types/tool";
import { createPdfResult, getPdfPageSize, loadPdfData } from "./pdfToolkit";

export interface PdfPasswordRemovalInfo {
  encrypted: boolean;
  pageCount: number;
  firstPageWidth: number;
  firstPageHeight: number;
  firstPageIsLandscape: boolean;
  unlockedBytes?: Uint8Array;
}

export async function inspectPdfForPasswordRemoval(file: File): Promise<PdfPasswordRemovalInfo> {
  const { document, bytes, encrypted } = await loadPdfData(file);
  const firstPageSize = getPdfPageSize(document.getPage(0));
  return {
    encrypted,
    pageCount: document.getPageCount(),
    firstPageWidth: firstPageSize.rotatedWidth,
    firstPageHeight: firstPageSize.rotatedHeight,
    firstPageIsLandscape: firstPageSize.isLandscape,
    unlockedBytes: encrypted ? bytes : undefined,
  };
}

export function createUnlockedPdfResult(file: File, bytes: Uint8Array): FileProcessResult {
  const baseName = file.name.replace(/\.pdf$/i, "") || "document";
  const safeBaseName = baseName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-") || "document";
  return createPdfResult(bytes, `${safeBaseName}-unlocked.pdf`);
}
