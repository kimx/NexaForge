import type { FileProcessResult } from "../../types/tool";

type ZipInput = Record<string, Uint8Array>;
type ZipCallback = (error: Error | null, data: Uint8Array) => void;

interface ZipDependencies {
  zip: (data: ZipInput, options: { level: number }, callback: ZipCallback) => void;
}

function sanitizeArchiveName(name: string): string {
  const leaf = name.replace(/\\/g, "/").split("/").pop() || "file";
  return leaf.replace(/[<>:"|?*\x00-\x1f]/g, "-").replace(/^\.+/, "") || "file";
}

function uniqueArchiveName(name: string, used: Set<string>): string {
  const sanitized = sanitizeArchiveName(name);
  if (!used.has(sanitized)) {
    used.add(sanitized);
    return sanitized;
  }
  const dot = sanitized.lastIndexOf(".");
  const base = dot > 0 ? sanitized.slice(0, dot) : sanitized;
  const extension = dot > 0 ? sanitized.slice(dot) : "";
  let suffix = 2;
  let candidate = `${base}-${suffix}${extension}`;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}${extension}`;
  }
  used.add(candidate);
  return candidate;
}

export async function createZip(
  results: FileProcessResult[],
  fileName: string,
  dependencies?: ZipDependencies
): Promise<FileProcessResult> {
  if (results.length === 0) {
    throw new Error("At least one successful result is required.");
  }
  const zipDependency = dependencies ?? (await import("fflate"));
  const used = new Set<string>();
  const input: ZipInput = {};
  for (const result of results) {
    input[uniqueArchiveName(result.fileName, used)] = new Uint8Array(await result.blob.arrayBuffer());
  }
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    zipDependency.zip(input, { level: 6 }, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
  const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
  return { blob, fileName, mimeType: "application/zip", size: blob.size };
}
