import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { DownloadButton } from "../../components/DownloadButton";
import { generateUuids } from "../../services/text/textService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useLanguage } from "../../context/LanguageContext";
import type { FileProcessResult } from "../../types/tool";

export function UuidPage(): JSX.Element {
  const { t } = useLanguage();
  const [count, setCount] = useState(1);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [resultText, setResultText] = useState("");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "uuid");
  const title = t("tool.uuid.title");
  const description = t("tool.uuid.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/text/uuid",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("uuid");
  const howItWorks = useMemo(
    () => [
      t("tool.uuid.how.0"),
      t("tool.uuid.how.1"),
      t("tool.uuid.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.uuid.faq.0.question"),
        a: t("tool.uuid.faq.0.answer"),
      },
      {
        q: t("tool.uuid.faq.1.question"),
        a: t("tool.uuid.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleGenerate = async () => {
    setProcessing("processing");
    setError(null);
    setCopyError(null);
    trackEvent("process_start", { tool: "uuid" });
    try {
      const normalized = Math.min(1000, Math.max(1, count));
      const uuids = generateUuids(normalized);
      const output = uuids.join("\\n");
      setResultText(output);
      const blob = new Blob([output], { type: "text/plain" });
      setResult({
        blob,
        fileName: `uuids-${normalized}.txt`,
        mimeType: "text/plain",
        size: blob.size,
      });
      setCount(normalized);
      setProcessing("success");
      trackEvent("process_success", { tool: "uuid" });
    } catch (err) {
      setProcessing("error");
      setError(t("error.processingFailed"));
      trackEvent("process_failed", { tool: "uuid" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.uuid.title")]}
        children={{
        workspace: (
          <div className="tool-form">
            <label>
              {t("label.count")}
              <input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
              />
            </label>
          </div>
        ),
        options: (
          <div className="tool-form">
            <button
              type="button"
              className="btn primary"
              onClick={handleGenerate}
              disabled={processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? t("button.processing") : t("button.generate")}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {copyError && <p role="alert" className="error">{copyError}</p>}
            <pre>{resultText || t("tool.uuid.label.noOutput")}</pre>
            <div className="tool-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resultText);
                    setCopyError(null);
                  } catch {
                    setCopyError(t("error.copyFailed"));
                  }
                }}
                disabled={!resultText || processing === "processing"}
              >
                {t("button.copy")}
              </button>
              <DownloadButton
                result={result}
                disabled={processing === "processing"}
                onDownloaded={() => trackEvent("download", { tool: "uuid" })}
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
