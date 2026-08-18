import { readFileAsArrayBuffer } from "../file/fileService";

import type { FileProcessResult } from "../../types/tool";

export interface ExifEntry {
  label: string;
  value: string;
}

const JPEG_SOI = 0xffd8;
const JPEG_EOI = 0xffd9;
const JPEG_SOS = 0xffda;
const APP1_MARKER = 0xffe1;
const EXIF_HEADER = "Exif\0\0";

const TAG_LABELS: Record<number, string> = {
  0x010f: "Make",
  0x0110: "Model",
  0x0112: "Orientation",
  0x0131: "Software",
  0x0132: "DateTime",
  0x829a: "ExposureTime",
  0x829d: "FNumber",
  0x8769: "ExifOffset",
  0x8825: "GPSOffset",
  0x8827: "ISO",
  0x9003: "DateTimeOriginal",
  0x9004: "DateTimeDigitized",
  0x920a: "FocalLength",
  0xa002: "PixelXDimension",
  0xa003: "PixelYDimension",
  0x0001: "GPSLatitudeRef",
  0x0002: "GPSLatitude",
  0x0003: "GPSLongitudeRef",
  0x0004: "GPSLongitude",
  0x0006: "GPSAltitude",
};

const TYPE_SIZES: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  7: 1,
  9: 4,
  10: 8,
};

function assertJpeg(view: DataView): void {
  if (view.byteLength < 4 || view.getUint16(0) !== JPEG_SOI) {
    throw new Error("Unsupported image format");
  }
}

function markerAt(view: DataView, offset: number): number {
  return view.getUint16(offset);
}

function getSegmentLength(view: DataView, offset: number): number {
  return view.getUint16(offset + 2, false);
}

function findExifSegment(view: DataView): { start: number; length: number; tiffStart: number } | null {
  assertJpeg(view);

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = markerAt(view, offset);
    if (marker === JPEG_EOI || marker === JPEG_SOS) {
      break;
    }

    const length = getSegmentLength(view, offset);
    if (length < 2 || offset + 2 + length > view.byteLength) {
      break;
    }

    if (marker === APP1_MARKER) {
      const headerStart = offset + 4;
      const headerText = readText(view, headerStart, Math.min(EXIF_HEADER.length, view.byteLength - headerStart));
      if (headerText === EXIF_HEADER) {
        return { start: offset, length, tiffStart: headerStart + EXIF_HEADER.length };
      }
    }

    offset += 2 + length;
  }

  return null;
}

function readUint16(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint16(offset, littleEndian);
}

function readUint32(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint32(offset, littleEndian);
}

function readInt32(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getInt32(offset, littleEndian);
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function formatGpsCoordinate(values: number[], ref: string | undefined): string {
  if (values.length !== 3) {
    return values.map(formatNumber).join(", ");
  }

  const decimal = values[0] + values[1] / 60 + values[2] / 3600;
  const signed = ref === "S" || ref === "W" ? -decimal : decimal;
  return `${formatNumber(signed)}°`;
}

function readText(view: DataView, offset: number, count: number): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, count);
  return new TextDecoder().decode(bytes);
}

function getAscii(view: DataView, offset: number, count: number): string {
  return readText(view, offset, count).replace(/\0+$/, "").trim();
}

function getNumericArray(
  view: DataView,
  offset: number,
  count: number,
  type: number,
  littleEndian: boolean
): number[] {
  return Array.from({ length: count }, (_, index) => {
    const base = offset + index * TYPE_SIZES[type];
    switch (type) {
      case 1:
      case 7:
        return view.getUint8(base);
      case 3:
        return readUint16(view, base, littleEndian);
      case 4:
        return readUint32(view, base, littleEndian);
      case 5: {
        const numerator = readUint32(view, base, littleEndian);
        const denominator = readUint32(view, base + 4, littleEndian);
        return denominator === 0 ? 0 : numerator / denominator;
      }
      case 9:
        return readInt32(view, base, littleEndian);
      case 10: {
        const numerator = readInt32(view, base, littleEndian);
        const denominator = readInt32(view, base + 4, littleEndian);
        return denominator === 0 ? 0 : numerator / denominator;
      }
      default:
        return 0;
    }
  });
}

function getExifValue(
  view: DataView,
  tiffStart: number,
  entryOffset: number,
  littleEndian: boolean
): string | number[] | null {
  const type = readUint16(view, entryOffset + 2, littleEndian);
  const count = readUint32(view, entryOffset + 4, littleEndian);
  const typeSize = TYPE_SIZES[type];
  if (!typeSize || count === 0) {
    return null;
  }

  const dataByteLength = typeSize * count;
  const inlineOffset = entryOffset + 8;
  const valueOffset = dataByteLength <= 4 ? inlineOffset : tiffStart + readUint32(view, inlineOffset, littleEndian);
  if (valueOffset + dataByteLength > view.byteLength) {
    return null;
  }

  if (type === 2) {
    return getAscii(view, valueOffset, count);
  }

  return getNumericArray(view, valueOffset, count, type, littleEndian);
}

