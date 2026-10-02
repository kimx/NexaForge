import { describe, expect, it, vi } from "vitest";
import { createOcrTextFile, startOcr, validateOcrFile, type OcrWorker } from "./ocrService";

class TestWorker implements OcrWorker {
  onmessage: OcrWorker["onmessage"] = null;
  onerror: OcrWorker["onerror"] = null;
  messages: unknown[] = [];
  stopped = false;
  postMessage(message: unknown): void { this.messages.push(message); }
  terminate(): void { this.stopped = true; }
  receive(data: unknown): void { this.onmessage?.({ data } as MessageEvent); }
}
const image = () => new File(["image"], "receipt.webp", { type: "image/webp" });

describe("OCR worker lifecycle", () => {
  it("returns recognized Unicode text and releases the worker", async () => {
    const worker = new TestWorker();
    const job = startOcr(image(), "chi_tra+eng", { createWorker: () => worker });
    worker.receive({ type: "result", text: "收據 Total 123\n", confidence: 92 });
    await expect(job.result).resolves.toEqual({ text: "收據 Total 123\n", confidence: 92 });
    expect(worker.stopped).toBe(true);
  });

  it("cancels immediately while language models are still loading", async () => {
    const worker = new TestWorker();
    const job = startOcr(image(), "eng", { createWorker: () => worker });
    const rejected = expect(job.result).rejects.toMatchObject({ name: "AbortError" });
    job.cancel();
    expect(worker.stopped).toBe(true);
    await rejected;
  });

  it("ignores late text and progress after cancellation", async () => {
    const worker = new TestWorker();
    const onProgress = vi.fn();
    const job = startOcr(image(), "eng", { createWorker: () => worker, onProgress });
    const receive = worker.onmessage;
    const rejected = expect(job.result).rejects.toMatchObject({ name: "AbortError" });
    job.cancel();
    receive?.({ data: { type: "progress", progress: 1, stage: "recognizing" } } as MessageEvent);
    receive?.({ data: { type: "result", text: "stale", confidence: 90 } } as MessageEvent);
    await rejected;
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("releases the worker on a model download failure", async () => {
    const worker = new TestWorker();
    const job = startOcr(image(), "eng", { createWorker: () => worker });
    worker.receive({ type: "error", code: "model", message: "network unavailable" });
    await expect(job.result).rejects.toMatchObject({ code: "model" });
    expect(worker.stopped).toBe(true);
  });

  it("reports bounded progress with the stage to the caller", () => {
    const worker = new TestWorker();
    const onProgress = vi.fn();
    startOcr(image(), "eng", { createWorker: () => worker, onProgress });
    worker.receive({ type: "progress", progress: 1.5, stage: "recognizing" });
    expect(onProgress).toHaveBeenCalledWith({ progress: 1, stage: "recognizing" });
  });

  it("rejects empty, unsupported and oversized input before creating a worker", () => {
    expect(validateOcrFile(new File([], "empty.png", { type: "image/png" }))).toBe("empty");
    expect(validateOcrFile(new File(["pdf"], "doc.pdf", { type: "application/pdf" }))).toBe("type");
    const huge = image();
    Object.defineProperty(huge, "size", { value: 21 * 1024 * 1024 });
    expect(validateOcrFile(huge)).toBe("size");
    const createWorker = vi.fn();
    expect(() => startOcr(huge, "eng", { createWorker })).toThrow();
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("creates a UTF-8 text download preserving Unicode and line breaks", async () => {
    const result = createOcrTextFile("收據\nTotal 123\n", "receipt.photo.webp");
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(result.blob, "UTF-8");
    });
    expect(result.fileName).toBe("receipt.photo-ocr.txt");
    expect(result.mimeType).toBe("text/plain;charset=utf-8");
    expect(content).toBe("收據\nTotal 123\n");
  });
});
