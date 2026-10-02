import type { FileProcessResult } from "../../types/tool";
import { startOcr, type OcrLanguage, type OcrResult } from "../ocr/ocrService";

export function resultFile(result: FileProcessResult): File {
  return new File([result.blob], result.fileName, { type: result.mimeType });
}
export function checkWorkflowAbort(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("Workflow cancelled", "AbortError");
}
export async function processWorkflowFiles(files: File[], processor: (file: File) => Promise<FileProcessResult>, signal: AbortSignal, report: (progress: number) => void): Promise<FileProcessResult[]> {
  const results: FileProcessResult[] = [];
  for (const file of files) {
    checkWorkflowAbort(signal);
    try { results.push(await processor(file)); }
    catch (error) {
      checkWorkflowAbort(signal);
      throw Object.assign(new Error("File processing failed"), { cause: error, fileName: file.name });
    }
    checkWorkflowAbort(signal); report(results.length / files.length * 100);
  }
  return results;
}
export async function recognizeWorkflowDocument(file: File, language: OcrLanguage, signal: AbortSignal, report: (progress: number) => void): Promise<OcrResult> {
  checkWorkflowAbort(signal);
  const job = startOcr(file, language, { onProgress: value => report(value.progress * 100) });
  const cancel = () => job.cancel();
  signal.addEventListener("abort", cancel, { once: true });
  try { return await job.result; }
  finally { signal.removeEventListener("abort", cancel); }
}
