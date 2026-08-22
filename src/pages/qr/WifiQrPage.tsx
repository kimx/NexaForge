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
import { buildWifiPayload, type WifiSecurity } from "../../services/qr/qrPayloads";
import type { FileProcessResult, ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";

const FALLBACK_TOOL: ToolDefinition = { id: "wifi-qr", title: "Wi-Fi QR Generator", description: "Generate Wi-Fi QR codes locally.", path: "/qr-code/wifi", category: "Image" };

export function WifiQrPage(): JSX.Element {
  const { t } = useLanguage();
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [security, setSecurity] = useState<WifiSecurity>("WPA");
  const [hidden, setHidden] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [payload, setPayload] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useBlobUrl(result?.blob);
  const tool = FILE_TOOLS.find((item) => item.id === "wifi-qr") ?? FALLBACK_TOOL;
  const title = t("tool.wifi-qr.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.wifi-qr.description"), canonical: "/qr-code/wifi", h1: title };
  useSeo(meta);

  const handleGenerate = async (): Promise<void> => {
    if (!ssid.trim()) {
      setError(t("tool.wifi-qr.error.ssid")); setProcessing("error"); return;
    }
    setError(null); setResult(null); setProcessing("processing");
    trackEvent("process_start", { tool: "wifi-qr" });
    try {
      const nextPayload = buildWifiPayload({ ssid, password, security, hidden });
      const next = await generateQrImage(nextPayload, { size: 384, errorCorrectionLevel: "M" });
      setPayload(nextPayload); setResult({ ...next, fileName: "wifi-qr.png" }); setProcessing("success");
      trackEvent("process_success", { tool: "wifi-qr" });
    } catch (cause) {
      console.error(cause); setError(t("tool.wifi-qr.error.generate")); setProcessing("error");
      trackEvent("process_failed", { tool: "wifi-qr" });
    }
  };

  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]}
    workflow={{ state: processing, error, onRetry: handleGenerate, onReprocess: handleGenerate }} children={{
      workspace: <div className="issue23-form">
        <label>{t("tool.wifi-qr.ssid")}<input value={ssid} onChange={(event) => setSsid(event.target.value)} /></label>
        <label>{t("tool.wifi-qr.password")}<input type="password" value={password} disabled={security === "nopass"} onChange={(event) => setPassword(event.target.value)} /></label>
      </div>,
      options: <div className="issue23-form">
        <label>{t("tool.wifi-qr.security")}<select value={security} onChange={(event) => setSecurity(event.target.value as WifiSecurity)}>
          <option value="WPA">WPA / WPA2</option><option value="WEP">WEP</option><option value="nopass">{t("tool.wifi-qr.open")}</option>
        </select></label>
        <label className="checkbox"><input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />{t("tool.wifi-qr.hidden")}</label>
        <button type="button" className="btn primary" onClick={handleGenerate} disabled={processing === "processing"}>
          {processing === "processing" ? t("tool.wifi-qr.generating") : t("tool.wifi-qr.generate")}
        </button>
      </div>,
      result: result ? <div className="issue23-form"><h3>{t("tool.wifi-qr.payload")}</h3><code className="issue23-code-output">{payload}</code>
        <img className="issue23-preview" src={previewUrl} alt={t("tool.wifi-qr.preview")} /><DownloadButton result={result} /></div> : <p>{t("label.noResult")}</p>,
      howItWorks: [0, 1, 2].map((index) => t(`tool.wifi-qr.how.${index}`)),
      faq: [0, 1].map((index) => ({ q: t(`tool.wifi-qr.faq.${index}.question`), a: t(`tool.wifi-qr.faq.${index}.answer`) })),
      relatedTools: getRelatedTools("wifi-qr"),
    }} />;
}

