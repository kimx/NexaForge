import { useId, useMemo, useState } from "react";
import { CodeOutputPanel } from "../../components/CodeOutputPanel";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  CurlConversionError,
  convertCurl,
  type CurlConversionWarning,
  type CurlTarget,
} from "../../services/curl/curlConverterService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";

const FALLBACK_TOOL: ToolDefinition = {
  id: "curl-to-code",
  title: "cURL to Code",
  description: "Convert cURL locally.",
  path: "/developer/curl-to-code",
  category: "Developer",
};

export function CurlToCodePage(): JSX.Element {
  const { t } = useLanguage();
  const [source, setSource] = useState("");
  const [target, setTarget] = useState<CurlTarget>("csharp");
  const [state, setState] = useState<ProcessingState>("idle");
  const [output, setOutput] = useState("");
  const [fileExtension, setFileExtension] = useState(".cs");
  const [warnings, setWarnings] = useState<CurlConversionWarning[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const inputErrorId = useId();
  const tool = FILE_TOOLS.find((item) => item.id === "curl-to-code") ?? FALLBACK_TOOL;
  const title = t("tool.curl-to-code.title");
  const description = t("tool.curl-to-code.description");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description, canonical: tool.path, h1: title };
  useSeo(meta);

  const howItWorks = useMemo(() => [0, 1, 2].map((index) => t(`tool.curl-to-code.how.${index}`)), [t]);
  const faq = useMemo(() => [0, 1].map((index) => ({
    q: t(`tool.curl-to-code.faq.${index}.question`),
    a: t(`tool.curl-to-code.faq.${index}.answer`),
  })), [t]);

  const handleConvert = async (): Promise<void> => {
    if (!source.trim()) {
      setInputError(t("tool.curl-to-code.empty"));
      setState("error");
      return;
    }
    setInputError(null);
    setWorkflowError(null);
    setWarnings([]);
    setState("processing");
    trackEvent("process_start", { tool: tool.id });
    try {
      const result = await convertCurl(source, target);
      setOutput(result.code);
      setFileExtension(result.fileExtension);
      setWarnings(result.warnings);
      setState("success");
      trackEvent("process_success", { tool: tool.id });
    } catch (error) {
      setOutput("");
      setWarnings([]);
      setState("error");
      if (error instanceof CurlConversionError && error.code === "load-failed") {
        setWorkflowError(t("tool.curl-to-code.loadFailed"));
      } else {
        setInputError(t("tool.curl-to-code.invalid"));
      }
      trackEvent("process_failed", { tool: tool.id });
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state, error: workflowError, onRetry: handleConvert }}
    >
      {{
        workspace: (
          <div className="tool-form">
            <label htmlFor="curl-to-code-input">{t("tool.curl-to-code.input")}</label>
            <textarea
              id="curl-to-code-input"
              className="issue26-editor"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setInputError(null);
                setWorkflowError(null);
                setOutput("");
                setWarnings([]);
                setState(event.target.value.trim() ? "ready" : "idle");
              }}
              aria-invalid={Boolean(inputError)}
              aria-describedby={inputError ? inputErrorId : undefined}
              spellCheck={false}
            />
            {inputError ? <p className="error" id={inputErrorId}>{inputError}</p> : null}
          </div>
        ),
        options: (
          <div className="tool-form">
            <label>
              {t("tool.curl-to-code.target")}
              <select value={target} onChange={(event) => setTarget(event.target.value as CurlTarget)}>
                {(["csharp", "javascript", "python", "powershell"] as const).map((value) => (
                  <option key={value} value={value}>{t(`tool.curl-to-code.target.${value}`)}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn primary"
              onClick={handleConvert}
              disabled={state === "processing"}
              aria-busy={state === "processing"}
            >
              {t("tool.curl-to-code.convert")}
            </button>
          </div>
        ),
        result: (
          <div>
            {warnings.length ? (
              <div>
                <h3>{t("tool.curl-to-code.warnings")}</h3>
                <ul className="issue26-warning-list">
                  {warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}
                </ul>
              </div>
            ) : null}
            <CodeOutputPanel
              label={t("tool.curl-to-code.output")}
              value={output}
              fileName={`request${fileExtension}`}
              language={target}
              emptyText={t("tool.curl-to-code.noOutput")}
            />
          </div>
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools(tool.id),
      }}
    </ToolPageTemplate>
  );
}
