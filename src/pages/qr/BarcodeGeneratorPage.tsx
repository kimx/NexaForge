import { useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { DownloadButton } from "../../components/DownloadButton";
import { FILE_TOOLS } from "../../data/tools";
import { useLanguage } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { generateBarcode, type BarcodeFormat, type BarcodeRenderResult } from "../../services/qr/barcodeService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";

const FALLBACK_TOOL: ToolDefinition = {
  id: "barcode-generator", title: "Barcode Generator", description: "Generate barcodes locally.",
  path: "/barcode/generator", category: "Image",
};

export function BarcodeGeneratorPage(): JSX.Element {
  const { t } = useLanguage();
  const [format, setFormat] = useState<BarcodeFormat>("code128");
  const [value, setValue] = useState("ORDER-2026-001");
  const [scale, setScale] = useState(3);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<BarcodeRenderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useBlobUrl(result?.png.blob);
  const tool = FILE_TOOLS.find((item) => item.id === "barcode-generator") ?? FALLBACK_TOOL;
  const title = t("tool.barcode-generator.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.barcode-generator.description"), canonical: "/barcode/generator", h1: title };
  useSeo(meta);

  const handleGenerate = async (): Promise<void> => {
    if (!value.trim()) {
      setError(t("tool.barcode-generator.error.value"));
      setProcessing("error");
      return;
    }
    setError(null);
    setResult(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "barcode-generator" });
    try {
      const next = await generateBarcode(value, { format, scale });
      setResult(next);
      setProcessing("success");
      trackEvent("process_success", { tool: "barcode-generator" });
    } catch (cause) {
      console.error(cause);
      setError(t("tool.barcode-generator.error.invalid"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "barcode-generator" });
    }
  };

  return (
    <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]}
      workflow={{ state: processing, error, onRetry: handleGenerate, onReprocess: handleGenerate }}
      children={{
        workspace: (
          <div className="issue23-form">
            <label>{t("tool.barcode-generator.value")}<input value={value} onChange={(event) => setValue(event.target.value)} /></label>
          </div>
        ),
        options: (
          <div className="issue23-form">
            <label>{t("tool.barcode-generator.format")}
              <select value={format} onChange={(event) => setFormat(event.target.value as BarcodeFormat)}>
                <option value="code128">Code 128</option><option value="ean13">EAN-13</option>
              </select>
            </label>
            <label>{t("tool.barcode-generator.scale")}: {scale}
              <input type="range" min={1} max={5} value={scale} onChange={(event) => setScale(Number(event.target.value))} />
            </label>
            <button type="button" className="btn primary" onClick={handleGenerate} disabled={processing === "processing"} aria-busy={processing === "processing"}>
              {processing === "processing" ? t("tool.barcode-generator.generating") : t("tool.barcode-generator.generate")}
            </button>
          </div>
        ),
        result: result ? (
          <div className="issue23-form">
            <p>{t("tool.barcode-generator.normalized", { value: result.value })}</p>
            <code>{result.value}</code>
            <img className="issue23-preview" src={previewUrl} alt={t("tool.barcode-generator.preview")} />
            <div className="issue23-actions">
              <DownloadButton result={result.png} label={t("tool.barcode-generator.downloadPng")} />
              <DownloadButton result={result.svg} label={t("tool.barcode-generator.downloadSvg")} />
            </div>
          </div>
        ) : <p>{t("label.noResult")}</p>,
        howItWorks: [0, 1, 2].map((index) => t(`tool.barcode-generator.how.${index}`)),
        faq: [0, 1].map((index) => ({ q: t(`tool.barcode-generator.faq.${index}.question`), a: t(`tool.barcode-generator.faq.${index}.answer`) })),
        relatedTools: getRelatedTools("barcode-generator"),
      }} />
  );
}
