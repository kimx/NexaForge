import type { FileProcessResult } from "../../types/tool";
import { normalizeEan13 } from "./qrPayloads";

export type BarcodeFormat = "code128" | "ean13";

export interface BarcodeOptions {
  format: BarcodeFormat;
  scale: number;
}

export interface BarcodeRenderer {
  renderPng(value: string, options: BarcodeOptions): Promise<Blob>;
  renderSvg(value: string, options: BarcodeOptions): Promise<string>;
}

export interface BarcodeRenderResult {
  value: string;
  png: FileProcessResult;
  svg: FileProcessResult;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to serialize barcode image"));
    }, "image/png");
  });
}

function renderOptions(value: string, options: BarcodeOptions) {
  return {
    bcid: options.format,
    text: value,
    scale: options.scale,
    height: 12,
    includetext: true,
    textxalign: "center" as const,
    backgroundcolor: "ffffff",
  };
}

const defaultRenderer: BarcodeRenderer = {
  async renderPng(value, options) {
    const bwipjs = await import("bwip-js/browser");
    const canvas = document.createElement("canvas");
    bwipjs.toCanvas(canvas, renderOptions(value, options));
    return canvasToBlob(canvas);
  },
  async renderSvg(value, options) {
    const bwipjs = await import("bwip-js/browser");
    return bwipjs.toSVG(renderOptions(value, options));
  },
};

function filenamePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "barcode";
}

export async function generateBarcode(
  rawValue: string,
  options: BarcodeOptions,
  renderer: BarcodeRenderer = defaultRenderer
): Promise<BarcodeRenderResult> {
  if (!Number.isInteger(options.scale) || options.scale < 1 || options.scale > 5) {
    throw new Error("Barcode scale must be between 1 and 5");
  }

  const value = options.format === "ean13" ? normalizeEan13(rawValue) : rawValue.trim();
  if (!value) {
    throw new Error("Barcode value is required");
  }

  const [pngBlob, svgText] = await Promise.all([
    renderer.renderPng(value, options),
    renderer.renderSvg(value, options),
  ]);
  const baseName = `${options.format}-${filenamePart(value)}`;
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });

  return {
    value,
    png: {
      blob: pngBlob,
      fileName: `${baseName}.png`,
      mimeType: "image/png",
      size: pngBlob.size,
    },
    svg: {
      blob: svgBlob,
      fileName: `${baseName}.svg`,
      mimeType: "image/svg+xml",
      size: svgBlob.size,
    },
  };
}