function readIfdEntries(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean
): Map<number, string | number[]> {
  const entries = new Map<number, string | number[]>();
  if (tiffStart + ifdOffset + 2 > view.byteLength) {
    return entries;
  }

  const entryCount = readUint16(view, tiffStart + ifdOffset, littleEndian);
  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = tiffStart + ifdOffset + 2 + index * 12;
    if (entryOffset + 12 > view.byteLength) {
      break;
    }
    const tag = readUint16(view, entryOffset, littleEndian);
    const value = getExifValue(view, tiffStart, entryOffset, littleEndian);
    if (value !== null && value !== "") {
      entries.set(tag, value);
    }
  }

  return entries;
}

export async function readExifEntries(file: File): Promise<ExifEntry[]> {
  const buffer = await readFileAsArrayBuffer(file);
  const view = new DataView(buffer);
  const segment = findExifSegment(view);
  if (!segment) {
    return [];
  }

  const byteOrder = getAscii(view, segment.tiffStart, 2);
  const littleEndian = byteOrder === "II";
  if (!littleEndian && byteOrder !== "MM") {
    throw new Error("Invalid EXIF byte order");
  }

  const magic = readUint16(view, segment.tiffStart + 2, littleEndian);
  if (magic !== 42) {
    throw new Error("Invalid EXIF header");
  }

  const firstIfdOffset = readUint32(view, segment.tiffStart + 4, littleEndian);
  const primary = readIfdEntries(view, segment.tiffStart, firstIfdOffset, littleEndian);
  const exifOffset = primary.get(0x8769);
  const gpsOffset = primary.get(0x8825);
  const exif = Array.isArray(exifOffset)
    ? new Map<number, string | number[]>()
    : typeof exifOffset === "string"
      ? new Map<number, string | number[]>()
      : readIfdEntries(view, segment.tiffStart, Number(exifOffset ?? 0), littleEndian);
  const gps = Array.isArray(gpsOffset)
    ? new Map<number, string | number[]>()
    : typeof gpsOffset === "string"
      ? new Map<number, string | number[]>()
      : readIfdEntries(view, segment.tiffStart, Number(gpsOffset ?? 0), littleEndian);

  const combined = new Map<number, string | number[]>([...primary, ...exif, ...gps]);
  const gpsLatitude = combined.get(0x0002);
  const gpsLongitude = combined.get(0x0004);
  const gpsLatitudeRef = combined.get(0x0001);
  const gpsLongitudeRef = combined.get(0x0003);

  return [...combined.entries()]
    .filter(([tag]) => TAG_LABELS[tag] && tag !== 0x8769 && tag !== 0x8825)
    .map(([tag, rawValue]) => {
      if (tag === 0x0002 && Array.isArray(rawValue)) {
        return { label: TAG_LABELS[tag], value: formatGpsCoordinate(rawValue, typeof gpsLatitudeRef === "string" ? gpsLatitudeRef : undefined) };
      }
      if (tag === 0x0004 && Array.isArray(rawValue)) {
        return { label: TAG_LABELS[tag], value: formatGpsCoordinate(rawValue, typeof gpsLongitudeRef === "string" ? gpsLongitudeRef : undefined) };
      }
      if (Array.isArray(rawValue)) {
        return { label: TAG_LABELS[tag], value: rawValue.map(formatNumber).join(", ") };
      }
      return { label: TAG_LABELS[tag], value: rawValue };
    });
}

export async function removeExifData(file: File): Promise<{ result: FileProcessResult; removedBytes: number }> {
  const buffer = await readFileAsArrayBuffer(file);
  const view = new DataView(buffer);
  assertJpeg(view);

  const bytes = new Uint8Array(buffer);
  const chunks: BlobPart[] = [bytes.slice(0, 2)];
  let removedBytes = 0;
  let offset = 2;

  while (offset + 4 <= view.byteLength) {
    const marker = markerAt(view, offset);
    if (marker === JPEG_EOI) {
      chunks.push(bytes.slice(offset));
      break;
    }
    if (marker === JPEG_SOS) {
      chunks.push(bytes.slice(offset));
      break;
    }

    const length = getSegmentLength(view, offset);
    if (length < 2 || offset + 2 + length > view.byteLength) {
      throw new Error("Invalid JPEG segment");
    }

    const nextOffset = offset + 2 + length;
    const isExifSegment = marker === APP1_MARKER && readText(view, offset + 4, EXIF_HEADER.length) === EXIF_HEADER;
    if (isExifSegment) {
      removedBytes += nextOffset - offset;
    } else {
      chunks.push(bytes.slice(offset, nextOffset));
    }
    offset = nextOffset;
  }

  const blob = new Blob(chunks, { type: file.type || "image/jpeg" });
  const fileName = file.name.replace(/(\.jpe?g)$/i, "") + "-no-exif.jpg";
  return {
    result: {
      blob,
      fileName,
      mimeType: file.type || "image/jpeg",
      size: blob.size,
    },
    removedBytes,
  };
}
