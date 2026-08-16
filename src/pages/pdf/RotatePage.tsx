import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { rotatePdf } from "../../services/pdf/pdfService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";

export function PdfRotatePage(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [degrees, setDegrees] = useState<90 | 180 | 270>(90);
  const [pagesInput, setPagesInput] = useState("");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotateAll, setRotateAll] = useState(true);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-rotate");
  const toolMeta: ToolMeta = {
    title: "PDF Rotate - NexaForge",
    description: "Rotate PDF files with page-specific options in-browser.",
    canonical: "/pdf/rotate",
    h1: "PDF Rotate",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("pdf-rotate");
  const howItWorks = useMemo(
    () => [
      "Upload a PDF file.",
      "Choose 90, 180 or 270 degrees.",
      "Optionally set specific pages.",
      "Download the rotated PDF.",
    ],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "Can I rotate only one page?",
        a: "Yes. Uncheck All Pages and input a single page or range.",
      },
      {
        q: "What happens after processing?",
        a: "A new PDF is downloaded; original file is untouched.",
      },
    ],
    []
  );

  const handleProcess = async () => {
    if (!files[0]) {
      setError("Please select one PDF.");
      return;
    }
    const source = files[0];
    const sizeError = validateFileSize(source);
    const mimeError = validateMime(source, "application/pdf");
    if (sizeError || mimeError) {
      setError(sizeError?.message ?? mimeError?.message ?? "Invalid file.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-rotate" });
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-rotate" });
    try {
      const output = await rotatePdf(source, degrees, rotateAll ? undefined : pagesInput);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-rotate" });
    } catch (err) {
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-rotate" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "PDF Rotate"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop PDF here"
              accept="application/pdf"
              multiple={false}
              onFiles={setFiles}
            />
            <FileInfo files={files} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              Rotate Angle
              <select
                value={degrees}
                onChange={(event) => setDegrees(Number(event.target.value) as 90 | 180 | 270)}
              >
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={rotateAll}
                onChange={(event) => setRotateAll(event.target.checked)}
              />
              Rotate all pages
            </label>
            {!rotateAll && (
              <label>
                Target pages
                <input
                  value={pagesInput}
                  onChange={(event) => setPagesInput(event.target.value)}
                />
              </label>
            )}
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
              onDownloaded={() => trackEvent("download", { tool: "pdf-rotate" })}
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

