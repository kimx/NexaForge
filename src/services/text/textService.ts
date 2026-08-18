import { readFileAsArrayBuffer } from "../file/fileService";

import type { HashOptions } from "../../types/tool";

export type CaseMode = "upper" | "lower" | "title" | "sentence";
export type SortDirection = "asc" | "desc";

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  nonEmptyLines: number;
}

export function textToBase64(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

export function base64ToText(base64Text: string): string {
  const binary = atob(base64Text);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await readFileAsArrayBuffer(file);
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

export async function hashText(text: string, options: HashOptions): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await crypto.subtle.digest(options.algorithm, data);
  const hashBuffer = new Uint8Array(digest);
  return Array.from(hashBuffer)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function countTextStats(text: string): TextStats {
  const lines = text === "" ? 0 : text.split(/\r?\n/);
  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, "").length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    lines: Array.isArray(lines) ? lines.length : 0,
    nonEmptyLines: Array.isArray(lines) ? lines.filter((line) => line.trim() !== "").length : 0,
  };
}

function preserveTrailingNewline(source: string, output: string): string {
  if (source !== "" && /\r?\n$/.test(source)) {
    return `${output}\n`;
  }
  return output;
}

export function convertTextCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text.toLowerCase().replace(/\b([\p{L}\p{N}][\p{L}\p{N}'’_-]*)/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
    case "sentence": {
      const lower = text.toLowerCase();
      let capitalizeNext = true;
      return Array.from(lower).map((char) => {
        if (capitalizeNext && /\p{L}/u.test(char)) {
          capitalizeNext = false;
          return char.toUpperCase();
        }
        if (/[.!?]\s*$/.test(char)) {
          capitalizeNext = true;
        }
        if (/[.!?]/.test(char)) {
          capitalizeNext = true;
        }
        return char;
      }).join("");
    }
    default:
      return text;
  }
}

export function removeDuplicateLines(text: string, options?: { ignoreCase?: boolean }): string {
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const unique = lines.filter((line) => {
    const key = options?.ignoreCase ? line.toLocaleLowerCase() : line;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return preserveTrailingNewline(text, unique.join("\n"));
}

export function sortTextLines(text: string, options?: { direction?: SortDirection; ignoreCase?: boolean }): string {
  const lines = text.split(/\r?\n/);
  const sorted = [...lines].sort((left, right) => left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: options?.ignoreCase === false ? "variant" : "accent",
  }));
  if (options?.direction === "desc") {
    sorted.reverse();
  }
  return preserveTrailingNewline(text, sorted.join("\n"));
}

export function generateUuids(count: number): string[] {
  const limit = Math.min(1000, Math.max(1, Math.floor(count)));
  return Array.from({ length: limit }, () => crypto.randomUUID());
}
