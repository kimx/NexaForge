import Papa from "papaparse";
import { readFileAsText } from "../file/fileService";
import { PREVIEW_LIMIT } from "../../config/fileLimits";
import type { FileProcessResult } from "../../types/tool";

export interface CsvViewerResult {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface ParsedCsvResponse {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export async function previewCsv(file: File, previewRows = PREVIEW_LIMIT.csvRows): Promise<CsvViewerResult> {
  const text = await readFileAsText(file);
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    preview: previewRows,
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message || "Failed to parse CSV.");
  }

  const headers = result.meta.fields ? [...result.meta.fields] : [];
  const rows = (result.data ?? []).map((row) =>
    headers.map((header) => String((row as Record<string, string>)[header] ?? ""))
  );
  const firstPass = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
    delimiter: ",",
  });
  const totalRows = Math.max(0, (firstPass.data.length || 0) - 1);

  return {
    headers,
    rows,
    totalRows,
  };
}

export async function csvToJson(file: File): Promise<{ output: string; fileName: string; size: number }> {
  const text = await readFileAsText(file);
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message || "CSV parse failed.");
  }

  const json = JSON.stringify(result.data, null, 2);
  const blob = new Blob([json], {
    type: "application/json",
  });
  return {
    output: json,
    fileName: `${file.name.replace(/\.[^/.]+$/, "")}.json`,
    size: blob.size,
  };
}

export async function jsonToCsv(file: File, includeHeader = true): Promise<FileProcessResult> {
  const text = await readFileAsText(file);
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array.");
  }
  const array = parsed as Array<Record<string, unknown>>;
  if (array.length === 0) {
    const csv = "";
    const blob = new Blob([csv], { type: "text/csv" });
    return {
      blob,
      fileName: `${file.name.replace(/\.[^/.]+$/, "")}.csv`,
      mimeType: "text/csv",
      size: blob.size,
    };
  }

  const columns = Array.from(
    array.reduce<Set<string>>((acc, row) => {
      Object.keys(row ?? {}).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  const dataRows = array.map((row) =>
    columns.map((column) => String((row as Record<string, unknown>)[column] ?? ""))
  );
  const csv = includeHeader
    ? Papa.unparse({
        fields: columns,
        data: dataRows,
      })
    : Papa.unparse(dataRows);
  const blob = new Blob([csv], { type: "text/csv" });
  return {
    blob,
    fileName: `${file.name.replace(/\.[^/.]+$/, "")}.csv`,
    mimeType: "text/csv",
    size: blob.size,
  };
}
