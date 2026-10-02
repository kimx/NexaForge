import type { FileProcessResult } from "../../types/tool";
export type OcrLanguage = "chi_tra" | "chi_tra+eng" | "eng";
export interface OcrResult { text: string; confidence: number }
export interface OcrProgress { progress: number; stage: "decoding" | "loading" | "recognizing" }
export interface OcrWorker {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}
export interface OcrJob { result: Promise<OcrResult>; cancel: () => void }
export const MAX_OCR_FILE_BYTES = 20 * 1024 * 1024;
// Official upstream model host documented by Tesseract.js local-installation.md.
// Only static language models are requested. Image bytes stay inside browser workers.
export const OCR_MODEL_PATH = "https://tessdata.projectnaptha.com/4.0.0";

export function validateOcrFile(file: File): "empty" | "type" | "size" | null {
  if (!file.size) return "empty";
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return "type";
  if (file.size > MAX_OCR_FILE_BYTES) return "size";
  return null;
}

export function startOcr(file: File, language: OcrLanguage, options: {
  createWorker?: () => OcrWorker;
  onProgress?: (progress: OcrProgress) => void;
} = {}): OcrJob {
  const invalid = validateOcrFile(file);
  if (invalid) throw Object.assign(new Error(invalid), { code: invalid });
  const worker = options.createWorker?.() ?? new Worker(`${import.meta.env.BASE_URL}ocr/coordinator.js`);
  let settled = false;
  let rejectResult!: (reason: unknown) => void;
  const release = (): void => {
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
  };
  const result = new Promise<OcrResult>((resolve, reject) => {
    rejectResult = reject;
    worker.onmessage = ({ data }) => {
      if (settled) return;
      if (data.type === "progress") {
        options.onProgress?.({ progress: Math.max(0, Math.min(1, Number(data.progress) || 0)), stage: data.stage });
        return;
      }
      if (data.type !== "result" && data.type !== "error") return;
      settled = true;
      release();
      if (data.type === "result") resolve({ text: data.text, confidence: data.confidence });
      else reject(Object.assign(new Error(data.message), { code: data.code }));
    };
    worker.onerror = () => {
      if (settled) return;
      settled = true;
      release();
      reject(Object.assign(new Error("Unable to start the OCR worker"), { code: "worker" }));
    };
    try { worker.postMessage({ file, language, langPath: OCR_MODEL_PATH }); }
    catch (error) { settled = true; release(); reject(error); }
  });
  return {
    result,
    cancel: () => {
      if (settled) return;
      settled = true;
      // Terminating this worker also terminates its nested Tesseract worker,
      // including while createWorker is awaiting a first-run model download.
      release();
      rejectResult(new DOMException("OCR cancelled", "AbortError"));
    },
  };
}

export function createOcrTextFile(text: string, sourceName: string): FileProcessResult {
  const mimeType = "text/plain;charset=utf-8";
  const blob = new Blob([text], { type: mimeType });
  return { blob, fileName: `${sourceName.replace(/\.[^.]+$/, "") || "image"}-ocr.txt`, mimeType, size: blob.size };
}
