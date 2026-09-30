// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeAll, describe, expect, it, vi } from "vitest";

let source: string;
beforeAll(() => {
  execFileSync(process.execPath, ["scripts/copy-ocr-assets.mjs"], { cwd: process.cwd() });
  source = readFileSync(resolve("public/ocr/coordinator.js"), "utf8");
});

function environment(width = 1000, height = 500) {
  const messages: Array<{ type: string; code?: string; text?: string }> = [];
  const bitmap = { width, height, close: vi.fn() };
  const normalizedPng = { type: "image/png" };
  const recognizedImages: unknown[] = [];
  const worker = { recognize: async (image: unknown) => { recognizedImages.push(image); return { data: { text: "收據 Total 123\n", confidence: 95 } }; }, terminate: vi.fn(async () => {}) };
  const globals = {
    URL,
    self: { location: { href: "https://example.com/ocr/coordinator.js" }, postMessage: (message: (typeof messages)[number]) => messages.push(message), onmessage: null as null | ((event: unknown) => Promise<void>) },
    createImageBitmap: async () => bitmap,
    OffscreenCanvas: class {
      constructor(public width: number, public height: number) {}
      getContext() { return { fillStyle: "", fillRect() {}, drawImage() {} }; }
      async convertToBlob() { return normalizedPng; }
    },
    importScripts: vi.fn(),
    Tesseract: { createWorker: vi.fn(async () => worker) },
  };
  return { globals, messages, bitmap, normalizedPng, recognizedImages, worker };
}
const input = { data: { file: { type: "image/webp" }, language: "chi_tra+eng", langPath: "https://tessdata.projectnaptha.com/4.0.0" } };

describe("staged OCR coordinator", () => {
  it("normalizes image codecs to PNG, returns text and closes resources", async () => {
    const env = environment();
    runInNewContext(source, env.globals);
    await env.globals.self.onmessage!(input);
    expect(env.recognizedImages).toEqual([env.normalizedPng]);
    expect(env.messages.at(-1)).toMatchObject({ type: "result", text: "收據 Total 123\n" });
    expect(env.bitmap.close).toHaveBeenCalledOnce();
    expect(env.worker.terminate).toHaveBeenCalledOnce();
    expect(env.globals.Tesseract.createWorker).toHaveBeenCalledWith("chi_tra+eng", 1, expect.objectContaining({ workerPath: "https://example.com/ocr/worker.min.js", corePath: "https://example.com/ocr/core", workerBlobURL: false }));
  });

  it("rejects excessive decoded pixels before loading models and closes the bitmap", async () => {
    const env = environment(5000, 5000);
    runInNewContext(source, env.globals);
    await env.globals.self.onmessage!(input);
    expect(env.messages.at(-1)).toMatchObject({ type: "error", code: "pixels" });
    expect(env.globals.Tesseract.createWorker).not.toHaveBeenCalled();
    expect(env.bitmap.close).toHaveBeenCalledOnce();
  });

  it("reports unavailable browser worker image capabilities as a browser error", async () => {
    const env = environment();
    runInNewContext(source, { ...env.globals, OffscreenCanvas: undefined });
    await env.globals.self.onmessage!(input);
    expect(env.messages.at(-1)).toMatchObject({ type: "error", code: "worker" });
  });
});
