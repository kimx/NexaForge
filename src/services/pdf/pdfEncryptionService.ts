import {
  decryptPdfInWorker,
  inspectPdfEncryption,
} from "./qpdfWorkerClient";
import { requestPdfPassword } from "./pdfPasswordPrompt";

export class PdfEncryptionError extends Error {
  constructor(
    readonly code: "unsupported-encryption" | "permission-restricted",
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "PdfEncryptionError";
  }
}

export async function decryptProtectedPdf(
  bytes: Uint8Array,
  fileName: string
): Promise<Uint8Array> {
  let inspection;
  try {
    inspection = await inspectPdfEncryption(bytes);
  } catch (error) {
    throw new PdfEncryptionError(
      "unsupported-encryption",
      "This PDF uses an unsupported or damaged encryption format.",
      { cause: error }
    );
  }

  if (!inspection.encrypted) {
    throw new PdfEncryptionError(
      "unsupported-encryption",
      "This PDF could not be decoded as a supported encrypted document."
    );
  }
  if (!inspection.needsPassword) {
    throw new PdfEncryptionError(
      "permission-restricted",
      "This PDF has permission restrictions but does not require an opening password. This tool does not remove owner-only restrictions."
    );
  }

  return requestPdfPassword(fileName, async (password, signal) => {
    try {
      return await decryptPdfInWorker(bytes, password, signal);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "WRONG_PASSWORD"
      ) {
        throw error;
      }
      throw new PdfEncryptionError(
        "unsupported-encryption",
        "This PDF could not be decrypted with the selected browser-compatible encryption handler.",
        { cause: error }
      );
    }
  });
}
