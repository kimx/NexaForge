import { PDFDocument } from "pdf-lib";
import { createPdfFromImages, getPdfImageFormat, renderPdfDocumentToImages } from "./conversionService";

const ONE_PIXEL_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  )
);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PDF conversion service", () => {
  it("creates one PDF page for every image in input order", async () => {
    const files = [
      new File([ONE_PIXEL_PNG], "cover.png", { type: "image/png" }),
      new File([ONE_PIXEL_PNG], "detail.png", { type: "image/png" }),
    ];

    const result = await createPdfFromImages(files);
    const document = await PDFDocument.load(await result.blob.arrayBuffer());

    expect(document.getPageCount()).toBe(2);
    expect(result.fileName).toBe("images.pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.size).toBeGreaterThan(0);
  });

  it("normalizes WebP through the browser before embedding it in the PDF", async () => {
    const close = vi.fn();
    const drawImage = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 1, height: 1, close }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob([ONE_PIXEL_PNG], { type: "image/png" }));
    });

    const result = await createPdfFromImages([
      new File(["webp"], "photo.webp"),
    ]);
    const document = await PDFDocument.load(await result.blob.arrayBuffer());

    expect(document.getPageCount()).toBe(1);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("recognizes an extension-only JPEG when the browser omits its MIME type", () => {
    expect(getPdfImageFormat(new File([], "photo.JPEG"))).toBe("jpeg");
  });

  it("renders every PDF page to a numbered PNG and reports progress", async () => {
    const requestedPages: number[] = [];
    const progress: Array<[number, number]> = [];
    const document = {
      numPages: 2,
      async getPage(pageNumber: number) {
        requestedPages.push(pageNumber);
        return {
          getViewport: ({ scale }: { scale: number }) => ({
            width: 40 * scale,
            height: 30 * scale,
          }),
          render: () => ({ promise: Promise.resolve() }),
        };
      },
    };

    const results = await renderPdfDocumentToImages(document, {
      fileName: "Quarterly report.pdf",
      scale: 2,
      onProgress: (completed, total) => progress.push([completed, total]),
      createCanvas: () => {
        const canvasSurface = {
          width: 0,
          height: 0,
          toBlob(callback: BlobCallback, type?: string) {
            callback(new Blob([`${canvasSurface.width}x${canvasSurface.height}`], { type }));
          },
        };
        return {
          canvas: canvasSurface as unknown as HTMLCanvasElement,
          context: {} as CanvasRenderingContext2D,
        };
      },
    });

    expect(requestedPages).toEqual([1, 2]);
    expect(progress).toEqual([[1, 2], [2, 2]]);
    expect(results.map((result) => result.fileName)).toEqual([
      "Quarterly-report-page-01.png",
      "Quarterly-report-page-02.png",
    ]);
    expect(results.every((result) => result.mimeType === "image/png")).toBe(true);
    expect(results.every((result) => result.size > 0)).toBe(true);
  });
});
