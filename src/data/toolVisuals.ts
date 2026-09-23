import type { ToolDefinition } from "../types/tool";

export type ToolCategory = ToolDefinition["category"];
export type ToolVisualTone = "blue" | "sky" | "mint" | "red" | "violet" | "amber";
export type ToolSidebarVisualIcon = "data" | "developer" | "image" | "pdf" | "qr" | "text";
export interface ToolVisual {
  readonly label: string;
  readonly tone: ToolVisualTone;
  readonly sidebarIcon: ToolSidebarVisualIcon;
}

// Shared by every category navigation entry point.
export const TOOL_CATEGORY_ORDER = [
  "Image", "PDF", "Data", "Developer", "Text", "QR & Barcode",
] as const satisfies readonly ToolCategory[];

export const CATEGORY_VISUALS: Readonly<Record<ToolCategory, ToolVisual>> = {
  Image: { label: "IMG", tone: "blue", sidebarIcon: "image" },
  PDF: { label: "PDF", tone: "red", sidebarIcon: "pdf" },
  Data: { label: "DATA", tone: "mint", sidebarIcon: "data" },
  Developer: { label: "DEV", tone: "violet", sidebarIcon: "developer" },
  Text: { label: "TXT", tone: "sky", sidebarIcon: "text" },
  "QR & Barcode": { label: "QR", tone: "blue", sidebarIcon: "qr" },
};

