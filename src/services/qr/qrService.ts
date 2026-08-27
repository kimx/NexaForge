import QRCode from "qrcode";
import type { FileProcessResult } from "../../types/tool";
import type { QrCodeOptions, QrCornerStyle, QrDesignerOptions, QrModuleStyle } from "../../types/tool";

export const LINE_ICON_DATA_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#06c755"/><path fill="#fff" d="M52 29c0-10-9-18-20-18S12 19 12 29c0 9 7 16 17 18l1 7 7-6c9-2 15-10 15-19Z"/><path fill="#06c755" d="M23 25h3v9h-3zm5 0h3v9h-3zm5 0h3v6h5v3h-8z"/></svg>'
)}`;

interface QrDesignResult {
  png: FileProcessResult;
  svg: FileProcessResult;
}

const DEFAULT_COLORS = {
  foreground: "#000000",
  background: "#ffffff",
};

export async function generateQrImage(text: string, options: QrCodeOptions): Promise<FileProcessResult> {
  const dataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: options.errorCorrectionLevel,
    width: options.size,
    type: "image/png",
    margin: 2,
  });
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return {
    blob,
    fileName: "qr-code.png",
    mimeType: "image/png",
    size: blob.size,
  };
}

export function createQrSvg(text: string, options: QrDesignerOptions): string {
  const normalized = normalizeOptions(options);
  const qr = QRCode.create(text, { errorCorrectionLevel: normalized.errorCorrectionLevel });
  const moduleCount = qr.modules.size;
  const moduleSize = (normalized.size - normalized.margin * 2) / moduleCount;
  const moduleFill =
    normalized.gradient === "none" ? normalized.foregroundColor : "url(#qr-designer-gradient)";
  const finderBackground = normalized.transparentBackground ? "#ffffff" : normalized.backgroundColor;
  const modules: string[] = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (!qr.modules.get(row, column) || isFinderModule(row, column, moduleCount)) {
        continue;
      }

      modules.push(
        createModuleShape(
          normalized.moduleStyle,
          normalized.margin + column * moduleSize,
          normalized.margin + row * moduleSize,
          moduleSize,
          moduleFill
        )
      );
    }
  }

  const finders = [
    createFinder(0, 0, moduleSize, normalized, finderBackground),
    createFinder(0, moduleCount - 7, moduleSize, normalized, finderBackground),
    createFinder(moduleCount - 7, 0, moduleSize, normalized, finderBackground),
  ].join("");
  const gradient = createGradient(normalized);
  const background = normalized.transparentBackground
    ? ""
    : `<rect width="${normalized.size}" height="${normalized.size}" fill="${normalized.backgroundColor}"/>`;
  const logo = createLogo(normalized);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${normalized.size}" height="${normalized.size}" viewBox="0 0 ${normalized.size} ${normalized.size}" role="img" aria-label="QR code">${gradient}${background}<g shape-rendering="geometricPrecision">${modules.join("")}${finders}</g>${logo}</svg>`;
}

export async function generateQrDesign(text: string, options: QrDesignerOptions): Promise<QrDesignResult> {
  const svgMarkup = createQrSvg(text, options);
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const pngBlob = await svgToPngBlob(svgMarkup, normalizeOptions(options).size);

  return {
    png: {
      blob: pngBlob,
      fileName: "qr-code.png",
      mimeType: "image/png",
      size: pngBlob.size,
    },
    svg: {
      blob: svgBlob,
      fileName: "qr-code.svg",
      mimeType: "image/svg+xml",
      size: svgBlob.size,
    },
  };
}

function normalizeOptions(options: QrDesignerOptions): QrDesignerOptions {
  const size = clamp(Math.round(options.size), 128, 1024);
  const logoEnabled = options.logoSource === "line" || (options.logoSource === "custom" && Boolean(options.logoDataUrl));

  return {
    ...options,
    size,
    margin: clamp(Math.round(options.margin), 0, Math.min(64, Math.floor(size / 4))),
    errorCorrectionLevel: logoEnabled ? "H" : options.errorCorrectionLevel,
    foregroundColor: safeColor(options.foregroundColor, DEFAULT_COLORS.foreground),
    backgroundColor: safeColor(options.backgroundColor, DEFAULT_COLORS.background),
    cornerOuterColor: safeColor(options.cornerOuterColor, DEFAULT_COLORS.foreground),
    cornerInnerColor: safeColor(options.cornerInnerColor, DEFAULT_COLORS.foreground),
    gradientStartColor: safeColor(options.gradientStartColor, DEFAULT_COLORS.foreground),
    gradientEndColor: safeColor(options.gradientEndColor, DEFAULT_COLORS.foreground),
    gradientAngle: clamp(Math.round(options.gradientAngle), 0, 360),
    logoSize: clamp(options.logoSize, 10, 25),
    logoPadding: clamp(options.logoPadding, 0, 24),
    logoCornerRadius: clamp(options.logoCornerRadius, 0, 48),
  };
}

