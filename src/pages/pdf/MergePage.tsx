import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { mergePdf } from "../../services/pdf/pdfService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";

export function PdfMergePage(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-merge");
  const toolMeta: ToolMeta = {
    title: "PDF Merge - NexaForge",
    description: "Merge multiple PDFs entirely in your browser.",
    canonical: "/pdf/merge",
    h1: "PDF Merge",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("pdf-merge");
  const howItWorks = useMemo(
    () => [
      "Drag and drop multiple PDF files.",
      "Drag order is the output order.",
      "Click Process to merge all pages.",
      "Download merged.pdf.",
    ],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "Can I merge files over 100MB?",
        a: "This tool limits PDF processing at 100MB per file for stability.",
      },
      {
        q: "Are files uploaded to server?",
        a: "No upload. All files stay local.",
      },
    ],
    []
  );

  const moveFile = (index: number, direction: -1 | 1): void => {
    setFiles((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }
      const temp = next[targetIndex];
      next[targetIndex] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleProcess = async () => {
    if (!files.length) {
      setError("Please select at least one PDF.");
      return;
    }
    const invalid = files.find((file) => {
      const size = validateFileSize(file);
      const mime = validateMime(file, "application/pdf");
      return Boolean(size || mime);
    });
    if (invalid) {
      setError("Unsupported file or too large.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-merge" });
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-merge" });
    try {
      const output = await mergePdf(files);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-merge" });
    } catch (err) {
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-merge" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "PDF Merge"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop PDF files here"
              accept="application/pdf"
              multiple
              onFiles={setFiles}
            />
            <ol className="reorder-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`}>
                  <span>
                    {index + 1}. {file.name}
                  </span>
                  <div className="button-row">
                    <button type="button" onClick={() => moveFile(index, -1)} disabled={index === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFile(index, 1)}
                      disabled={index === files.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                </li>
              ))}
            </ol>
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
            {processing === "error" && error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {result && <p>Output size: {(result.size / 1024).toFixed(2)} KB</p>}
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => trackEvent("download", { tool: "pdf-merge" })}
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

