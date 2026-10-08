import { PDFDocument } from "pdf-lib";
import { decrypt, encrypt, inspect } from "@arshad-shah/qpdf-wasm";
import { vi } from "vitest";
import { inspectPdfForPasswordRemoval } from "./passwordService";
import {
  registerPdfPasswordPresenter,
  type PdfPasswordPrompt,
} from "./pdfPasswordPrompt";

vi.mock("./qpdfWorkerClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("./qpdfWorkerClient")>();
  const qpdf = await import("@arshad-shah/qpdf-wasm");
  return {
    ...original,
    inspectPdfEncryption: qpdf.inspect,
    decryptPdfInWorker: async (
      bytes: Uint8Array,
      password: string,
      signal: AbortSignal
    ) => {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      return (await qpdf.decrypt(bytes, password)).bytes;
    },
  };
});

let unregister: (() => void) | undefined;

afterEach(() => {
  unregister?.();
  unregister = undefined;
  vi.restoreAllMocks();
});

async function makePdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([420, 640]);
  page.drawText("Locally protected content");
  return new Uint8Array(await document.save());
}

function asPdfFile(bytes: Uint8Array, name = "protected.pdf"): File {
  return new File([bytes.slice().buffer], name, { type: "application/pdf" });
}

async function waitForPrompt(
  operation: Promise<unknown>,
  getPrompt: () => PdfPasswordPrompt | null
): Promise<PdfPasswordPrompt> {
  await vi.waitFor(() => expect(getPrompt()).not.toBeNull());
  return getPrompt()!;
}

describe("PDF password removal service", () => {
  it("does not rewrite an unencrypted file or request a password", async () => {
    const original = await makePdf();
    const file = asPdfFile(original, "plain.pdf");
    let prompt: PdfPasswordPrompt | null = null;
    unregister = registerPdfPasswordPresenter((next) => {
      prompt = next;
    });

    const result = await inspectPdfForPasswordRemoval(file);

    expect(result).toMatchObject({
      encrypted: false,
      pageCount: 1,
      firstPageWidth: 420,
      firstPageHeight: 640,
      firstPageIsLandscape: false,
      unlockedBytes: undefined,
    });
    expect(prompt).toBeNull();
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(original);
  });

  it("retries an incorrect password and returns a genuine unlocked PDF", async () => {
    const original = await makePdf();
    const encrypted = (await encrypt(original, {
      userPassword: "correct-password",
      ownerPassword: "owner-password",
    })).bytes;
    const file = asPdfFile(encrypted);
    let prompt: PdfPasswordPrompt | null = null;
    unregister = registerPdfPasswordPresenter((next) => {
      prompt = next;
    });

    const operation = inspectPdfForPasswordRemoval(file);
    const challenge = await waitForPrompt(operation, () => prompt);
    await expect(challenge.submit("wrong-password")).resolves.toBe("incorrect");
    expect(prompt).toBe(challenge);
    await expect(challenge.submit("correct-password")).resolves.toBe("accepted");

    const result = await operation;
    expect(result).toMatchObject({
      encrypted: true,
      pageCount: 1,
      firstPageWidth: 420,
      firstPageHeight: 640,
      firstPageIsLandscape: false,
    });
    expect(result.unlockedBytes).toBeDefined();
    const opened = await PDFDocument.load(result.unlockedBytes!);
    expect(opened.getPageCount()).toBe(1);
    expect(opened.getPage(0).getSize()).toEqual({ width: 420, height: 640 });
    await expect(inspect(result.unlockedBytes!)).resolves.toMatchObject({
      encrypted: false,
      needsPassword: false,
    });
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(encrypted);
  });

  it("cancels only the current file operation and distinguishes owner-only restrictions", async () => {
    const original = await makePdf();
    const encrypted = (await encrypt(original, {
      userPassword: "open-password",
      ownerPassword: "owner-password",
    })).bytes;
    let prompt: PdfPasswordPrompt | null = null;
    unregister = registerPdfPasswordPresenter((next) => {
      prompt = next;
    });
    const operation = inspectPdfForPasswordRemoval(asPdfFile(encrypted));
    const challenge = await waitForPrompt(operation, () => prompt);
    challenge.cancel();
    await expect(operation).rejects.toMatchObject({ code: "password-cancelled" });

    const ownerOnly = (await encrypt(original, {
      userPassword: "",
      ownerPassword: "owner-password",
    })).bytes;
    await expect(
      inspectPdfForPasswordRemoval(asPdfFile(ownerOnly, "owner-only.pdf"))
    ).rejects.toMatchObject({ code: "permission-restricted" });
    expect(prompt).toBeNull();
  });
});