function createGradient(options: QrDesignerOptions): string {
  if (options.gradient === "none") {
    return "";
  }

  if (options.gradient === "radial") {
    return `<defs><radialGradient id="qr-designer-gradient" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${options.gradientStartColor}"/><stop offset="100%" stop-color="${options.gradientEndColor}"/></radialGradient></defs>`;
  }

  const radians = ((options.gradientAngle - 90) * Math.PI) / 180;
  const x1 = formatNumber(50 - Math.cos(radians) * 50);
  const y1 = formatNumber(50 - Math.sin(radians) * 50);
  const x2 = formatNumber(50 + Math.cos(radians) * 50);
  const y2 = formatNumber(50 + Math.sin(radians) * 50);
  return `<defs><linearGradient id="qr-designer-gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${options.gradientStartColor}"/><stop offset="100%" stop-color="${options.gradientEndColor}"/></linearGradient></defs>`;
}

function createFinder(
  row: number,
  column: number,
  moduleSize: number,
  options: QrDesignerOptions,
  backgroundColor: string
): string {
  const x = options.margin + column * moduleSize;
  const y = options.margin + row * moduleSize;
  return [
    createModuleShape(options.cornerOuterStyle, x, y, moduleSize * 7, options.cornerOuterColor),
    `<rect x="${formatNumber(x + moduleSize)}" y="${formatNumber(y + moduleSize)}" width="${formatNumber(moduleSize * 5)}" height="${formatNumber(moduleSize * 5)}" fill="${backgroundColor}"/>`,
    createModuleShape(
      options.cornerInnerStyle,
      x + moduleSize * 2,
      y + moduleSize * 2,
      moduleSize * 3,
      options.cornerInnerColor
    ),
  ].join("");
}

function createModuleShape(
  style: QrModuleStyle | QrCornerStyle,
  x: number,
  y: number,
  size: number,
  fill: string
): string {
  const formattedX = formatNumber(x);
  const formattedY = formatNumber(y);
  const formattedSize = formatNumber(size);

  if (style === "dots" || style === "dot") {
    const radius = size * 0.46;
    return `<circle cx="${formatNumber(x + size / 2)}" cy="${formatNumber(y + size / 2)}" r="${formatNumber(radius)}" fill="${fill}"/>`;
  }

  const radius = style === "rounded" ? size * 0.28 : style === "extra-rounded" ? size * 0.5 : 0;
  return `<rect x="${formattedX}" y="${formattedY}" width="${formattedSize}" height="${formattedSize}"${radius ? ` rx="${formatNumber(radius)}" ry="${formatNumber(radius)}"` : ""} fill="${fill}"/>`;
}

function createLogo(options: QrDesignerOptions): string {
  const logoDataUrl =
    options.logoSource === "line"
      ? LINE_ICON_DATA_URL
      : options.logoSource === "custom"
        ? options.logoDataUrl
        : undefined;
  if (!logoDataUrl) {
    return "";
  }

  const logoBoxSize = (options.size * options.logoSize) / 100;
  const x = (options.size - logoBoxSize) / 2;
  const y = x;
  const imageInset = Math.min(options.logoPadding, logoBoxSize / 3);
  const imageSize = logoBoxSize - imageInset * 2;
  const escapedUrl = escapeXmlAttribute(logoDataUrl);
  let background = "";

  if (options.logoBackground === "circle") {
    background = `<circle cx="${formatNumber(options.size / 2)}" cy="${formatNumber(options.size / 2)}" r="${formatNumber(logoBoxSize / 2)}" fill="#ffffff"/>`;
  } else if (options.logoBackground === "rounded") {
    background = `<rect x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(logoBoxSize)}" height="${formatNumber(logoBoxSize)}" rx="${formatNumber(Math.min(options.logoCornerRadius, logoBoxSize / 2))}" fill="#ffffff"/>`;
  }

  return `<g>${background}<image href="${escapedUrl}" x="${formatNumber(x + imageInset)}" y="${formatNumber(y + imageInset)}" width="${formatNumber(imageSize)}" height="${formatNumber(imageSize)}" preserveAspectRatio="xMidYMid meet"/></g>`;
}

function isFinderModule(row: number, column: number, moduleCount: number): boolean {
  return (
    (row < 7 && column < 7) ||
    (row < 7 && column >= moduleCount - 7) ||
    (row >= moduleCount - 7 && column < 7)
  );
}

function safeColor(value: string, fallback: string): string {
  return /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

function escapeXmlAttribute(value: string): string {
  return value.replace(/[&"'<>]/g, (character) => `&#${character.charCodeAt(0)};`);
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

async function svgToPngBlob(svgMarkup: string, size: number): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable.");
    }

    context.drawImage(image, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to create PNG."));
        }
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to render QR preview."));
    image.src = sourceUrl;
  });
}
