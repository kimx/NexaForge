import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CodeOutputPanel } from "../../components/CodeOutputPanel";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  SqlFormatError,
  formatSql,
  type SqlDialect,
  type SqlIndent,
  type SqlKeywordCase,
  type SqlOutputMode,
} from "../../services/sql/sqlFormatterService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";

const FALLBACK_TOOL: ToolDefinition = {
  id: "sql-formatter",
  title: "SQL Formatter",
  description: "Format SQL locally.",
  path: "/developer/sql-formatter",
  category: "Developer",
};

export function SqlFormatterPage(): JSX.Element {
  const { t } = useLanguage();
  const [source, setSource] = useState("");
  const [dialect, setDialect] = useState<SqlDialect>("transactsql");
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>("preserve");
  const [indent, setIndent] = useState<SqlIndent>(2);
  const [state, setState] = useState<ProcessingState>("idle");
  const [output, setOutput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const operationRevision = useRef(0);
  const inputErrorId = useId();

  const tool = FILE_TOOLS.find((item) => item.id === "sql-formatter") ?? FALLBACK_TOOL;
  const title = t("tool.sql-formatter.title");
  const description = t("tool.sql-formatter.description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: tool.path,
    h1: title,
  };
  useSeo(meta);

  useEffect(() => () => {
    operationRevision.current += 1;
  }, []);

  const invalidateResult = (nextState: ProcessingState): void => {
    operationRevision.current += 1;
    setInputError(null);
    setWorkflowError(null);
    setOutput("");
    setState(nextState);
  };

  const howItWorks = useMemo(
    () => [0, 1, 2].map((index) => t(`tool.sql-formatter.how.${index}`)),
    [t]
  );
  const faq = useMemo(
    () => [0, 1].map((index) => ({
      q: t(`tool.sql-formatter.faq.${index}.question`),
      a: t(`tool.sql-formatter.faq.${index}.answer`),
    })),
    [t]
  );

  const processSql = async (mode: SqlOutputMode): Promise<void> => {
    const revision = operationRevision.current + 1;
    operationRevision.current = revision;
    if (!source.trim()) {
      setInputError(t("tool.sql-formatter.empty"));
      setWorkflowError(null);
      setOutput("");
      setState("error");
      return;
    }

    setInputError(null);
    setWorkflowError(null);
    setState("processing");
    trackEvent("process_start", { tool: tool.id, action: mode });
    try {
      const result = await formatSql(source, { dialect, keywordCase, indent, mode });
      if (operationRevision.current !== revision) return;
      setOutput(result);
      setState("success");
      trackEvent("process_success", { tool: tool.id, action: mode });
    } catch (error) {
      if (operationRevision.current !== revision) return;
      setOutput("");
      setState("error");
      const message = error instanceof SqlFormatError && error.code === "empty-input"
        ? t("tool.sql-formatter.empty")
        : t("tool.sql-formatter.failed");
      if (error instanceof SqlFormatError && error.code === "empty-input") setInputError(message);
      else setWorkflowError(message);
      trackEvent("process_failed", { tool: tool.id, action: mode });
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state, error: workflowError, onRetry: () => processSql("format") }}
    >
      {{
        workspace: (
          <div className="tool-form">
            <label htmlFor="sql-formatter-input">{t("tool.sql-formatter.input")}</label>
            <textarea
              id="sql-formatter-input"
              className="issue26-editor"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                invalidateResult(event.target.value.trim() ? "ready" : "idle");
              }}
              aria-describedby={inputError ? inputErrorId : undefined}
              aria-invalid={Boolean(inputError)}
              spellCheck={false}
            />
            {inputError ? <p className="error" id={inputErrorId}>{inputError}</p> : null}
          </div>
        ),
        options: (
          <div className="tool-form">
            <div className="issue26-control-grid">
              <label>
                {t("tool.sql-formatter.dialect")}
                <select value={dialect} onChange={(event) => {
                  setDialect(event.target.value as SqlDialect);
                  invalidateResult(source.trim() ? "ready" : "idle");
                }}>
                  {(["transactsql", "postgresql", "mysql"] as const).map((value) => (
                    <option key={value} value={value}>{t(`tool.sql-formatter.dialect.${value}`)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("tool.sql-formatter.keywordCase")}
                <select value={keywordCase} onChange={(event) => {
                  setKeywordCase(event.target.value as SqlKeywordCase);
                  invalidateResult(source.trim() ? "ready" : "idle");
                }}>
                  {(["preserve", "upper", "lower"] as const).map((value) => (
                    <option key={value} value={value}>{t(`tool.sql-formatter.keywordCase.${value}`)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("tool.sql-formatter.indent")}
                <select
                  value={String(indent)}
                  onChange={(event) => {
                    setIndent(event.target.value === "tab" ? "tab" : Number(event.target.value) as 2 | 4);
                    invalidateResult(source.trim() ? "ready" : "idle");
                  }}
                >
                  <option value="2">{t("tool.sql-formatter.indent.2")}</option>
                  <option value="4">{t("tool.sql-formatter.indent.4")}</option>
                  <option value="tab">{t("tool.sql-formatter.indent.tab")}</option>
                </select>
              </label>
            </div>
            <div className="issue26-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => processSql("format")}
                disabled={state === "processing"}
                aria-busy={state === "processing"}
              >
                {t("tool.sql-formatter.format")}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => processSql("minify")}
                disabled={state === "processing"}
              >
                {t("tool.sql-formatter.minify")}
              </button>
            </div>
          </div>
        ),
        result: (
          <CodeOutputPanel
            label={t("tool.sql-formatter.output")}
            value={output}
            fileName="formatted.sql"
            language="sql"
            emptyText={t("tool.sql-formatter.noOutput")}
          />
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools(tool.id),
      }}
    </ToolPageTemplate>
  );
}
