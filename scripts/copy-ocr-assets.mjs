import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(projectRoot, "public/ocr");
mkdirSync(resolve(target, "core"), { recursive: true });
for (const name of ["worker.min.js", "worker.min.js.LICENSE.txt", "tesseract.min.js", "tesseract.min.js.LICENSE.txt"]) {
  copyFileSync(resolve(projectRoot, "node_modules/tesseract.js/dist", name), resolve(target, name));
}
const coreDir = resolve(projectRoot, "node_modules/tesseract.js-core");
// Preserve the complete set of scalar, SIMD and relaxed-SIMD wrappers/WASM.
// Tesseract.js chooses the supported core at runtime (v7 adds relaxed SIMD).
for (const name of readdirSync(coreDir).filter((name) => /^tesseract-core.*\.(?:js|wasm)$/.test(name) || name === "LICENSE")) {
  copyFileSync(resolve(coreDir, name), resolve(target, "core", name));
}

// A coordinator keeps public Tesseract API initialization cancellable. A page can
// terminate this Worker at any time, also terminating its nested OCR Worker.
writeFileSync(resolve(target, "coordinator.js"), String.raw`
"use strict";
self.onmessage = async ({ data: { file, language, langPath } }) => {
  let worker;
  let image;
  let stage = "decoding";
  let failed = false;
  const fail = (error) => {
    if (failed) return;
    failed = true;
    self.postMessage({ type: "error", code: error.code || (stage === "loading" ? "model" : stage === "decoding" ? "image" : "recognition"), message: String(error.message || error) });
  };
  try {
    if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
      throw Object.assign(new Error("This browser does not support worker image decoding"), { code: "worker" });
    }
    self.postMessage({ type: "progress", progress: 0, stage });
    image = await createImageBitmap(file);
    if (image.width > 8000 || image.height > 8000 || image.width * image.height > 16000000) {
      throw Object.assign(new Error("Image exceeds 16 megapixels or 8000 pixels per side"), { code: "pixels" });
    }
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to decode image");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    image.close(); image = null;
    // Leptonica does not support every browser image codec. Normalize WebP and
    // transparency to an opaque lossless PNG entirely inside this worker.
    const png = await canvas.convertToBlob({ type: "image/png" });
    canvas.width = 1; canvas.height = 1;
    stage = "loading";
    self.postMessage({ type: "progress", progress: 0.05, stage });
    importScripts(new URL("tesseract.min.js", self.location.href).href);
    worker = await Tesseract.createWorker(language, 1, {
      workerPath: new URL("worker.min.js", self.location.href).href,
      corePath: new URL("core", self.location.href).href,
      langPath,
      workerBlobURL: false,
      errorHandler: fail,
      logger: (message) => {
        const recognizing = message.status === "recognizing text";
        self.postMessage({ type: "progress", stage: recognizing ? "recognizing" : "loading", progress: recognizing ? 0.35 + message.progress * 0.65 : 0.05 + message.progress * 0.25 });
      },
    });
    stage = "recognizing";
    const { data } = await worker.recognize(png, {}, { text: true });
    await worker.terminate(); worker = null;
    if (!failed) self.postMessage({ type: "result", text: data.text, confidence: data.confidence });
  } catch (error) { fail(error); }
  finally { if (image) image.close(); if (worker) await worker.terminate(); }
};
`);
console.log("Staged OCR worker and core assets in public/ocr");
