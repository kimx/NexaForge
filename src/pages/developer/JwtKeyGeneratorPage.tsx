import { useState } from "react";
import { ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { generateJwtSecretKey } from "../../services/jwt/jwtService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useLanguage } from "../../context/LanguageContext";

type JwtSecretByteLength = 16 | 24 | 32 | 48 | 64;

export function JwtKeyGeneratorPage(): JSX.Element {
  const { t } = useLanguage();
  const [secretLength, setSecretLength] = useState<JwtSecretByteLength>(32);
  const [secretKey, setSecretKey] = useState("");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "jwt-key");
  const title = t("tool.jwt-key.title");
  const description = t("tool.jwt-key.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/developer/jwt-key",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("jwt-key");

  const howItWorks = [
    t("tool.jwt-key.how.0"),
    t("tool.jwt-key.how.1"),
    t("tool.jwt-key.how.2"),
  ];

  const faq = [
    {
      q: t("tool.jwt-key.faq.0.question"),
      a: t("tool.jwt-key.faq.0.answer"),
    },
    {
      q: t("tool.jwt-key.faq.1.question"),
      a: t("tool.jwt-key.faq.1.answer"),
    },
  ];

  const handleGenerateKey = () => {
    setError(null);
    setCopyError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "jwt-key" });
    try {
      const generated = generateJwtSecretKey(secretLength);
      setSecretKey(generated);
      setProcessing("success");
      trackEvent("process_success", { tool: "jwt-key" });
    } catch (err) {
      setProcessing("error");
      setError(err instanceof Error ? err.message : t("tool.jwt-key.error.unableGenerate"));
      trackEvent("process_failed", { tool: "jwt-key" });
      console.error(err);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secretKey);
      setCopyError(null);
    } catch {
      setCopyError(t("tool.jwt-key.error.unableCopy"));
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", title]}
      children={{
        workspace: (
          <div className="tool-form">
            <label>
              {t("tool.jwt-key.label.generatedKey")}
              <textarea rows={2} value={secretKey} readOnly />
            </label>
            <p>{t("tool.jwt-key.label.keyNotice")}</p>
          </div>
        ),
        options: (
          <div className="tool-form">
            <label>
              {t("tool.jwt-key.label.secretLength")}
              <select
                value={secretLength}
                onChange={(event) => setSecretLength(Number(event.target.value) as JwtSecretByteLength)}
              >
                <option value={16}>16</option>
                <option value={24}>24</option>
                <option value={32}>32</option>
                <option value={48}>48</option>
                <option value={64}>64</option>
              </select>
            </label>
            <div className="tool-actions">
              <button
                type="button"
                className="btn primary"
                onClick={handleGenerateKey}
                disabled={processing === "processing"}
                aria-busy={processing === "processing"}
              >
                {processing === "processing" ? t("button.generating") : t("tool.jwt-key.label.generateButton")}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={handleCopy}
                disabled={!secretKey || processing === "processing"}
              >
                {t("tool.jwt-key.label.copyButton")}
              </button>
            </div>
            {error && <p role="alert" className="error">{error}</p>}
            {copyError && <p role="alert" className="error">{copyError}</p>}
          </div>
        ),
        result: <p>{t("tool.jwt-key.label.noOutput")}</p>,
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