// Coverage is enforced against FILE_TOOLS in toolVisuals.test.ts.
export const TOOL_VISUALS: Readonly<Partial<Record<string, ToolVisual>>> = {
  "image-to-pdf": { label: "I→P", tone: "blue", sidebarIcon: "image" },
  "image-watermark": { label: "WM", tone: "blue", sidebarIcon: "image" },
  "image-resize": { label: "RES", tone: "blue", sidebarIcon: "image" },
  "image-crop": { label: "CROP", tone: "blue", sidebarIcon: "image" },
  "image-compress": { label: "↘", tone: "blue", sidebarIcon: "image" },
  "image-convert": { label: "IMG", tone: "blue", sidebarIcon: "image" },
  "image-exif-viewer": { label: "EXIF", tone: "blue", sidebarIcon: "image" },
  "image-remove-exif": { label: "META", tone: "blue", sidebarIcon: "image" },
  "heic-converter": { label: "HEIC", tone: "blue", sidebarIcon: "image" },
  "image-base64": { label: "64", tone: "blue", sidebarIcon: "image" },
  "svg-optimizer": { label: "SVG", tone: "blue", sidebarIcon: "image" },
  "favicon-generator": { label: "FAV", tone: "blue", sidebarIcon: "image" },
  "social-resizer": { label: "SOC", tone: "blue", sidebarIcon: "image" },
  "pdf-to-image": { label: "P→I", tone: "red", sidebarIcon: "pdf" },
  "pdf-merge": { label: "MERGE", tone: "red", sidebarIcon: "pdf" },
  "pdf-split": { label: "✂", tone: "red", sidebarIcon: "pdf" },
  "pdf-rotate": { label: "ROT", tone: "red", sidebarIcon: "pdf" },
  "pdf-reorder-pages": { label: "ORDER", tone: "red", sidebarIcon: "pdf" },
  "pdf-delete-pages": { label: "DEL", tone: "red", sidebarIcon: "pdf" },
  "pdf-extract-pages": { label: "EXT", tone: "red", sidebarIcon: "pdf" },
  "pdf-add-page-numbers": { label: "#", tone: "red", sidebarIcon: "pdf" },
  "pdf-watermark": { label: "WM", tone: "red", sidebarIcon: "pdf" },
  "pdf-metadata": { label: "META", tone: "red", sidebarIcon: "pdf" },
  "json-formatter": { label: "{}", tone: "mint", sidebarIcon: "data" },
  "jsonpath-tester": { label: "JPATH", tone: "mint", sidebarIcon: "data" },
  "csv-viewer": { label: "CSV", tone: "mint", sidebarIcon: "data" },
  "csv-to-json": { label: "C→J", tone: "mint", sidebarIcon: "data" },
  "json-to-csv": { label: "J→C", tone: "mint", sidebarIcon: "data" },
  "json-xml": { label: "J↔X", tone: "mint", sidebarIcon: "data" },
  "xml-formatter": { label: "XML", tone: "mint", sidebarIcon: "data" },
  "json-yaml": { label: "J↔Y", tone: "mint", sidebarIcon: "data" },
  "json-diff": { label: "DIFF", tone: "mint", sidebarIcon: "data" },
  "base64": { label: "64", tone: "violet", sidebarIcon: "developer" },
  "jwt-key": { label: "KEY", tone: "violet", sidebarIcon: "developer" },
  "jwt-decoder": { label: "JWT", tone: "violet", sidebarIcon: "developer" },
  "url-encoder": { label: "URL", tone: "violet", sidebarIcon: "developer" },
  "unix-timestamp": { label: "TIME", tone: "violet", sidebarIcon: "developer" },
  "local-time-converter": { label: "LOCAL", tone: "violet", sidebarIcon: "developer" },
  "regex-tester": { label: "REGEX", tone: "violet", sidebarIcon: "developer" },
  "sql-formatter": { label: "SQL", tone: "violet", sidebarIcon: "developer" },
  "cron-builder": { label: "CRON", tone: "violet", sidebarIcon: "developer" },
  "url-parser": { label: "PARSE", tone: "violet", sidebarIcon: "developer" },
  "curl-to-code": { label: "CURL", tone: "violet", sidebarIcon: "developer" },
  "secret-generator": { label: "SEC", tone: "violet", sidebarIcon: "developer" },
  "json-to-csharp": { label: "C#", tone: "violet", sidebarIcon: "developer" },
  "json-to-typescript": { label: "TS", tone: "violet", sidebarIcon: "developer" },
  "list-cleanup": { label: "LIST", tone: "sky", sidebarIcon: "text" },
  "hash": { label: "HASH", tone: "sky", sidebarIcon: "text" },
  "uuid": { label: "UUID", tone: "sky", sidebarIcon: "text" },
  "emoji-picker": { label: "😀", tone: "sky", sidebarIcon: "text" },
  "word-counter": { label: "WORDS", tone: "sky", sidebarIcon: "text" },
  "case-converter": { label: "Aa", tone: "sky", sidebarIcon: "text" },
  "remove-duplicate-lines": { label: "≡", tone: "sky", sidebarIcon: "text" },
  "sort-lines": { label: "AZ", tone: "sky", sidebarIcon: "text" },
  "text-cleaner": { label: "CLEAN", tone: "sky", sidebarIcon: "text" },
  "find-replace": { label: "F/R", tone: "sky", sidebarIcon: "text" },
  "text-diff": { label: "DIFF", tone: "sky", sidebarIcon: "text" },
  "html-encoder": { label: "HTML", tone: "sky", sidebarIcon: "text" },
  "markdown-previewer": { label: "MD", tone: "sky", sidebarIcon: "text" },
  "qr-code": { label: "QR", tone: "blue", sidebarIcon: "qr" },
  "qr-reader": { label: "SCAN", tone: "blue", sidebarIcon: "qr" },
  "barcode-generator": { label: "BAR", tone: "blue", sidebarIcon: "qr" },
  "barcode-reader": { label: "READ", tone: "blue", sidebarIcon: "qr" },
  "wifi-qr": { label: "WIFI", tone: "blue", sidebarIcon: "qr" },
  "vcard-qr": { label: "CARD", tone: "blue", sidebarIcon: "qr" },
};

export function getToolVisual(tool: ToolDefinition): ToolVisual {
  const visual = Object.hasOwn(TOOL_VISUALS, tool.id) ? TOOL_VISUALS[tool.id] : undefined;
  if (visual) return visual;
  if (import.meta.env.DEV) {
    console.warn(`[NexaForge] Missing visual metadata for tool: ${tool.id}`);
  }
  return CATEGORY_VISUALS[tool.category];
}
