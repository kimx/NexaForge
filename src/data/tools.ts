import type { ToolDefinition } from "../types/tool";

export const FILE_TOOLS: ToolDefinition[] = [
  {
    id: "image-resize",
    title: "Image Resize",
    description: "Resize JPG, PNG, or WebP directly in the browser.",
    path: "/image/resize",
    category: "Image",
  },
  {
    id: "image-compress",
    title: "Image Compress",
    description: "Compress with quality control and compare file sizes.",
    path: "/image/compress",
    category: "Image",
  },
  {
    id: "image-convert",
    title: "Image Converter",
    description: "Convert JPG, PNG, and WebP formats instantly.",
    path: "/image/convert",
    category: "Image",
  },
  {
    id: "pdf-merge",
    title: "PDF Merge",
    description: "Merge many PDF files and download a single file.",
    path: "/pdf/merge",
    category: "PDF",
  },
  {
    id: "pdf-split",
    title: "PDF Split",
    description: "Split pages by range input with secure browser-side validation.",
    path: "/pdf/split",
    category: "PDF",
  },
  {
    id: "pdf-rotate",
    title: "PDF Rotate",
    description: "Rotate selected pages with preview and quality-safe output.",
    path: "/pdf/rotate",
    category: "PDF",
  },
  {
    id: "json-formatter",
    title: "JSON Formatter",
    description: "Format, minify, and validate JSON in seconds.",
    path: "/data/json-formatter",
    category: "Data",
  },
  {
    id: "csv-viewer",
    title: "CSV Viewer",
    description: "Render large CSV safely with preview and metadata.",
    path: "/data/csv-viewer",
    category: "Data",
  },
  {
    id: "csv-to-json",
    title: "CSV → JSON",
    description: "Convert CSV files to JSON quickly and download.",
    path: "/data/csv-to-json",
    category: "Data",
  },
  {
    id: "json-to-csv",
    title: "JSON → CSV",
    description: "Transform object arrays into CSV output.",
    path: "/data/json-to-csv",
    category: "Data",
  },
  {
    id: "base64",
    title: "Base64",
    description: "Text, Base64, and file conversion fully local.",
    path: "/text/base64",
    category: "Text",
  },
  {
    id: "hash",
    title: "Hash Generator",
    description: "Generate SHA digest values in browser securely.",
    path: "/text/hash",
    category: "Text",
  },
  {
    id: "uuid",
    title: "UUID Generator",
    description: "Generate one UUID or batch up to 1000.",
    path: "/text/uuid",
    category: "Text",
  },
  {
    id: "qr-code",
    title: "QR Code",
    description: "Create and download PNG QR codes from text or URL.",
    path: "/qr-code",
    category: "Image",
  },
  {
    id: "jwt-key",
    title: "JWT Key Generator",
    description: "Generate local Base64URL-safe random keys.",
    path: "/developer/jwt-key",
    category: "Developer",
  },
  {
    id: "jwt-decoder",
    title: "JWT Decoder",
    description: "Decode JWT header, payload, and signature.",
    path: "/developer/jwt-decoder",
    category: "Developer",
  },
];

export const TOOLS_BY_CATEGORY = FILE_TOOLS.reduce(
  (acc, tool) => {
    const key = tool.category;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(tool);
    return acc;
  },
  {} as Record<ToolDefinition["category"], ToolDefinition[]>
);
