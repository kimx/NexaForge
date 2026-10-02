import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { unzipSync, strFromU8 } from "fflate";
import { mergePdf } from "../pdf/pdfService";
import { addPageNumbersToPdf } from "../pdf/pageNumberService";
import { compressPdf } from "../pdf/compressService";
import { createZip } from "../file/zipService";
import { createOcrTextFile } from "../ocr/ocrService";
import { cleanText } from "../text/textWorkflowService";
import { processWorkflowFiles, resultFile, recognizeWorkflowDocument } from "./fileWorkflowService";

const ocr = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("../ocr/ocrService", async importOriginal => ({ ...await importOriginal<object>(), startOcr: ocr.start }));

it("merges in selected order and retains page numbers and original content through compression", async () => {
  const files: File[] = [];
  for (const [width, text] of [[420, "FIRST"], [600, "SECOND"]] as const) {
    const doc = await PDFDocument.create(); doc.addPage([width, 700]).drawText(text);
    files.push(new File([new Uint8Array(await doc.save())], `${text}.pdf`, { type: "application/pdf" }));
  }
  const merged = await mergePdf(files);
  const numbered = await addPageNumbersToPdf(resultFile(merged), { startingNumber: 7, format: "{n} / {total}" });
  const compressed = await compressPdf(resultFile(numbered), { mode: "preserve-text" });
  const output = await PDFDocument.load(await compressed.blob.arrayBuffer());
  expect(output.getPages().map(page => page.getWidth())).toEqual([420, 600]);
  const contents = output.getPages().map(page => {
    const streams = page.node.Contents()!;
    const refs = "asArray" in streams ? streams.asArray() : [streams];
    return refs.map(ref => new TextDecoder().decode(decodePDFRawStream(output.context.lookup(ref) as PDFRawStream).decode())).join("");
  });
  expect(contents[0]).toContain("<4649525354>");
  expect(contents[0]).toContain("<37202F2032>");
  expect(contents[1]).toContain("<5345434F4E44>");
  expect(contents[1]).toContain("<38202F2032>");
});

it("archives all stage results without overwriting duplicate filenames", async () => {
  const files = [new File(["one"], "same.png"), new File(["two"], "same.png")];
  const progress = vi.fn();
  const stage = await processWorkflowFiles(files, async file => ({ blob: file, fileName: file.name, mimeType: "image/png", size: file.size }), new AbortController().signal, progress);
  const archive = await createZip(stage, "delivery.zip");
  const output = unzipSync(new Uint8Array(await archive.blob.arrayBuffer()));
  expect(Object.keys(output)).toEqual(["same.png", "same-2.png"]);
  expect(strFromU8(output["same.png"])).toBe("one");
  expect(strFromU8(output["same-2.png"])).toBe("two");
  expect(progress).toHaveBeenLastCalledWith(100);
});

it("stops batch work on cancellation and identifies the file that failed", async () => {
  const abort = new AbortController(); const files = [new File(["1"], "one"), new File(["2"], "two")];
  const processor = vi.fn(async file => { abort.abort(); return { blob: file, fileName: file.name, mimeType: "text/plain", size: file.size }; });
  await expect(processWorkflowFiles(files, processor, abort.signal, () => {})).rejects.toMatchObject({ name: "AbortError" });
  expect(processor).toHaveBeenCalledTimes(1);
  await expect(processWorkflowFiles(files, async () => { throw new Error("bad"); }, new AbortController().signal, () => {})).rejects.toMatchObject({ fileName: "one" });
});

it("terminates OCR on cancellation and removes the listener when recognition finishes", async () => {
  const abort = new AbortController(); let reject!: (reason: unknown) => void;
  const cancel = vi.fn(() => reject(new DOMException("Cancelled", "AbortError")));
  ocr.start.mockReturnValue({ result: new Promise((_, fail) => { reject = fail; }), cancel });
  const pending = recognizeWorkflowDocument(new File(["x"], "photo.jpg"), "eng", abort.signal, () => {});
  abort.abort(); await expect(pending).rejects.toMatchObject({ name: "AbortError" }); expect(cancel).toHaveBeenCalledOnce();
  const fresh = new AbortController(); const freshCancel = vi.fn();
  ocr.start.mockReturnValue({ result: Promise.resolve({ text: "  繁體  中文\n\n" }), cancel: freshCancel });
  const recognized = await recognizeWorkflowDocument(new File(["x"], "photo.jpg"), "chi_tra", fresh.signal, () => {});
  fresh.abort(); expect(freshCancel).not.toHaveBeenCalled();
  const cleaned = cleanText(recognized.text, { trimLines: true, collapseSpaces: true, removeEmptyLines: true }).text;
  const output = createOcrTextFile(cleaned, "photo.jpg");
  expect(await output.blob.text()).toBe("繁體 中文");
});
