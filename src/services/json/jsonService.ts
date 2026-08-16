import type { FileProcessResult } from "../../types/tool";

export interface JsonParseError {
  line: number;
  column: number;
  message: string;
}

export function parseJson(text: string): unknown {
  return JSON.parse(text);
}

export function formatJson(text: string): string {
  const parsed = parseJson(text);
  return JSON.stringify(parsed, null, 2);
}

export function minifyJson(text: string): string {
  const parsed = parseJson(text);
  return JSON.stringify(parsed);
}

export async function transformJson(
  fileName: string,
  text: string,
  mode: "format" | "minify"
): Promise<FileProcessResult> {
  const output = mode === "format" ? formatJson(text) : minifyJson(text);
  const blob = new Blob([output], { type: "application/json" });
  return {
    blob,
    fileName: fileName.endsWith(".json")
      ? fileName
      : `${fileName}.json`,
    mimeType: "application/json",
    size: blob.size,
  };
}

export function extractJsonParseError(message: string): JsonParseError {
  const matched = /position (\d+)/i.exec(message);
  if (!matched) {
    return {
      line: 1,
      column: 1,
      message,
    };
  }

  const position = Number(matched[1]);
  const line = Math.max(1, Math.floor(position / 80) + 1);
  const column = (position % 80) + 1;
  return { line, column, message };
}
