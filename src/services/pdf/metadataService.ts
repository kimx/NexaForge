import { PDFDocument } from "pdf-lib";
import type { FileProcessResult } from "../../types/tool";
import { createPdfResult, loadPdfDocument } from "./pdfToolkit";

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeDate(value: Date | undefined): Date | undefined {
  return value && !Number.isNaN(value.getTime()) ? value : undefined;
}

export async function readPdfMetadata(file: File): Promise<PdfMetadata> {
  const document = await loadPdfDocument(file, { updateMetadata: false });
  return {
    title: normalizeText(document.getTitle()),
    author: normalizeText(document.getAuthor()),
    subject: normalizeText(document.getSubject()),
    keywords: normalizeText(document.getKeywords()),
    creator: normalizeText(document.getCreator()),
    producer: normalizeText(document.getProducer()),
    creationDate: normalizeDate(document.getCreationDate()),
    modificationDate: normalizeDate(document.getModificationDate()),
  };
}

function getCleanFileName(file: File): string {
  const baseName = file.name.replace(/\.pdf$/i, "") || "document";
  return `${baseName}-no-metadata.pdf`;
}

export async function removePdfMetadata(file: File): Promise<FileProcessResult> {
  const document = await loadPdfDocument(file, { updateMetadata: false });
  document.context.trailerInfo.Info = undefined;
  const output = await document.save();
  return createPdfResult(output, getCleanFileName(file));
}
