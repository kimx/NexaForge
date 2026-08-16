import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { jsonToCsv } from "../../services/csv/csvService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";

export function JsonToCsvPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "json-to-csv");
  const title = t("tool.json-to-csv.title");
  const description = t("tool.json-to-csv.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/data/json-to-csv",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("json-to-csv");
  const howItWorks = useMemo(
    () => [
      t("tool.json-to-csv.how.0"),
      t("tool.json-to-csv.how.1"),
      t("tool.json-to-csv.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.json-to-csv.faq.0.question"),
        a: t("tool.json-to-csv.faq.0.answer"),
      },
      {
        q: t("tool.json-to-csv.faq.1.question"),
        a: t("tool.json-to-csv.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleProcess = async () => {
    const source = files[0];
    if (!source) {
      setError(t("error.selectOneFile", { type: t("label.fileType.json") }));
      return;
    }
    const mimeError = validateMime(source, "application/json,text/plain");
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? t("error.invalidFile"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "json-to-csv" });
      return;
    }
    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "json-to-csv" });
    try {
      const output = await jsonToCsv(source, includeHeader);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "json-to-csv" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "json-to-csv" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.json-to-csv.title")]}
        children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropJson")}
              accept="application/json,text/plain"
              onFiles={setFiles}
              multiple={false}
            />
            <FileInfo files={files} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={includeHeader}
                onChange={(event) => setIncludeHeader(event.target.checked)}
              />
              {t("label.includeHeader")}
            </label>
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => trackEvent("download", { tool: "json-to-csv" })}
            />
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
