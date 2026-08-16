import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { splitPdf } from "../../services/pdf/pdfService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";

export function PdfSplitPage(): JSX.Element {
  const [file, setFile] = useState<File[]>([]);
  const [ranges, setRanges] = useState("1");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-split");
  const toolMeta: ToolMeta = {
    title: "PDF Split - NexaForge",
    description: "Split PDFs by range input directly in your browser.",
    canonical: "/pdf/split",
    h1: "PDF Split",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("pdf-split");
  const howItWorks = useMemo(
    () => [
      "Upload a PDF file.",
      "Type ranges such as 1, 1-3, 1-3,5,8-10.",
      "Process and download the resulting split file.",
    ],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "Is page index 0 supported?",
        a: "No. Pages are 1-based for user input.",
      },
      {
        q: "Can I split to multiple files?",
        a: "This stage outputs one file for selected ranges.",
      },
    ],
    []
  );

  const handleProcess = async () => {
    if (!file[0]) {
      setError("Please select one PDF.");
      return;
    }
    const source = file[0];
    const sizeError = validateFileSize(source);
    const mimeError = validateMime(source, "application/pdf");
    if (sizeError || mimeError) {
      setError(sizeError?.message ?? mimeError?.message ?? "Invalid file.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-split" });
      return;
    }
    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-split" });
    try {
      const output = await splitPdf(source, ranges);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-split" });
    } catch (err) {
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-split" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "PDF Split"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop PDF here"
              accept="application/pdf"
              onFiles={setFile}
              multiple={false}
            />
            <FileInfo files={file} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              Page Ranges
              <input
                value={ranges}
                onChange={(event) => setRanges(event.target.value)}
              />
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
            {result && <p>Output size: {(result.size / 1024).toFixed(2)} KB</p>}
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => trackEvent("download", { tool: "pdf-split" })}
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

