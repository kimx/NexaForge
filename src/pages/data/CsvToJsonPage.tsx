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

export function CsvToJsonPage(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "csv-to-json");
  const toolMeta: ToolMeta = {
    title: "CSV to JSON - NexaForge",
    description: "Convert CSV to JSON output safely in browser.",
    canonical: "/data/csv-to-json",
    h1: "CSV to JSON",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("csv-to-json");
  const howItWorks = useMemo(
    () => [
      "Upload CSV file.",
      "Headers are used as property names.",
      "Process and inspect preview JSON before download.",
    ],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "Does header need to exist?",
        a: "Yes for stable parsing. If missing, PapaParse will infer columns.",
      },
      {
        q: "Are files uploaded?",
        a: "No, CSV is processed in-browser.",
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
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "csv-to-json" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "CSV to JSON"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop CSV here"
              accept="text/csv"
              multiple={false}
              onFiles={setFiles}
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
            <pre>{preview || "No preview."}</pre>
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => trackEvent("download", { tool: "csv-to-json" })}
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

