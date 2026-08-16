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

export function JsonToCsvPage(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "json-to-csv");
  const toolMeta: ToolMeta = {
    title: "JSON to CSV - NexaForge",
    description: "Convert array JSON objects into CSV format locally.",
    canonical: "/data/json-to-csv",
    h1: "JSON to CSV",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("json-to-csv");
  const howItWorks = useMemo(
    () => [
      "Upload array JSON.",
      "Toggle whether header row is required.",
      "Process for browser-side conversion.",
    ],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "Supported JSON structure",
        a: "Top-level array of plain objects.",
      },
      {
        q: "What if nested objects exist?",
        a: "Nested values are flattened poorly in this first version.",
      },
    ],
    []
  );

  const handleProcess = async () => {
    const source = files[0];
    if (!source) {
      setError("Please select one json file.");
      return;
    }
    const mimeError = validateMime(source, "application/json,text/plain");
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? "Invalid file.");
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
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "json-to-csv" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "JSON to CSV"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop JSON here"
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
              Include header
            </label>
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

