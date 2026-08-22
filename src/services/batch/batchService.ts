import type { FileProcessResult } from "../../types/tool";

export const MAX_BATCH_FILES = 20;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_BATCH_BYTES = 200 * 1024 * 1024;

export interface BatchValidationError {
  code: "file-count" | "file-size" | "total-size" | "file-type";
  message: string;
  file?: File;
}

export interface BatchSuccessItem {
  file: File;
  status: "success";
  result: FileProcessResult;
}

export interface BatchErrorItem {
  file: File;
  status: "error";
  error: Error;
}

export type BatchItem = BatchSuccessItem | BatchErrorItem;

export interface BatchRunResult {
  items: BatchItem[];
  completed: number;
  successful: number;
  failed: number;
}

interface BatchOptions {
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number, item: BatchItem) => void;
}

export function validateImageBatch(files: File[]): BatchValidationError[] {
  const errors: BatchValidationError[] = [];
  if (files.length > MAX_BATCH_FILES) {
    errors.push({ code: "file-count", message: `Select at most ${MAX_BATCH_FILES} files.` });
  }
  files.forEach((file) => {
    if (file.size > MAX_FILE_BYTES) {
      errors.push({ code: "file-size", message: `${file.name} exceeds 50 MiB.`, file });
    }
    if (!file.type.startsWith("image/") && !/\.(?:heic|heif)$/i.test(file.name)) {
      errors.push({ code: "file-type", message: `${file.name} is not a supported image.`, file });
    }
  });
  if (files.reduce((total, file) => total + file.size, 0) > MAX_BATCH_BYTES) {
    errors.push({ code: "total-size", message: "The selected files exceed 200 MiB in total." });
  }
  return errors;
}

export async function runBatch(
  files: File[],
  processor: (file: File, index: number, signal?: AbortSignal) => Promise<FileProcessResult>,
  options: BatchOptions = {}
): Promise<BatchRunResult> {
  const items = new Array<BatchItem>(files.length);
  let nextIndex = 0;
  let completed = 0;
  const concurrency = Math.max(1, Math.min(files.length || 1, Math.trunc(options.concurrency ?? 2)));

  const worker = async (): Promise<void> => {
    while (nextIndex < files.length) {
      const index = nextIndex;
      nextIndex += 1;
      const file = files[index];
      let item: BatchItem;
      try {
        if (options.signal?.aborted) {
          throw new DOMException("The operation was aborted.", "AbortError");
        }
        const result = await processor(file, index, options.signal);
        item = { file, status: "success", result };
      } catch (cause) {
        item = {
          file,
          status: "error",
          error: cause instanceof Error ? cause : new Error(String(cause)),
        };
      }
      items[index] = item;
      completed += 1;
      options.onProgress?.(completed, files.length, item);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const successful = items.filter((item) => item.status === "success").length;
  return { items, completed, successful, failed: items.length - successful };
}
