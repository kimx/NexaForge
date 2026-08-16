import { useMemo, useState } from "react";
import { HashOptions, ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileInfo } from "../../components/FileInfo";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { hashText } from "../../services/text/textService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { readFileAsText } from "../../services/file/fileService";
import { validateFileSize, validateMime } from "../../utils/validation";

export function HashPage(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [algorithm, setAlgorithm] = useState<HashOptions["algorithm"]>("SHA-256");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "hash");
  const toolMeta: ToolMeta = {
    title: "Hash Generator - NexaForge",
    description: "Compute SHA digests in browser.",
    canonical: "/text/hash",
    h1: "Hash Generator",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("hash");
  const howItWorks = useMemo(
    () => [
      "Drop one text file.",
      "Choose hashing algorithm.",
      "Generate digest with browser crypto API.",
    ],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "Can I use MD5?",
        a: "No. MD5 is intentionally not supported.",
      },
      {
        q: "Does the data leave the browser?",
        a: "No.",
      },
    ],
    []
  );

  const handleProcess = async () => {
    const source = files[0];
    if (!source) {
      setError("Please select one file.");
      return;
    }
    const mimeError = validateMime(source, "*/*");
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? "Invalid file.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "hash" });
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "hash" });
    try {
      const text = await readFileAsText(source);
      const digest = await hashText(text, { algorithm });
      setResultText(digest);
      setProcessing("success");
      trackEvent("process_success", { tool: "hash" });
    } catch (err) {
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "hash" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "Hash Generator"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop file here"
              accept="*/*"
              multiple={false}
              onFiles={setFiles}
            />
            <FileInfo files={files} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              Algorithm
              <select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HashOptions["algorithm"])}>
                <option value="SHA-1">SHA-1</option>
                <option value="SHA-256">SHA-256</option>
                <option value="SHA-384">SHA-384</option>
                <option value="SHA-512">SHA-512</option>
              </select>
            </label>
            <div className="tool-actions">
              <button
                type="button"
                className="btn primary"
                onClick={handleProcess}
                disabled={processing === "processing"}
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
                  } catch {
                    setError("Unable to copy result to clipboard.");
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
            {resultText ? <pre>{resultText}</pre> : <p>No output.</p>}
            {resultText ? (
              <DownloadButton
                result={{
                  blob: new Blob([resultText], { type: "text/plain" }),
                  fileName: `${files[0]?.name ?? "hash"}.txt`,
                  mimeType: "text/plain",
                  size: resultText.length,
                }}
                disabled={processing === "processing"}
                onDownloaded={() => trackEvent("download", { tool: "hash" })}
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

