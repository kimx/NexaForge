import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { base64ToText, fileToBase64, textToBase64 } from "../../services/text/textService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";

export function Base64Page(): JSX.Element {
  const [mode, setMode] = useState<"textToBase64" | "base64ToText" | "fileToBase64">("textToBase64");
  const [text, setText] = useState("");
  const [resultText, setResultText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [resultFile, setResultFile] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "base64");
  const toolMeta: ToolMeta = {
    title: "Base64 - NexaForge",
    description: "Encode and decode Base64 locally for text and files.",
    canonical: "/text/base64",
    h1: "Base64",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("base64");
  const howItWorks = useMemo(
    () => [
      "Choose conversion mode.",
      "Run processing and copy or download result text.",
    ],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "File size support?",
        a: "Files are subject to local limit constraints.",
      },
      {
        q: "Does this upload files?",
        a: "No. File read and encode remains local.",
      },
    ],
    []
  );

  const handleProcess = async () => {
    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "base64" });
    try {
      if (mode === "textToBase64") {
        const encoded = textToBase64(text);
        setResultText(encoded);
        const blob = new Blob([encoded], { type: "text/plain" });
        setResultFile({
          blob,
          fileName: "text-base64.txt",
          mimeType: "text/plain",
          size: blob.size,
        });
      }

      if (mode === "base64ToText") {
        const decoded = base64ToText(text);
        setResultText(decoded);
        const blob = new Blob([decoded], { type: "text/plain" });
        setResultFile({
          blob,
          fileName: "base64-text.txt",
          mimeType: "text/plain",
          size: blob.size,
        });
      }

      if (mode === "fileToBase64") {
        const source = files[0];
        if (!source) {
          throw new Error("Please select one file.");
        }
        const sizeError = validateFileSize(source);
        const mimeError = validateMime(source, "*/*");
        if (sizeError || mimeError) {
          throw new Error(sizeError?.message ?? mimeError?.message ?? "Invalid file.");
        }
        const encoded = await fileToBase64(source);
        setResultText(encoded);
        const blob = new Blob([encoded], { type: "text/plain" });
        setResultFile({
          blob,
          fileName: `${source.name}.base64.txt`,
          mimeType: "text/plain",
          size: blob.size,
        });
      }

      setProcessing("success");
      trackEvent("process_success", { tool: "base64" });
    } catch (err) {
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "base64" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "Base64"]}
      children={{
        workspace: (
          <>
            {mode === "fileToBase64" ? (
              <FileDropzone
                label="Drop file here"
                multiple={false}
                onFiles={setFiles}
                accept="*/*"
              />
            ) : (
              <p>Enter text in the field below.</p>
            )}
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              Mode
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "textToBase64" | "base64ToText" | "fileToBase64")
                }
              >
                <option value="textToBase64">Text → Base64</option>
                <option value="base64ToText">Base64 → Text</option>
                <option value="fileToBase64">File → Base64</option>
              </select>
            </label>
            {mode !== "fileToBase64" && (
              <textarea
                rows={6}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            )}
            <div className="tool-actions">
              <button
                type="button"
                className="btn primary"
                disabled={processing === "processing"}
                onClick={handleProcess}
                aria-busy={processing === "processing"}
              >
                {processing === "processing" ? "Processing..." : "Process"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resultText);
                    setCopyError(null);
                  } catch {
                    setCopyError("Unable to copy result to clipboard.");
                  }
                }}
                disabled={!resultText || processing === "processing"}
              >
                Copy
              </button>
            </div>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {copyError && <p role="alert" className="error">{copyError}</p>}
            <pre>{resultText || "No output."}</pre>
            <div className="tool-actions">
              <DownloadButton
                result={resultFile}
                disabled={processing === "processing"}
                onDownloaded={() => trackEvent("download", { tool: "base64" })}
              />
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

