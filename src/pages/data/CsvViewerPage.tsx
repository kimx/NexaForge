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
import { useLanguage } from "../../context/LanguageContext";

type CsvRow = string[];

export function CsvViewerPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "csv-viewer");
  const title = t("tool.csv-viewer.title");
  const description = t("tool.csv-viewer.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/data/csv-viewer",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("csv-viewer");
  const howItWorks = useMemo(
    () => [
      t("tool.csv-viewer.how.0"),
      t("tool.csv-viewer.how.1"),
      t("tool.csv-viewer.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.csv-viewer.faq.0.question"),
        a: t("tool.csv-viewer.faq.0.answer"),
      },
      {
        q: t("tool.csv-viewer.faq.1.question"),
        a: t("tool.csv-viewer.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleProcess = async () => {
    const source = files[0];
    if (!source) {
      setError(t("error.selectOneFile", { type: t("label.fileType.csv") }));
      return;
    }
    const mimeError = validateMime(source, "text/csv");
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? t("error.invalidFile"));
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
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "csv-viewer" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.csv-viewer.title")]}
        children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropCsv")}
              accept="text/csv"
              onFiles={setFiles}
              multiple={false}
              compact={files.length > 0}
            />
            <FileInfo files={files} mode="single" compact={files.length > 0} />
          </>
        ),
        options: (
          <div className="tool-form">
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={!files.length || processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            <p>{t("label.rows")}: {totalRows}</p>
            <p>{t("label.columns")}: {headers.length}</p>
            <p>{t("label.fileSize")}: {sourceLength(files)}</p>
            {rows.length > 0 ? (
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
            ) : (
              <p>{t("label.noResult")}</p>
            )}
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
