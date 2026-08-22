import { useMemo, useState } from "react";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useLanguage } from "../../context/LanguageContext";

type EntityMode = "named" | "hex" | "decimal";

function encodeEntity(input: string, mode: EntityMode): string {
  const basicSafe = input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  if (mode === "named") {
    return basicSafe;
  }

  const mapped = Array.from(basicSafe).map((char) => {
    const cp = char.codePointAt(0) ?? 0;
    return cp > 126 ? (mode === "hex" ? `&#x${cp.toString(16).toUpperCase()};` : `&#${cp};`) : char;
  });

  return mapped.join("");
}

function encodeNewlines(text: string, encode: boolean): string {
  if (!encode) {
    return text;
  }

  return text.replaceAll("\r\n", "\n").replaceAll("\n", "&#10;").replaceAll("\t", "&#9;");
}

function decodeEntity(input: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = input;
  return el.value;
}

export function HtmlEncoderPage(): JSX.Element {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<EntityMode>("named");
  const [resultText, setResultText] = useState("");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [encodeNewline, setEncodeNewline] = useState(false);

  const tool = FILE_TOOLS.find((item) => item.id === "html-encoder");
  const title = t("tool.html-encoder.title");
  const description = t("tool.html-encoder.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/text/html-encoder",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("html-encoder");
  const howItWorks = useMemo(
    () => [
      t("tool.html-encoder.how.0"),
      t("tool.html-encoder.how.1"),
      t("tool.html-encoder.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.html-encoder.faq.0.question"),
        a: t("tool.html-encoder.faq.0.answer"),
      },
      {
        q: t("tool.html-encoder.faq.1.question"),
        a: t("tool.html-encoder.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleEncode = () => {
    if (!inputText) {
      setProcessing("error");
      setError(t("error.selectText"));
      return;
    }

    setError(null);
    setCopyError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "html-encoder" });

    try {
      const encoded = encodeNewlines(encodeEntity(inputText, mode), encodeNewline);
      setResultText(encoded);
      setProcessing("success");
      trackEvent("process_success", { tool: "html-encoder" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "html-encoder" });
      console.error(err);
    }
  };

  const handleDecode = () => {
    if (!inputText) {
      setProcessing("error");
      setError(t("error.selectText"));
      return;
    }

    setError(null);
    setCopyError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "html-encoder" });

    try {
      const decoded = decodeEntity(inputText);
      setResultText(decoded);
      setProcessing("success");
      trackEvent("process_success", { tool: "html-encoder" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "html-encoder" });
      console.error(err);
    }
  };

  const handleClear = () => {
    setInputText("");
    setResultText("");
    setError(null);
    setCopyError(null);
    setProcessing("idle");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopyError(null);
    } catch {
      setCopyError(t("error.copyFailed"));
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
              {t("label.textOrUrl")}
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                rows={11}
              />
            </label>
          </div>
        ),
        options: (
          <div className="tool-form">
            <label>
              {t("tool.html-encoder.label.encodeMode")}
              <select value={mode} onChange={(event) => setMode(event.target.value as EntityMode)}>
                <option value="named">{t("tool.html-encoder.option.named")}</option>
                <option value="hex">{t("tool.html-encoder.option.hex")}</option>
                <option value="decimal">{t("tool.html-encoder.option.decimal")}</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={encodeNewline}
                onChange={(event) => setEncodeNewline(event.target.checked)}
              />
              {t("tool.html-encoder.label.encodeNewlines")}
            </label>
            <div className="tool-actions">
              <button
                type="button"
                className="btn primary"
                onClick={handleEncode}
                disabled={processing === "processing"}
                aria-busy={processing === "processing"}
              >
                {processing === "processing" ? t("button.processing") : t("tool.html-encoder.button.encode")}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={handleDecode}
                disabled={processing === "processing"}
                aria-busy={processing === "processing"}
              >
                {processing === "processing" ? t("button.processing") : t("tool.html-encoder.button.decode")}
              </button>
              <button type="button" className="btn secondary" onClick={handleClear}>
                {t("tool.html-encoder.button.clear")}
              </button>
            </div>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {copyError && <p role="alert" className="error">{copyError}</p>}
            <pre>{resultText || t("tool.html-encoder.label.noOutput")}</pre>
            <div className="tool-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={handleCopy}
                disabled={!resultText || processing === "processing"}
              >
                {t("tool.html-encoder.button.copy")}
              </button>
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
