import { FILE_LIMITS } from "../config/fileLimits";
import { detectCategory } from "./mime";

export interface ValidationError {
  message: string;
}

export function validateFileSize(file: File): ValidationError | null {
  const category = detectCategory(file);
  const maxSize = FILE_LIMITS[category] ?? FILE_LIMITS.other;
  if (file.size > maxSize) {
    return {
      message:
        "This file is too large to process safely in your browser.",
    };
  }
  return null;
}

export function validateMime(file: File, accept: string): ValidationError | null {
  if (!accept) {
    return null;
  }

  const acceptParts = accept
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const type = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const result = acceptParts.some((rule) => {
    if (rule === "*/*") {
      return true;
    }
    if (rule.endsWith("/*")) {
      return type.startsWith(rule.replace("*", ""));
    }
    if (rule.startsWith(".")) {
      return fileName.endsWith(rule);
    }
    return type === rule;
  });

  if (!result) {
    return {
      message: `Unsupported file type: ${type || "unknown"}`,
    };
  }
  return null;
}
