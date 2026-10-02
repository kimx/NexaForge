import { useId, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage, useLocalizedToolMeta } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  convertLocalTime,
  getBrowserTimeZone,
  LocalTimeError,
  type LocalTimeConversion,
} from "../../services/developer/localTimeService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

const FALLBACK_TOOL: ToolDefinition = {
  id: "local-time-converter",
  title: "Local Time Converter",
  description: "Convert ISO 8601 and UTC times to your browser's local time.",
  path: "/developer/local-time",
  category: "Developer",
};

export function LocalTimeConverterPage(): JSX.Element {
  const { t } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const tool = FILE_TOOLS.find((item) => item.id === "local-time-converter") ?? FALLBACK_TOOL;
  const title = localToolMeta(tool.id, "title");
  const description = localToolMeta(tool.id, "description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: tool.path,
    h1: title,
  };
  useSeo(meta);

  const [input, setInput] = useState("");
  const [result, setResult] = useState<LocalTimeConversion | null>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputErrorId = useId();
  const localTimeZone = getBrowserTimeZone();

  const processInput = (value: string): void => {
    if (!value.trim()) {
      setResult(null);
      setError(null);
      setCopied(false);
      setState("idle");
      return;
    }

    try {
      setResult(convertLocalTime(value));
      setError(null);
      setCopied(false);
      setState("success");
    } catch (conversionError) {
      setResult(null);
      setCopied(false);
      setError(
        conversionError instanceof LocalTimeError && conversionError.code === "empty"
          ? t("localTime.error.empty")
          : t("localTime.error.invalid")
      );
      setState("error");
    }
  };

  const handleInputChange = (value: string): void => {
    setInput(value);
    processInput(value);
  };

  const handleCopy = async (): Promise<void> => {
    if (!result) {
      return;
    }
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(result.localTime);
      setCopied(true);
      setError(null);
    } catch {
      setCopied(false);
      setError(t("error.copyFailed"));
    }
  };

  const handleClear = (): void => {
    setInput("");
    setResult(null);
    setError(null);
    setCopied(false);
    setState("idle");
  };

  const inputError = error ? inputErrorId : undefined;

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state, error: null }}
      layout="split"
      children={{
        workspace: (
          <div className="tool-form local-time__workspace">
            <label htmlFor="local-time-input">
              {t("localTime.input")}
              <textarea
                id="local-time-input"
                rows={3}
                value={input}
                placeholder={t("localTime.placeholder")}
                aria-invalid={Boolean(error)}
                aria-describedby={inputError}
                onChange={(event) => handleInputChange(event.target.value)}
              />
            </label>
            {error ? <p id={inputErrorId} className="error" role="alert">{error}</p> : null}
            <p className="local-time__hint">{t("localTime.browserOnly")}</p>
          </div>
        ),
        options: (
          <div className="tool-form local-time__options">
            <p className="local-time__timezone">
              <strong>{t("localTime.timezone")}</strong>
              <span>{localTimeZone}</span>
            </p>
            <p className="local-time__hint">{t("localTime.timezoneHelp")}</p>
            <div className="local-time__actions">
              <button type="button" className="btn secondary" onClick={() => processInput(input)} disabled={!input.trim()}>
                {t("localTime.convert")}
              </button>
              <button type="button" className="btn secondary" onClick={handleClear}>
                {t("localTime.clear")}
              </button>
            </div>
          </div>
        ),
        result: result ? (
          <div className="local-time__result">
            <dl className="local-time__result-list">
              <div className="local-time__result-row">
                <dt>{t("localTime.original")}</dt>
                <dd><code>{result.input}</code></dd>
              </div>
              <div className="local-time__result-row">
                <dt>{t("localTime.result")}</dt>
                <dd><strong>{result.localTime}</strong></dd>
              </div>
              <div className="local-time__result-row">
                <dt>{t("localTime.timezone")}</dt>
                <dd>{result.timeZone}</dd>
              </div>
            </dl>
            <button type="button" className="btn secondary" onClick={handleCopy}>
              {t("button.copy")}
            </button>
            {copied ? <p className="local-time__status" role="status">{t("status.copied")}</p> : null}
          </div>
        ) : (
          <p className="local-time__empty">{t("localTime.empty")}</p>
        ),
        howItWorks: [
          t("localTime.how.0"),
          t("localTime.how.1"),
          t("localTime.how.2"),
        ],
        faq: [
          { q: t("localTime.faq.0.question"), a: t("localTime.faq.0.answer") },
          { q: t("localTime.faq.1.question"), a: t("localTime.faq.1.answer") },
        ],
        relatedTools: getRelatedTools(tool.id),
      }}
    />
  );
}
