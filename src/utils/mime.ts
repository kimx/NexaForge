const EXTENSION_MAP: Array<{ mime: string; exts: string[] }> = [
  { mime: "image/jpeg", exts: [".jpg", ".jpeg"] },
  { mime: "image/png", exts: [".png"] },
  { mime: "image/webp", exts: [".webp"] },
  { mime: "application/pdf", exts: [".pdf"] },
  { mime: "text/csv", exts: [".csv"] },
];

export type FileCategory = "image" | "pdf" | "csv" | "other";

export function detectCategory(file: File): FileCategory {
  const normalized = file.type.toLowerCase();
  if (normalized.startsWith("image/")) {
    return "image";
  }
  if (normalized === "application/pdf") {
    return "pdf";
  }
  if (normalized === "text/csv" || file.name.toLowerCase().endsWith(".csv")) {
    return "csv";
  }
  return "other";
}

export function toKnownMime(fileType: string): FileCategory {
  const type = fileType.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type === "text/csv") return "csv";
  return "other";
}

export function getDefaultExtension(fileType: string): string {
  const matched = EXTENSION_MAP.find((entry) => entry.mime === fileType);
  return matched?.exts[0] ?? "";
}
