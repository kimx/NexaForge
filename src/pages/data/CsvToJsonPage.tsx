import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { csvToJson } from "../../services/csv/csvService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";

export function CsvToJsonPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "csv-to-json");
  const title = t("tool.csv-to-json.title");
  const description = t("tool.csv-to-json.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/data/csv-to-json",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("csv-to-json");
  const howItWorks = useMemo(
    () => [
      t("tool.csv-to-json.how.0"),
      t("tool.csv-to-json.how.1"),
      t("tool.csv-to-json.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.csv-to-json.faq.0.question"),
        a: t("tool.csv-to-json.faq.0.answer"),
      },
      {
        q: t("tool.csv-to-json.faq.1.question"),
        a: t("tool.csv-to-json.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleFiles = (nextFiles: File[]) => {
    setFiles(nextFiles);
    setResult(null);
    setPreview("");
    setError(null);
    setProcessing(nextFiles.length ? "ready" : "idle");
  };

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
      trackEvent("process_failed", { tool: "csv-to-json" });
      return;
    }
    setProcessing("processing");
    setError(null);
    trackEvent("process_start", { tool: "csv-to-json" });
    try {
      const data = await csvToJson(source);
      const outputFile = new Blob([data.output], { type: "application/json" });
      const output: FileProcessResult = {
        blob: outputFile,
        fileName: data.fileName,
        mimeType: "application/json",
        size: data.output.length,
      };
      setResult(output);
      setPreview(data.output.slice(0, 2000));
      setProcessing("success");
      trackEvent("process_success", { tool: "csv-to-json" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "csv-to-json" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.csv-to-json.title")]}
        children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropCsv")}
              accept="text/csv"
              multiple={false}
              onFiles={handleFiles}
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
            {preview ? (
              <pre>{preview}</pre>
            ) : (
              <p>{t("tool.csv-to-json.label.preview")}</p>
            )}
            {result ? (
              <DownloadButton
                result={result}
                disabled={processing === "processing"}
                onDownloaded={() => trackEvent("download", { tool: "csv-to-json" })}
              />
            ) : null}
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
