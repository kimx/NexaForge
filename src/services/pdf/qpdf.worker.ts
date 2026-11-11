import { configure, decrypt, inspect } from "@arshad-shah/qpdf-wasm";
import qpdfWasmUrl from "@arshad-shah/qpdf-wasm/qpdf.wasm?url";

configure({ wasmUrl: qpdfWasmUrl });

interface QpdfWorkerRequest {
  id: number;
  operation: "inspect" | "decrypt";
  bytes: ArrayBuffer;
  password?: string;
}

interface QpdfWorkerResponse {
  id: number;
  result?: unknown;
  error?: { code: string; message: string };
}

const worker = self as unknown as Worker;

worker.onmessage = async ({ data }: MessageEvent<QpdfWorkerRequest>) => {
  const bytes = new Uint8Array(data.bytes);
  let response: QpdfWorkerResponse;
  try {
    if (data.operation === "inspect") {
      const result = await inspect(bytes);
      response = { id: data.id, result };
    } else {
      const result = await decrypt(bytes, data.password ?? "");
      response = { id: data.id, result: result.bytes };
    }
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : "WASM_ERROR";
    response = {
      id: data.id,
      error: {
        code,
        message: code === "WRONG_PASSWORD" ? "The password is incorrect." : "The PDF could not be decrypted.",
      },
    };
  }

  const transfer =
    response.result instanceof Uint8Array ? [response.result.buffer] : [];
  worker.postMessage(response, transfer);
};
