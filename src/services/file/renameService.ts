import { createZip } from "./zipService";
import type { FileProcessResult } from "../../types/tool";

export interface RenameOptions {
  baseName: string; find: string; replace: string; prefix: string; suffix: string;
  sequence: boolean; start: number; padding: number;
}
export interface RenameRow { originalName: string; newName: string; error: "invalid-name" | "collision" | null }
export const RENAME_MAX_FILES = 200;
export const RENAME_MAX_BYTES = 200 * 1024 * 1024;

function validName(name: string): boolean {
  return Boolean(name.trim()) && !/[<>:"/\\|?*\x00-\x1f]/.test(name) && name !== "." && name !== ".." && name !== "__proto__" && !/[. ]$/.test(name) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) && new TextEncoder().encode(name).length <= 240;
}

export function buildRenamePreview(files: File[], options: RenameOptions): RenameRow[] {
  if (files.length > RENAME_MAX_FILES || files.reduce((sum, file) => sum + file.size, 0) > RENAME_MAX_BYTES) throw new Error("batch-limit");
  if (options.sequence && (!Number.isSafeInteger(options.start) || options.start < 0 || !Number.isInteger(options.padding) || options.padding < 1 || options.padding > 8 || options.start + files.length > Number.MAX_SAFE_INTEGER)) throw new Error("invalid-counter");
  const rows = files.map((file, index): RenameRow => {
    const dot = file.name.lastIndexOf(".");
    const extension = dot > 0 ? file.name.slice(dot) : "";
    const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
    let base = options.baseName || stem;
    if (options.find) base = base.split(options.find).join(options.replace);
    const sequence = options.sequence ? `-${String(options.start + index).padStart(options.padding, "0")}` : "";
    const newName = `${options.prefix}${base}${options.suffix}${sequence}${extension}`;
    return { originalName: file.name, newName, error: validName(newName) ? null : "invalid-name" };
  });
  const counts = new Map<string, number>();
  rows.forEach(row => { const key = row.newName.normalize("NFC").toLowerCase(); counts.set(key, (counts.get(key) ?? 0) + 1); });
  rows.forEach(row => { if (!row.error && (counts.get(row.newName.normalize("NFC").toLowerCase()) ?? 0) > 1) row.error = "collision"; });
  return rows;
}

export async function createRenamedArchive(files: File[], options: RenameOptions): Promise<FileProcessResult> {
  const rows = buildRenamePreview(files, options);
  if (!rows.length || rows.some(row => row.error)) throw new Error("invalid-preview");
  return createZip(files.map((file, index) => ({ blob: file, fileName: rows[index].newName, mimeType: file.type || "application/octet-stream", size: file.size })), "renamed-files.zip");
}
