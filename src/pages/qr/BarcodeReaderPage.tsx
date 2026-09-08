import { useState } from "react";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FILE_TOOLS } from "../../data/tools";
import { useLanguage } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import {
  formatBarcodeLabel,
  readBarcodesFromImage,
  type BarcodeReadResult,
} from "../../services/qr/barcodeReaderService";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";

const FALLBACK_TOOL: ToolDefinition = {
  id: "barcode-reader",
  title: "Barcode Reader",
  description: "Read barcodes locally.",
  path: "/qr-barcode/barcode-reader",
  category: "Image",
};

export function BarcodeReaderPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [results, setResults] = useState<BarcodeReadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const tool = FILE_TOOLS.find((item) => item.id === "barcode-reader") ?? FALLBACK_TOOL;
  const title = t("tool.barcode-reader.title");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description: t("tool.barcode-reader.description"),
    canonical: "/qr-barcode/barcode-reader",
    h1: title,
  };
  useSeo(meta);

  const reset = (): void => {
    setFiles([]);
    setResults([]);
    setError(null);
    setCopyStatus("");
    setProcessing("idle");
  };

  const handleRead = async (): Promise<void> => {
    if (!files[0]) {
      setError(t("tool.barcode-reader.error.file"));
      setProcessing("error");
      return;
    }

    setError(null);
    setResults([]);
    setCopyStatus("");
    setProcessing("processing");
    trackEvent("process_start", { tool: "barcode-reader" });
    try {
      const decoded = await readBarcodesFromImage(files[0]);
      setResults(decoded);
      setProcessing("success");
      trackEvent("process_success", { tool: "barcode-reader" });
    } catch (cause) {
      console.error(cause);
      setError(t("tool.barcode-reader.error.noCode"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "barcode-reader" });
    }
  };

  const handleCopy = async (value: string): Promise<void> => {
    await navigator.clipboard?.writeText(value);
    setCopyStatus(t("tool.barcode-reader.copied"));
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state: processing, error, onRetry: handleRead, onReprocess: reset }}
      children={{
        workspace: (
          <div className="issue23-form">
            <FileDropzone
              label={t("tool.barcode-reader.dropzone")}
              accept="image/png,image/jpeg,image/webp"
              multiple={false}
              onFiles={(next) => {
                setFiles(next);
                setResults([]);
                setError(null);
                setCopyStatus("");
                setProcessing("idle");
              }}
              compact={files.length > 0}
            />
            <FileInfo files={files} mode="single" onClear={reset} compact={files.length > 0} />
          </div>
        ),
        options: (
          <div className="issue23-form">
            <p>{t("tool.barcode-reader.supportedFormats")}</p>
            <button
              type="button"
              className="btn primary"
              onClick={handleRead}
              disabled={!files[0] || processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? t("tool.barcode-reader.reading") : t("tool.barcode-reader.read")}
            </button>
          </div>
        ),
        result: results.length > 0 ? (
          <div className="issue23-form">
            <ul className="batch-file-results">
              {results.map((result, index) => (
                <li className="batch-file-results__item" key={`${result.format}-${result.value}-${index}`}>
                  <div>
                    <strong>{t("tool.barcode-reader.format")}: </strong>
                    <span>{formatBarcodeLabel(result.format)}</span>
                    <br />
                    <strong>{t("tool.barcode-reader.value")}: </strong>
                    <code className="issue23-code-output">{result.value}</code>
                  </div>
                  <button type="button" className="btn secondary" onClick={() => void handleCopy(result.value)}>
                    {t("tool.barcode-reader.copy")}
                  </button>
                </li>
              ))}
            </ul>
            <span role="status" aria-live="polite">{copyStatus}</span>
            <button type="button" className="btn secondary" onClick={reset}>
              {t("tool.barcode-reader.scanAnother")}
            </button>
          </div>
        ) : (
          <p>{t("label.noResult")}</p>
        ),
        howItWorks: [0, 1, 2].map((index) => t(`tool.barcode-reader.how.${index}`)),
        faq: [0, 1, 2].map((index) => ({
          q: t(`tool.barcode-reader.faq.${index}.question`),
          a: t(`tool.barcode-reader.faq.${index}.answer`),
        })),
        relatedTools: getRelatedTools("barcode-reader"),
      }}
    />
  );
}
