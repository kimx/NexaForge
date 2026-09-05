import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { useSeoLanding } from "../../hooks/useSeoLanding";
import { localizePath } from "../../routing/localePaths";
import {
  evaluateJsonPath,
  formatJsonPathInput,
  JSONPATH_AUTO_RUN_LIMIT,
  JsonPathEvaluationError,
} from "../../services/json/jsonPathService";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

export function JsonPathTesterPage(): JSX.Element {
  const { locale } = useLanguage();
  const landing = useSeoLanding();
  const isEnglish = locale === "en";
  const copy = isEnglish
    ? {
        title: "JSONPath Tester Online",
        description: "Test JSONPath expressions against JSON locally in your browser.",
        jsonInput: "JSON input",
        expression: "JSONPath expression",
        expressionPlaceholder: "$.users[*].name",
        run: "Run",
        running: "Running...",
        copyResult: "Copy Result",
        formatJson: "Format JSON",
        clear: "Clear",
        privacy: "Your JSON is processed locally in your browser and is never uploaded or sent to analytics.",
        largeInput: "Large input: automatic execution is paused. Select Run to evaluate it manually.",
        noResult: "Enter JSON and a JSONPath expression to see the matching values.",
        noMatches: "No values matched this JSONPath.",
        invalidJson: "Invalid JSON",
        invalidJsonPath: "Invalid JSONPath",
        copyFailed: "Unable to copy the result.",
        formatted: "JSON formatted.",
      }
    : {
        title: "JSONPath Tester 線上測試工具",
        description: "在瀏覽器本機測試 JSONPath 表達式並取得匹配結果。",
        jsonInput: "JSON 輸入",
        expression: "JSONPath 表達式",
        expressionPlaceholder: "$.users[*].name",
        run: "執行",
        running: "執行中...",
        copyResult: "複製結果",
        formatJson: "格式化 JSON",
        clear: "清除",
        privacy: "JSON 只會在瀏覽器本機處理，不會上傳或傳送至分析服務。",
        largeInput: "輸入內容較大，已暫停自動執行。請按「執行」手動取得結果。",
        noResult: "輸入 JSON 與 JSONPath 表達式後，即可查看匹配值。",
        noMatches: "No values matched this JSONPath.",
        invalidJson: "JSON 格式錯誤",
        invalidJsonPath: "JSONPath 格式錯誤",
        copyFailed: "無法複製結果。",
        formatted: "JSON 已格式化。",
      };
  const [jsonInput, setJsonInput] = useState("");
  const [expression, setExpression] = useState("$.users[*].name");
  const [result, setResult] = useState<string | null>(null);
  const [hasMatches, setHasMatches] = useState(false);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const inputErrorId = useId();
  const expressionErrorId = useId();
  const isLargeInput = jsonInput.length >= JSONPATH_AUTO_RUN_LIMIT;

  const tool = FILE_TOOLS.find((item) => item.id === "jsonpath-tester") ?? FILE_TOOLS[0];
  const meta: ToolMeta = {
    title: landing?.content.title ?? `${copy.title} | NexaForge`,
    description: landing?.content.description ?? copy.description,
    canonical: landing?.definition.path ?? "/data/jsonpath-tester",
    h1: landing?.content.h1 ?? copy.title,
  };
  useSeo(meta);

  const resetResult = () => {
    setResult(null);
    setHasMatches(false);
    setState("idle");
    setError(null);
    setCopyError(null);
  };

  const run = () => {
    if (!jsonInput.trim() || !expression.trim() || state === "processing") {
      return;
    }

    setState("processing");
    setError(null);
    setCopyError(null);
    window.setTimeout(() => {
      try {
        const evaluation = evaluateJsonPath(jsonInput, expression);
        setResult(evaluation.formatted);
        setHasMatches(evaluation.values.length > 0);
        setState("success");
      } catch (evaluationError) {
        const isJsonError =
          evaluationError instanceof JsonPathEvaluationError &&
          evaluationError.kind === "invalid-json";
        const message =
          evaluationError instanceof Error ? evaluationError.message : String(evaluationError);
        setResult(null);
        setHasMatches(false);
        setError(`${isJsonError ? copy.invalidJson : copy.invalidJsonPath}: ${message}`);
        setState("error");
      }
    }, 0);
  };

  useEffect(() => {
    if (!jsonInput.trim() || !expression.trim() || isLargeInput) {
      return;
    }

    const timer = window.setTimeout(run, 300);
    return () => window.clearTimeout(timer);
  }, [expression, isLargeInput, jsonInput]);

  const handleFormat = () => {
    if (!jsonInput.trim()) {
      return;
    }

    try {
      setJsonInput(formatJsonPathInput(jsonInput));
      setResult(null);
      setHasMatches(false);
      setError(null);
      setState("idle");
    } catch (formatError) {
      const message = formatError instanceof Error ? formatError.message : String(formatError);
      setError(`${copy.invalidJson}: ${message}`);
      setResult(null);
      setHasMatches(false);
      setState("error");
    }
  };

  const handleClear = () => {
    setJsonInput("");
    setExpression("");
    resetResult();
  };

  const handleCopy = async () => {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result);
      setCopyError(null);
    } catch {
      setCopyError(copy.copyFailed);
    }
  };

  const inputError = error?.startsWith(copy.invalidJson) ? error : null;
  const expressionError = error?.startsWith(copy.invalidJsonPath) ? error : null;

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", copy.title]}
      layout="split"
      showIdleResult
      workflow={{ state, error: state === "error" ? error : null }}
      children={{
        workspace: (
          <div className="jsonpath-tester-workspace">
            <p className="jsonpath-tester-privacy" role="note">{copy.privacy}</p>
            <div className="jsonpath-tester-editors">
              <div>
                <label htmlFor="jsonpath-tester-input">{copy.jsonInput}</label>
                <textarea
                  id="jsonpath-tester-input"
                  rows={16}
                  value={jsonInput}
                  placeholder='{"users":[{"name":"Ada"}]}'
                  aria-invalid={Boolean(inputError)}
                  aria-describedby={inputError ? inputErrorId : isLargeInput ? `${inputErrorId}-large` : undefined}
                  onChange={(event) => {
                    setJsonInput(event.target.value);
                    resetResult();
                  }}
                />
                {inputError ? (
                  <p id={inputErrorId} className="error" role="alert">{inputError}</p>
                ) : null}
                {isLargeInput ? (
                  <p id={`${inputErrorId}-large`} className="jsonpath-tester-hint" role="status">
                    {copy.largeInput}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="jsonpath-tester-expression">{copy.expression}</label>
                <input
                  id="jsonpath-tester-expression"
                  value={expression}
                  placeholder={copy.expressionPlaceholder}
                  aria-invalid={Boolean(expressionError)}
                  aria-describedby={expressionError ? expressionErrorId : undefined}
                  onChange={(event) => {
                    setExpression(event.target.value);
                    resetResult();
                  }}
                />
                {expressionError ? (
                  <p id={expressionErrorId} className="error" role="alert">{expressionError}</p>
                ) : null}
              </div>
            </div>
            <div className="tool-actions jsonpath-tester-actions">
              <button type="button" className="btn secondary" disabled={!jsonInput.trim()} onClick={handleFormat}>
                {copy.formatJson}
              </button>
              <button type="button" className="btn secondary" onClick={handleClear}>
                {copy.clear}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!jsonInput.trim() || !expression.trim() || state === "processing"}
                onClick={run}
              >
                {state === "processing" ? copy.running : copy.run}
              </button>
            </div>
          </div>
        ),
        options: null,
        result: (
          <div className="jsonpath-tester-result">
            {copyError ? <p className="error" role="alert">{copyError}</p> : null}
            {result && hasMatches ? (
              <>
                <div className="tool-actions jsonpath-tester-result__actions">
                  <button type="button" className="btn secondary" onClick={() => void handleCopy()}>
                    {copy.copyResult}
                  </button>
                </div>
                <pre aria-label={copy.copyResult}>{result}</pre>
              </>
            ) : (
              <p>{state === "success" ? copy.noMatches : copy.noResult}</p>
            )}
          </div>
        ),
        nextActions: (
          <>
            <Link className="btn secondary" to={localizePath("/data/json-formatter", locale)}>JSON Formatter</Link>
            <Link className="btn secondary" to={localizePath("/data/json-diff", locale)}>JSON Diff</Link>
            <Link className="btn secondary" to={localizePath("/data/yaml-json", locale)}>YAML ↔ JSON</Link>
          </>
        ),
        howItWorks: [],
        faq: [],
        relatedTools: getRelatedTools("jsonpath-tester"),
      }}
    />
  );
}
