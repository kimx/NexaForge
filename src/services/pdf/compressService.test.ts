import { PDFDocument, PDFRawStream, decodePDFRawStream, degrees } from "pdf-lib";
import { compressPdf } from "./compressService";

const renderer = vi.hoisted(() => ({ getDocument: vi.fn(), destroy: vi.fn(), cleanup: vi.fn(), pageCleanup: vi.fn(), cancel: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, getDocument: renderer.getDocument }));
// A JPEG SOF header is sufficient for pdf-lib's dimension parser; canvas rendering is stubbed in jsdom.
const JPEG = new Uint8Array([255, 216, 255, 192, 0, 11, 8, 0, 1, 0, 1, 1, 1, 17, 0, 255, 217]);

async function fixture({ compact = false, padding = 0, rotated = false, cropped = false } = {}): Promise<File> {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  const page = pdf.addPage([600, 400]);
  page.drawText("Selectable source text");
  if (rotated) page.setRotation(degrees(90));
  if (cropped) page.setCropBox(50, 40, 300, 200);
  pdf.getForm().createTextField("name").setText("Ada");
  const bytes = await pdf.save({ useObjectStreams: compact });
  return new File([new Uint8Array(bytes), " ".repeat(padding)], "report.pdf", { type: "application/pdf" });
}

function contents(pdf: PDFDocument): string {
  const streams = pdf.getPage(0).node.Contents()!;
  const references = "asArray" in streams ? streams.asArray() : [streams];
  return references.map((reference) => {
    const stream = pdf.context.lookup(reference) as PDFRawStream;
    return new TextDecoder().decode(decodePDFRawStream(stream).decode());
  }).join("");
}

