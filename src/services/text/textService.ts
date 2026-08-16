import { readFileAsArrayBuffer } from "../file/fileService";

import type { HashOptions } from "../../types/tool";

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

export function generateUuids(count: number): string[] {
  const limit = Math.min(1000, Math.max(1, Math.floor(count)));
  return Array.from({ length: limit }, () => crypto.randomUUID());
}
