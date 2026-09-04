import { useId, useMemo, useState } from "react";
import { CodeEditorToolkit, type CodeEditorError } from "../../components/CodeEditorToolkit";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage, useLocalizedToolMeta } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { queryJsonPath, serializeJsonPathMatches, JsonPathParseError } from "../../services/jsonPath/jsonPathService";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";

const JSONPATH_SAMPLE = JSON.stringify({
  store: {
    book: [
      { category: "reference", author: "Nigel Rees", price: 8.95 },
      { category: "fiction", author: "Evelyn Waugh", price: 12.99 },
    ],
  },
}, null, 2);

const JSONPATH_QUERY_SAMPLE = "$.store.book[*].author";

function jsonEditorError(text: string, error: unknown, prefix: string): CodeEditorError {
  const message = error instanceof Error ? error.message : String(error);
  const positionMatch = /position (\d+)/i.exec(message);
  if (!positionMatch) return { message: `${prefix}: ${message}` };
  const position = Math.max(0, Math.min(Number(positionMatch[1]), text.length));
  const before = text.slice(0, position);
  return {
    message: `${prefix}: ${message}`,
    line: before.split("\n").length,
    column: position - before.lastIndexOf("\n"),
  };
}

export function JsonPathTesterPage(): JSX.Element {
  const { t } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const tool = FILE_TOOLS.find((item) => item.id === "jsonpath-tester") ?? FILE_TOOLS[0];
  const [input, setInput] = useState(JSONPATH_SAMPLE);
  const [query, setQuery] = useState(JSONPATH_QUERY_SAMPLE);
  const [output, setOutput] = useState("");
  const [state, setState] = useState<ProcessingState>("ready");
  const [inputError, setInputError] = useState<CodeEditorError | null>(null);
  const [queryError, setQueryError] = useState<CodeEditorError | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryErrorId = useId();

  const title = localToolMeta(tool.id, "title");
  const description = localToolMeta(tool.id, "description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: tool.path,
    h1: title,
  };
  useSeo(meta);

  const canRun = Boolean(input.trim() && query.trim()) && state !== "processing";
  const clear = (): void => {
    setInput("");
    setQuery("");
    setOutput("");
    setInputError(null);
    setQueryError(null);
    setError(null);
    setState("idle");
  };
  const reset = (): void => {
    setInput(JSONPATH_SAMPLE);
    setQuery(JSONPATH_QUERY_SAMPLE);
    setOutput("");
    setInputError(null);
    setQueryError(null);
    setError(null);
    setState("ready");
  };
  const run = (): void => {
    if (!canRun) return;
    setInputError(null);
    setQueryError(null);
    setError(null);
    setOutput("");
    setState("processing");
    trackEvent("process_start", { tool: tool.id });

    window.setTimeout(() => {
      try {
        const document = JSON.parse(input) as unknown;
        const matches = queryJsonPath(document, query);
        setOutput(serializeJsonPathMatches(matches));
        setState("success");
        trackEvent("process_success", { tool: tool.id });
      } catch (failure) {
        if (failure instanceof SyntaxError) {
          setInputError(jsonEditorError(input, failure, t("jsonPath.invalidJson")));
        } else if (failure instanceof JsonPathParseError) {
          setQueryError({ message: failure.message, column: failure.column });
        } else {
          setError(t("jsonPath.processError"));
        }
        setState("error");
        trackEvent("process_failed", { tool: tool.id });
      }
    }, 0);
  };

  const howItWorks = useMemo(
    () => [t("jsonPath.how.0"), t("jsonPath.how.1"), t("jsonPath.how.2")],
    [t]
  );
  const faq = useMemo(
    () => [
      { q: t("jsonPath.faq.0.question"), a: t("jsonPath.faq.0.answer") },
      { q: t("jsonPath.faq.1.question"), a: t("jsonPath.faq.1.answer") },
    ],
    [t]
  );

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      layout="split"
      showIdleResult
      workflow={{ state, error, onRetry: canRun ? run : undefined }}
      children={{
        workspace: (
          <CodeEditorToolkit
            value={input}
            onChange={(nextInput) => {
              setInput(nextInput);
              setInputError(null);
              setError(null);
              setOutput("");
              setState(nextInput.trim() && query.trim() ? "ready" : "idle");
            }}
            label={t("jsonPath.input")}
            language="json"
            placeholder='{"name":"value"}'
            error={inputError}
            onClear={clear}
            onReset={reset}
            footer={(
              <div className="jsonpath-tester__query">
                <label htmlFor="jsonpath-tester-query">{t("jsonPath.query")}</label>
                <input
                  id="jsonpath-tester-query"
                  value={query}
                  placeholder="$.store.book[*].author"
                  aria-invalid={Boolean(queryError)}
                  aria-describedby={queryError ? queryErrorId : undefined}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setQuery(nextQuery);
                    setQueryError(null);
                    setError(null);
                    setOutput("");
                    setState(input.trim() && nextQuery.trim() ? "ready" : "idle");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      run();
                    }
                  }}
                />
                {queryError ? (
                  <p id={queryErrorId} className="error" role="alert">
                    {queryError.message} (column {queryError.column})
                  </p>
                ) : null}
              </div>
            )}
          />
        ),
        options: (
          <div className="tool-form">
            <p>{t("jsonPath.privacy")}</p>
            <button type="button" className="btn primary" disabled={!canRun} onClick={run}>
              {state === "processing" ? t("jsonPath.running") : t("jsonPath.run")}
            </button>
          </div>
        ),
        result: (
          <CodeEditorToolkit
            value={output}
            label={t("jsonPath.output")}
            language="json"
            readOnly
            outputEmptyText={t("jsonPath.outputEmpty")}
            fileName="jsonpath-results.json"
          />
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools(tool.id),
      }}
    />
  );
}
