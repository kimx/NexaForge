import { useMemo, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { generateIdentifiers, SecureUuidUnavailableError, type UuidCase, type UuidFormat, type UuidKind } from "../../services/text/uuidService";
import type { FileProcessResult, ProcessingState, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";

export function UuidPage(): JSX.Element {
  const { t } = useLanguage();
  const [kind, setKind] = useState<UuidKind>("v4");
  const [letterCase, setLetterCase] = useState<UuidCase>("lower");
  const [format, setFormat] = useState<UuidFormat>("standard");
  const [count, setCount] = useState(1);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [resultText, setResultText] = useState("");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "uuid") ?? FILE_TOOLS[0];
  const title = t("tool.uuid.title");
  const description = t("tool.uuid.description");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description, canonical: "/text/uuid", h1: title };
  useSeo(meta);

  const clearOutput = (): void => {
    setResultText("");
    setResult(null);
    setError(null);
    setCopyError(null);
    setProcessing("idle");
  };

  const handleGenerate = (): void => {
    setProcessing("processing");
    setError(null);
    setCopyError(null);
    trackEvent("process_start", { tool: "uuid" });
    try {
      const normalized = Math.min(1000, Math.max(1, Math.floor(count)));
      const output = generateIdentifiers({ kind, count: normalized, case: letterCase, format }).join("\n");
      const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
      setResultText(output);
      setResult({ blob, fileName: `identifiers-${normalized}.txt`, mimeType: "text/plain", size: blob.size });
      setCount(normalized);
      setProcessing("success");
      trackEvent("process_success", { tool: "uuid" });
    } catch (caught) {
      setResultText("");
      setResult(null);
      setProcessing("error");
      setError(caught instanceof SecureUuidUnavailableError
        ? t("tool.uuid.v2.cryptoUnavailable")
        : t("tool.uuid.v2.failed"));
      trackEvent("process_failed", { tool: "uuid" });
    }
  };

  const howItWorks = useMemo(() => [0, 1, 2].map((index) => t(`tool.uuid.how.${index}`)), [t]);
  const faq = useMemo(() => [0, 1].map((index) => ({
    q: t(`tool.uuid.faq.${index}.question`),
    a: t(`tool.uuid.faq.${index}.answer`),
  })), [t]);

  return (
    <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]}>
      {{
        workspace: (
          <div className="tool-form issue26-control-grid">
            <label>
              {t("tool.uuid.v2.kind")}
              <select value={kind} onChange={(event) => { setKind(event.target.value as UuidKind); clearOutput(); }}>
                {(["v4", "v7", "dotnet-guid"] as const).map((value) => (
                  <option key={value} value={value}>{t(`tool.uuid.v2.kind.${value}`)}</option>
                ))}
              </select>
            </label>
            <label>
              {t("label.count")}
              <input type="number" min={1} max={1000} step={1} value={count} onChange={(event) => { setCount(Number(event.target.value)); clearOutput(); }} />
            </label>
          </div>
        ),
        options: (
          <div className="tool-form">
            <div className="issue26-control-grid">
              <label>
                {t("tool.uuid.v2.case")}
                <select value={letterCase} onChange={(event) => { setLetterCase(event.target.value as UuidCase); clearOutput(); }}>
                  <option value="lower">{t("tool.uuid.v2.case.lower")}</option>
                  <option value="upper">{t("tool.uuid.v2.case.upper")}</option>
                </select>
              </label>
              <label>
                {t("tool.uuid.v2.format")}
                <select value={format} onChange={(event) => { setFormat(event.target.value as UuidFormat); clearOutput(); }}>
                  {(["standard", "braced", "compact"] as const).map((value) => (
                    <option key={value} value={value}>{t(`tool.uuid.v2.format.${value}`)}</option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" className="btn primary" onClick={handleGenerate} disabled={processing === "processing"} aria-busy={processing === "processing"}>
              {t("tool.uuid.v2.generate")}
            </button>
          </div>
        ),
        result: (
          <>
            {error ? <p role="alert" className="error">{error}</p> : null}
            {copyError ? <p role="alert" className="error">{copyError}</p> : null}
            <pre className="issue26-identifier-output">{resultText || t("tool.uuid.label.noOutput")}</pre>
            <div className="tool-actions">
              <button type="button" className="btn secondary" disabled={!resultText || processing === "processing"} onClick={async () => {
                try { await navigator.clipboard.writeText(resultText); setCopyError(null); }
                catch { setCopyError(t("error.copyFailed")); }
              }}>{t("button.copy")}</button>
              <DownloadButton result={result} disabled={processing === "processing"} onDownloaded={() => trackEvent("download", { tool: "uuid" })} />
            </div>
          </>
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools("uuid"),
      }}
    </ToolPageTemplate>
  );
}
