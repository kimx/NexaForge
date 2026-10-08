import type { Inspection } from "@arshad-shah/qpdf-wasm";

export class QpdfWorkerError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "QpdfWorkerError";
  }
}

interface QpdfWorkerResponse {
  id: number;
  result?: unknown;
  error?: { code: string; message: string };
}

let nextRequestId = 1;

function runQpdfWorker(
  operation: "inspect" | "decrypt",
  bytes: Uint8Array,
  password?: string,
  signal?: AbortSignal
): Promise<unknown> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("PDF processing was cancelled.", "AbortError"));
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./qpdf.worker.ts", import.meta.url), { type: "module" });
    const id = nextRequestId++;
    const cleanup = (): void => {
      signal?.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = (): void => {
      cleanup();
      reject(new DOMException("PDF processing was cancelled.", "AbortError"));
    };

    worker.onmessage = ({ data }: MessageEvent<QpdfWorkerResponse>) => {
      if (data.id !== id) return;
      cleanup();
      if (data.error) {
        reject(new QpdfWorkerError(data.error.code, data.error.message));
      } else {
        resolve(data.result);
      }
    };
    worker.onerror = () => {
      cleanup();
      reject(new QpdfWorkerError("WASM_ERROR", "The PDF decryption engine could not run."));
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const transferableBytes = bytes.slice();
      worker.postMessage(
        { id, operation, bytes: transferableBytes.buffer, password },
        [transferableBytes.buffer]
      );
    } catch {
      cleanup();
      reject(new QpdfWorkerError("WASM_ERROR", "The PDF decryption engine could not run."));
    }
  });
}

export async function inspectPdfEncryption(bytes: Uint8Array): Promise<Inspection> {
  return (await runQpdfWorker("inspect", bytes)) as Inspection;
}

export async function decryptPdfInWorker(
  bytes: Uint8Array,
  password: string,
  signal: AbortSignal
): Promise<Uint8Array> {
  return (await runQpdfWorker("decrypt", bytes, password, signal)) as Uint8Array;
}
