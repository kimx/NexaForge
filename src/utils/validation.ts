import { FILE_LIMITS } from "../config/fileLimits";
import { detectCategory } from "./mime";
import type { FileRejectionReason, ValidationError } from "../types/tool";

export function validateFileSize(file: File): ValidationError | null {
  const category = detectCategory(file);
  const maxSize = FILE_LIMITS[category] ?? FILE_LIMITS.other;
  if (file.size > maxSize) {
    return {
      message: "This file is too large to process safely in your browser.",
      reason: "size exceeds",
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
    const hasExtensionRule = acceptParts.some((rule) => rule.startsWith("."));
    const hasMimeRule = acceptParts.some((rule) => rule.includes("/"));
    const reason: FileRejectionReason = hasExtensionRule ? "unsupported extension" : hasMimeRule ? "invalid mime" : "invalid mime";
    return {
      message: `Unsupported file type: ${type || "unknown"}`,
      reason,
    };
  }
  return null;
}