function mockRenderer(viewport = { width: 600, height: 400 }, renderPromise = Promise.resolve()) {
  renderer.getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages: 1, cleanup: renderer.cleanup, getPage: async () => ({
      getViewport: ({ scale }: { scale: number }) => ({ width: viewport.width * scale, height: viewport.height * scale }),
      render: () => ({ promise: renderPromise, cancel: renderer.cancel }), cleanup: renderer.pageCleanup,
    }) }), destroy: renderer.destroy,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
  return vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob([JPEG], { type: "image/jpeg" })));
}

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("PDF compression", () => {
  it("rewrites object streams without losing selectable content or form values", async () => {
    const file = await fixture();
    const source = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
    const result = await compressPdf(file, { mode: "preserve-text" });
    const output = await PDFDocument.load(await result.blob.arrayBuffer(), { updateMetadata: false });
    expect(result.status).toBe("reduced");
    expect(result.size).toBeLessThan(file.size);
    expect(contents(output)).toBe(contents(source));
    expect(output.getForm().getTextField("name").getText()).toBe("Ada");
    expect(output.getPage(0).getSize()).toEqual({ width: 600, height: 400 });
  });

  it("returns the exact original bytes if rewriting does not save bytes", async () => {
    const file = await fixture({ compact: true });
    const result = await compressPdf(file, { mode: "preserve-text" });
    expect(result.status).toBe("original-kept");
    expect(result.fileName).toBe("report.pdf");
    expect(await result.blob.arrayBuffer()).toEqual(await file.arrayBuffer());
    expect(result.attemptedSize).toBeGreaterThanOrEqual(file.size);
  });

  it("does not deliver a completed result after cancellation from a progress callback", async () => {
    const controller = new AbortController();
    await expect(compressPdf(await fixture(), {
      mode: "preserve-text", signal: controller.signal,
      onProgress: (done, total) => { if (done === total) controller.abort(); },
    })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("embeds JPEG pages at the original physical dimensions independently of rendering resolution", async () => {
    const toBlob = mockRenderer();
    const progress = vi.fn();
    const result = await compressPdf(await fixture({ padding: 8000 }), { mode: "raster", quality: 0.6, dpi: 144, onProgress: progress });
    const output = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(output.getPage(0).getSize()).toEqual({ width: 600, height: 400 });
    expect(output.getForm().getFields()).toHaveLength(0);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.6);
    expect(progress).toHaveBeenLastCalledWith(1, 1);
    expect(renderer.cleanup).toHaveBeenCalledOnce();
    expect(renderer.destroy).toHaveBeenCalledOnce();
    expect(renderer.pageCleanup).toHaveBeenCalledOnce();
    expect(toBlob.mock.instances[0]).toMatchObject({ width: 0, height: 0 });
  });

  it("preserves the physical page size and rotation of rotated pages", async () => {
    mockRenderer();
    const result = await compressPdf(await fixture({ padding: 8000, rotated: true }), { mode: "raster", quality: 0.6, dpi: 72 });
    const output = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(output.getPage(0).getSize()).toEqual({ width: 600, height: 400 });
    expect(output.getPage(0).getRotation().angle).toBe(90);
  });

  it("preserves paper and crop dimensions when the visible region is smaller than the page", async () => {
    mockRenderer({ width: 300, height: 200 });
    const result = await compressPdf(await fixture({ padding: 8000, cropped: true }), { mode: "raster", dpi: 72 });
    const output = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(output.getPage(0).getMediaBox()).toEqual({ x: 0, y: 0, width: 600, height: 400 });
    expect(output.getPage(0).getCropBox()).toEqual({ x: 50, y: 40, width: 300, height: 200 });
  });

  it("cancels active rendering and releases the worker and canvas", async () => {
    let rejectRender!: (error: Error) => void;
    const pending = new Promise<never>((_, reject) => { rejectRender = reject; });
    renderer.cancel.mockImplementation(() => rejectRender(new Error("cancelled")));
    mockRenderer(undefined, pending);
    const controller = new AbortController();
    const operation = compressPdf(await fixture(), { mode: "raster", signal: controller.signal });
    void operation.catch(() => {});
    await vi.waitFor(() => expect(renderer.getDocument).toHaveBeenCalled());
    await vi.waitFor(() => expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled());
    controller.abort();
    await expect(operation).rejects.toMatchObject({ name: "AbortError" });
    expect(renderer.cancel).toHaveBeenCalledOnce();
    expect(renderer.destroy).toHaveBeenCalledOnce();
  });

  it("destroys a worker when loading fails", async () => {
    renderer.getDocument.mockImplementation(() => ({ promise: Promise.reject(new Error("Invalid PDF")), destroy: renderer.destroy }));
    await expect(compressPdf(await fixture(), { mode: "raster" })).rejects.toMatchObject({ code: "broken-pdf" });
    expect(renderer.destroy).toHaveBeenCalledOnce();
  });

  it("rejects damaged and encrypted documents with actionable error codes", async () => {
    await expect(compressPdf(new File(["bad"], "bad.pdf"), { mode: "preserve-text" })).rejects.toMatchObject({ code: "broken-pdf" });
    const pdf = await fixture();
    const text = new TextDecoder("latin1").decode(await pdf.arrayBuffer()).replace("/Root", "/Encrypt 1 0 R\n/Root");
    await expect(compressPdf(new File([text], "encrypted.pdf"), { mode: "preserve-text" })).rejects.toMatchObject({ code: "encrypted-pdf" });
  });

  it("rejects unsafe rendering dimensions before allocating a canvas", async () => {
    mockRenderer({ width: 10000, height: 10000 });
    await expect(compressPdf(await fixture(), { mode: "raster" })).rejects.toMatchObject({ code: "render-limit" });
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
    expect(renderer.destroy).toHaveBeenCalledOnce();
  });

  it.each([{ dpi: 0 }, { dpi: 601 }, { quality: 0 }, { quality: Number.NaN }])("rejects invalid raster controls %j", async (controls) => {
    await expect(compressPdf(await fixture(), { mode: "raster", ...controls })).rejects.toMatchObject({ code: "invalid-options" });
  });
});
