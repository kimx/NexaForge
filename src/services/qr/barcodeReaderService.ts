export interface BarcodeReadResult {
  value: string;
  format: string;
}

interface BarcodeImage {
  naturalWidth: number;
  naturalHeight: number;
}

interface BarcodeCanvas {
  width: number;
  height: number;
  getContext(contextId: "2d"): CanvasRenderingContext2D | null;
}

interface NativeBarcode {
  rawValue: string;
  format: string;
}

interface NativeBarcodeDetector {
  detect(source: BarcodeCanvas): Promise<NativeBarcode[]>;
}

interface NativeBarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

export interface BarcodeReaderDependencies {
  createObjectUrl(file: Blob): string;
  revokeObjectUrl(url: string): void;
  loadImage(url: string): Promise<BarcodeImage>;
  createCanvas(width: number, height: number): BarcodeCanvas;
  createNativeDetector(): Promise<NativeBarcodeDetector | null>;
  decodeFallback(canvas: BarcodeCanvas): Promise<BarcodeReadResult[]>;
}

export const MAX_BARCODE_IMAGE_DIMENSION = 2048;

const PREFERRED_FORMATS = ["ean_13", "ean_8", "upc_a", "code_128", "code_39"];

export function formatBarcodeLabel(format: string): string {
  const labels: Record<string, string> = {
    ean_13: "EAN-13",
    ean_8: "EAN-8",
    upc_a: "UPC-A",
    code_128: "Code 128",
    code_39: "Code 39",
  };
  return labels[format.toLowerCase()] ?? format;
}

export function getBarcodeResizeDimensions(
  width: number,
  height: number,
  maxDimension = MAX_BARCODE_IMAGE_DIMENSION
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxDimension <= 0) {
    throw new Error("image dimensions must be positive");
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function formatFallbackName(format: unknown): string {
  const names: Record<number, string> = {
    2: "CODE_39",
    4: "CODE_128",
    6: "EAN_8",
    7: "EAN_13",
    14: "UPC_A",
  };
  return typeof format === "number" ? names[format] ?? String(format) : String(format);
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load barcode image"));
    image.src = url;
  });
}

async function createNativeDetector(): Promise<NativeBarcodeDetector | null> {
  const detectorConstructor = (
    globalThis as typeof globalThis & { BarcodeDetector?: NativeBarcodeDetectorConstructor }
  ).BarcodeDetector;
  if (!detectorConstructor) {
    return null;
  }

  const supportedFormats = detectorConstructor.getSupportedFormats
    ? await detectorConstructor.getSupportedFormats()
    : PREFERRED_FORMATS;
  const formats = PREFERRED_FORMATS.filter((format) => supportedFormats.includes(format));
  return new detectorConstructor({ formats: formats.length > 0 ? formats : supportedFormats });
}

async function decodeWithZxing(canvas: BarcodeCanvas): Promise<BarcodeReadResult[]> {
  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  const result = reader.decodeFromCanvas(canvas as HTMLCanvasElement);
  return [{ value: result.getText(), format: formatFallbackName(result.getBarcodeFormat()) }];
}

const defaultDependencies: BarcodeReaderDependencies = {
  createObjectUrl: (file) => URL.createObjectURL(file),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  loadImage,
  createCanvas: (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
  createNativeDetector,
  decodeFallback: decodeWithZxing,
};

function uniqueResults(results: BarcodeReadResult[]): BarcodeReadResult[] {
  return results.filter(
    (result, index) =>
      result.value.trim() &&
      results.findIndex((candidate) => candidate.value === result.value && candidate.format === result.format) === index
  );
}

export async function readBarcodesFromImage(
  file: Blob,
  dependencies: Partial<BarcodeReaderDependencies> = {}
): Promise<BarcodeReadResult[]> {
  const resolved = { ...defaultDependencies, ...dependencies };
  const url = resolved.createObjectUrl(file);

  try {
    const image = await resolved.loadImage(url);
    const dimensions = getBarcodeResizeDimensions(image.naturalWidth, image.naturalHeight);
    const canvas = resolved.createCanvas(dimensions.width, dimensions.height);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to prepare barcode image");
    }
    context.drawImage(image as CanvasImageSource, 0, 0, dimensions.width, dimensions.height);

    let nativeDetector: NativeBarcodeDetector | null = null;
    try {
      nativeDetector = await resolved.createNativeDetector();
    } catch {
      // Use ZXing when the native detector is unavailable or rejects its formats.
    }
    if (nativeDetector) {
      try {
        const nativeResults = uniqueResults(
          (await nativeDetector.detect(canvas)).map(({ rawValue, format }) => ({ value: rawValue, format }))
        );
        if (nativeResults.length > 0) {
          return nativeResults;
        }
      } catch {
        // Use ZXing when the native detector cannot decode this image.
      }
    }

    const fallbackResults = uniqueResults(await resolved.decodeFallback(canvas));
    if (fallbackResults.length === 0) {
      throw new Error("No barcode found");
    }
    return fallbackResults;
  } finally {
    resolved.revokeObjectUrl(url);
  }
}
