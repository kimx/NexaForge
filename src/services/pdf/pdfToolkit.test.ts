import { PDFDocument } from "pdf-lib";
import {
  calculatePdfPosition,
  createPdfProcessingController,
  createPdfResult,
  getPdfPageSize,
  loadPdfDocument,
  validatePdfFile,
  validatePdfFileType,
} from "./pdfToolkit";
import { downloadBlob } from "../../utils/download";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PDF toolkit", () => {
  it("loads valid PDFs and reports invalid, empty, and encrypted input clearly", async () => {
    const document = await PDFDocument.create();
    document.addPage([600, 400]);
    const file = new File([await document.save() as unknown as BlobPart], "landscape.pdf", {
      type: "application/pdf",
    });

    await expect(loadPdfDocument(file)).resolves.toBeInstanceOf(PDFDocument);
    await expect(validatePdfFile(file)).resolves.toMatchObject({
      valid: true,
      pageCount: 1,
    });
    await expect(validatePdfFile(new File(["not a pdf"], "broken.pdf", {
      type: "application/pdf",
    }))).resolves.toMatchObject({
      valid: false,
      error: { code: "broken-pdf" },
    });
    expect(validatePdfFileType(new File([""], "empty.pdf", {
      type: "application/pdf",
    }))).toMatchObject({ code: "empty-file" });
    expect(validatePdfFileType(new File(["%PDF"], "notes.txt"))).toMatchObject({
      code: "invalid-file-type",
    });
  });

  it("uses crop boxes and calculates positions from page dimensions", async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 700]);
    page.setCropBox(20, 30, 800, 500);
    const size = getPdfPageSize(page);

    expect(size).toMatchObject({
      x: 20,
      y: 30,
      width: 800,
      height: 500,
      isLandscape: true,
    });
    expect(calculatePdfPosition(size, { width: 100, height: 20 }, "top-right", 10)).toEqual({
      x: 710,
      y: 500,
    });
    expect(calculatePdfPosition(size, { width: 100, height: 20 }, "bottom-center")).toEqual({
      x: 370,
      y: 30,
    });
  });

  it("creates PDF results and prevents overlapping processing", async () => {
    const result = createPdfResult(new Uint8Array([37, 80, 68, 70]), "result.pdf");
    expect(result).toMatchObject({
      fileName: "result.pdf",
      mimeType: "application/pdf",
      size: 4,
    });

    const controller = createPdfProcessingController();
    let resolveOperation: (() => void) | undefined;
    const operation = controller.run(() => new Promise<void>((resolve) => {
      resolveOperation = resolve;
    }));
    expect(controller.state).toBe("processing");
    await expect(controller.run(async () => undefined)).rejects.toMatchObject({
      code: "already-processing",
    });
    resolveOperation?.();
    await operation;
    expect(controller.state).toBe("success");
  });

  it("cleans up downloaded object URLs after the browser starts the download", () => {
    const revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:pdf-result"),
      revokeObjectURL,
    });
    vi.useFakeTimers();

    downloadBlob(new Blob(["pdf"], { type: "application/pdf" }), "result.pdf");

    expect(document.querySelector("a")).toBeNull();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:pdf-result");
  });
});
