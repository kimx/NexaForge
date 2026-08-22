export type ProcessingState = "idle" | "ready" | "processing" | "success" | "error";

export interface FileProcessResult {
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface ImageResizeOptions {
  width: number;
  height: number;
  keepAspectRatio: boolean;
  quality: number;
  format: "jpeg" | "png" | "webp";
}

export interface ImageCompressOptions {
  quality: number;
  format: "jpeg" | "png" | "webp";
}

export interface ImageConvertOptions {
  format: "jpeg" | "png" | "webp" | "avif";
}

export interface HashOptions {
  algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
}

export interface CsvToJsonOptions {
  header: boolean;
}

export interface JsonToCsvOptions {
  includeHeader: boolean;
}

export interface UuidOptions {
  batchCount: number;
}

export interface QrCodeOptions {
  size: number;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
}

export interface ToolDefinition {
  id: string;
  title: string;
  description: string;
  path: string;
  category: "Image" | "PDF" | "Data" | "Text" | "Developer" | "QR & Barcode";
  aliases?: string[];
  keywords?: string[];
}

export interface ToolMeta {
  title: string;
  description: string;
  canonical: string;
  h1: string;
  noIndex?: boolean;
}

export interface ValidationError {
  message: string;
  reason: FileRejectionReason;
}

export interface ToolWorkflow {
  state: ProcessingState;
  error?: string | null;
  progress?: number;
  onRetry?: () => void;
  onReprocess?: () => void;
}

export type FileRejectionReason = "unsupported extension" | "size exceeds" | "invalid mime";

export interface FileRejection {
  fileName: string;
  reason: FileRejectionReason;
  message: string;
}
