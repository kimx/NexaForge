import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { previewCsv } from "../../services/csv/csvService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";
import { PREVIEW_LIMIT } from "../../config/fileLimits";

type CsvRow = string[];

export function CsvViewerPage(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "csv-viewer");
  const toolMeta: ToolMeta = {
    title: "CSV Viewer - NexaForge",
    description: "Upload CSV and preview table data quickly in your browser.",
    canonical: "/data/csv-viewer",
    h1: "CSV Viewer",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("csv-viewer");
  const howItWorks = useMemo(
    () => [
      "Upload a CSV file.",
      "Preview up to 1000 rows for large files.",
      "See detected columns and total row count.",
    ],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "Does it render all rows?",
        a: "To protect memory, this page limits preview rows.",
      },
      {
        q: "Can I parse files with headers?",
        a: "Headers are auto-detected for the first row.",
      },
    ],
    []
  );

  const handleProcess = async () => {
    const source = files[0];
    if (!source) {
      setError("Please select one csv file.");
      return;
    }
    const mimeError = validateMime(source, "text/csv");
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? "Invalid file.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "csv-viewer" });
      return;
    }

    setProcessing("processing");
    setError(null);
    trackEvent("process_start", { tool: "csv-viewer" });
    try {
      const parsed = await previewCsv(source, PREVIEW_LIMIT.csvRows);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setTotalRows(parsed.totalRows);
      setProcessing("success");
      trackEvent("process_success", { tool: "csv-viewer" });
    } catch (err) {
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "csv-viewer" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "CSV Viewer"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop CSV here"
              accept="text/csv"
              onFiles={setFiles}
              multiple={false}
            />
            <FileInfo files={files} />
          </>
        ),
        options: (
          <div className="tool-form">
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? "Processing..." : "Process"}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            <p>Rows: {totalRows}</p>
            <p>Columns: {headers.length}</p>
            <p>File Size: {sourceLength(files)}</p>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={String(rowIndex)}>
                      {row.map((column, colIndex) => (
                        <td key={`${rowIndex}-${colIndex}`}>{column}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}

function sourceLength(files: File[]): string {
  if (files.length === 0) return "0 B";
  const size = files[0].size;
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${size} B`;
}

