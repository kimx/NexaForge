import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { DownloadButton } from "../../components/DownloadButton";
import { generateQrImage } from "../../services/qr/qrService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useBlobUrl } from "../../hooks/useBlobUrl";

export function QrPage(): JSX.Element {
  const [text, setText] = useState("https://example.com");
  const [size, setSize] = useState(256);
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "qr-code");
  const toolMeta: ToolMeta = {
    title: "QR Code - NexaForge",
    description: "Generate PNG QR codes in-browser for text or URL.",
    canonical: "/qr-code",
    h1: "QR Code",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("qr-code");
  const previewUrl = useBlobUrl(result?.blob);
  const howItWorks = useMemo(
    () => ["Input text or URL.", "Choose size and error-correction level.", "Generate and download."],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "Is internet needed?",
        a: "No. Generation uses a local library in browser.",
      },
      {
        q: "Can we generate SVG?",
        a: "First phase supports PNG download only.",
      },
    ],
    []
  );

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Please enter text.");
      return;
    }
    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "qr-code" });
    try {
      const output = await generateQrImage(text, { size, errorCorrectionLevel });
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "qr-code" });
    } catch (err) {
      setProcessing("error");
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      trackEvent("process_failed", { tool: "qr-code" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "QR Code"]}
      children={{
        workspace: (
          <>
            <p>Dropzone is not required for text input tools.</p>
            <label>
              Text / URL
              <textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} />
            </label>
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              Size
              <input
                type="range"
                min={128}
                max={1024}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
              />
              {size}px
            </label>
            <label>
              Error correction level
              <select
                value={errorCorrectionLevel}
                onChange={(event) => setErrorCorrectionLevel(event.target.value as "L" | "M" | "Q" | "H")}
              >
                <option value="L">L</option>
                <option value="M">M</option>
                <option value="Q">Q</option>
                <option value="H">H</option>
              </select>
            </label>
            <button
              type="button"
              className="btn primary"
              onClick={handleGenerate}
              disabled={processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? "Generating..." : "Generate"}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {result ? (
              <img src={previewUrl} alt="QR Code preview" />
            ) : (
              <p>Generate to preview.</p>
            )}
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => trackEvent("download", { tool: "qr-code" })}
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

