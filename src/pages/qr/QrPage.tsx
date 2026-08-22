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
import { useLanguage } from "../../context/LanguageContext";

export function QrPage(): JSX.Element {
  const { t } = useLanguage();
  const [text, setText] = useState("https://example.com");
  const [size, setSize] = useState(256);
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "qr-code");
  const title = t("tool.qr-code.title");
  const description = t("tool.qr-code.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/qr-code",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("qr-code");
  const previewUrl = useBlobUrl(result?.blob);
  const howItWorks = useMemo(
    () => [
      t("tool.qr-code.how.0"),
      t("tool.qr-code.how.1"),
      t("tool.qr-code.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.qr-code.faq.0.question"),
        a: t("tool.qr-code.faq.0.answer"),
      },
      {
        q: t("tool.qr-code.faq.1.question"),
        a: t("tool.qr-code.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError(t("error.selectText"));
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
      setError(t("error.processingFailed"));
      trackEvent("process_failed", { tool: "qr-code" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.qr-code.title")]}
        children={{
        workspace: (
          <>
            <p>{t("tool.qr-code.label.noDropzone")}</p>
            <label>
              {t("label.textOrUrl")}
              <textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} />
            </label>
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              {t("label.size")}
              <input
                type="range"
                min={128}
                max={1024}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
              />
              {t("tool.qr-code.label.sizePixel", { size })}
            </label>
            <label>
              {t("tool.qr-code.label.errorCorrection")}
              <select
                value={errorCorrectionLevel}
                onChange={(event) =>
                  setErrorCorrectionLevel(event.target.value as "L" | "M" | "Q" | "H")
                }
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
              {processing === "processing" ? t("button.generating") : t("tool.qr-code.label.generateButton")}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {result ? (
              <img src={previewUrl} alt={t("tool.qr-code.label.preview")} />
            ) : (
              <p>{t("tool.qr-code.label.noPreview")}</p>
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
