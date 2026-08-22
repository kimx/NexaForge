import { useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { DownloadButton } from "../../components/DownloadButton";
import { FILE_TOOLS } from "../../data/tools";
import { useLanguage } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { generateQrImage } from "../../services/qr/qrService";
import { buildVCardPayload, type VCardQrInput } from "../../services/qr/qrPayloads";
import type { FileProcessResult, ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";

const FALLBACK_TOOL: ToolDefinition = { id: "vcard-qr", title: "vCard QR Generator", description: "Generate vCard QR codes locally.", path: "/qr-code/vcard", category: "Image" };
const EMPTY_CARD: VCardQrInput = { firstName: "", lastName: "", phone: "", email: "", organization: "", title: "", url: "", address: "" };

export function VCardQrPage(): JSX.Element {
  const { t } = useLanguage();
  const [card, setCard] = useState<VCardQrInput>(EMPTY_CARD);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [payload, setPayload] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useBlobUrl(result?.blob);
  const tool = FILE_TOOLS.find((item) => item.id === "vcard-qr") ?? FALLBACK_TOOL;
  const title = t("tool.vcard-qr.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.vcard-qr.description"), canonical: "/qr-code/vcard", h1: title };
  useSeo(meta);
  const setField = (key: keyof VCardQrInput, value: string): void => setCard((current) => ({ ...current, [key]: value }));

  const handleGenerate = async (): Promise<void> => {
    if (!card.firstName.trim() && !card.lastName.trim()) {
      setError(t("tool.vcard-qr.error.name")); setProcessing("error"); return;
    }
    setError(null); setResult(null); setProcessing("processing");
    trackEvent("process_start", { tool: "vcard-qr" });
    try {
      const nextPayload = buildVCardPayload(card);
      const next = await generateQrImage(nextPayload, { size: 384, errorCorrectionLevel: "Q" });
      setPayload(nextPayload); setResult({ ...next, fileName: "vcard-qr.png" }); setProcessing("success");
      trackEvent("process_success", { tool: "vcard-qr" });
    } catch (cause) {
      console.error(cause); setError(t("tool.vcard-qr.error.generate")); setProcessing("error");
      trackEvent("process_failed", { tool: "vcard-qr" });
    }
  };

  const fields: Array<[keyof VCardQrInput, string, string]> = [
    ["firstName", t("tool.vcard-qr.firstName"), "text"], ["lastName", t("tool.vcard-qr.lastName"), "text"],
    ["phone", t("tool.vcard-qr.phone"), "tel"], ["email", t("tool.vcard-qr.email"), "email"],
    ["organization", t("tool.vcard-qr.organization"), "text"], ["title", t("tool.vcard-qr.jobTitle"), "text"],
    ["url", t("tool.vcard-qr.url"), "url"], ["address", t("tool.vcard-qr.address"), "text"],
  ];

  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]}
    workflow={{ state: processing, error, onRetry: handleGenerate, onReprocess: handleGenerate }} children={{
      workspace: <div className="issue23-form issue23-form__grid">{fields.map(([key, label, type]) =>
        <label key={key}>{label}<input type={type} value={card[key] ?? ""} onChange={(event) => setField(key, event.target.value)} /></label>
      )}</div>,
      options: <div className="issue23-form"><p>{t("tool.vcard-qr.description")}</p>
        <button type="button" className="btn primary" onClick={handleGenerate} disabled={processing === "processing"}>
          {processing === "processing" ? t("tool.vcard-qr.generating") : t("tool.vcard-qr.generate")}
        </button></div>,
      result: result ? <div className="issue23-form"><h3>{t("tool.vcard-qr.payload")}</h3><code className="issue23-code-output">{payload}</code>
        <img className="issue23-preview" src={previewUrl} alt={t("tool.vcard-qr.preview")} /><DownloadButton result={result} /></div> : <p>{t("label.noResult")}</p>,
      howItWorks: [0, 1, 2].map((index) => t(`tool.vcard-qr.how.${index}`)),
      faq: [0, 1].map((index) => ({ q: t(`tool.vcard-qr.faq.${index}.question`), a: t(`tool.vcard-qr.faq.${index}.answer`) })),
      relatedTools: getRelatedTools("vcard-qr"),
    }} />;
}
