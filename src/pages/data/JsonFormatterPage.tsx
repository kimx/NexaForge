import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { formatJson, minifyJson } from "../../services/json/jsonService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { readFileAsText } from "../../services/file/fileService";
import { validateFileSize, validateMime } from "../../utils/validation";
import type { FileProcessResult } from "../../types/tool";
import { JsonTreeEditor, type JsonValue } from "../../components/JsonTreeEditor";
import { useLanguage } from "../../context/LanguageContext";
import { useSeoLanding } from "../../hooks/useSeoLanding";

interface ParseError {
  line: number | null;
  column: number | null;
  message: string;
}

const JSON_FORMATTER_SAMPLE: JsonValue = {
  name: "NexaForge",
  active: true,
  tags: ["json", "sample"],
};

const AUTOMATIC_VALIDATION_LIMIT = 250_000;

function extractParseError(text: string, message: string): ParseError {
  const lineMatch = /line (\d+)\s+column (\d+)/i.exec(message);
  if (lineMatch) {
    return {
      line: Number(lineMatch[1]),
      column: Number(lineMatch[2]),
      message,
    };
  }

  const positionMatch = /position (\d+)/i.exec(message);
  if (!positionMatch) {
    return {
      line: null,
      column: null,
      message,
    };
  }

  const position = Number(positionMatch[1]);
  const clampedPosition = Math.max(0, Math.min(position, text.length));
  const beforeError = text.slice(0, clampedPosition);
  const line = 1 + (beforeError.match(/\n/g)?.length ?? 0);
  const lastNewlineIndex = beforeError.lastIndexOf("\n");
  const column = clampedPosition - (lastNewlineIndex === -1 ? -1 : lastNewlineIndex);
  return { line, column, message };
}

function getParseMessageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "Unable to parse JSON.";
  }
  return "Unable to parse JSON.";
}

export function JsonFormatterPage(): JSX.Element {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const landing = useSeoLanding();
  const [files, setFiles] = useState<File[]>([]);
  const [inputSource, setInputSource] = useState<"text" | "file">("text");
  const [editorMode, setEditorMode] = useState<"text" | "tree">("text");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonTree, setJsonTree] = useState<JsonValue>(JSON_FORMATTER_SAMPLE);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<ParseError | null>(null);
  const [mode, setMode] = useState<"format" | "minify">("format");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [errorColumn, setErrorColumn] = useState<number | null>(null);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const validationErrorId = useId();
  const largeInputHintId = useId();

  const isLargeInput =
    inputSource === "text" && jsonInput.length >= AUTOMATIC_VALIDATION_LIMIT;
  const canProcess =
    inputSource === "text"
      ? Boolean(jsonInput.trim()) && !validationError
      : files.length > 0;

  useEffect(() => {
    if (inputSource !== "text" || editorMode !== "text") {
      setValidationError(null);
      return;
    }

    if (!jsonInput.trim() || jsonInput.length >= AUTOMATIC_VALIDATION_LIMIT) {
      setValidationError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        JSON.parse(jsonInput);
        setValidationError(null);
      } catch (validationFailure) {
        const message = getParseMessageFromError(validationFailure);
        setValidationError(extractParseError(jsonInput, message));
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [editorMode, inputSource, jsonInput]);

  const tool = FILE_TOOLS.find((item) => item.id === "json-formatter");
  const title = t("tool.json-formatter.title");
  const description = t("tool.json-formatter.description");
  const toolMeta: ToolMeta = {
    title: landing?.content.title ?? `${title} - ${t("header.title")}`,
    description: landing?.content.description ?? description,
    canonical: landing?.definition.path ?? "/data/json-formatter",
    h1: landing?.content.h1 ?? title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("json-formatter");
  const howItWorks = useMemo(
    () => [
      t("tool.json-formatter.how.0"),
      t("tool.json-formatter.how.1"),
      t("tool.json-formatter.how.2"),
      t("tool.json-formatter.how.3"),
      t("tool.json-formatter.how.4"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.json-formatter.faq.0.question"),
        a: t("tool.json-formatter.faq.0.answer"),
      },
      {
        q: t("tool.json-formatter.faq.1.question"),
        a: t("tool.json-formatter.faq.1.answer"),
      },
    ],
    [t]
  );

  const resetOutput = () => {
    setProcessing("idle");
    setResult(null);
    setPreview("");
    setError(null);
    setErrorLine(null);
    setErrorColumn(null);
    setParseMessage(null);
    setCopyError(null);
  };

  const handleJsonInputChange = (next: string) => {
    setJsonInput(next);
    resetOutput();
  };

  const loadSample = () => {
    const sampleText = JSON.stringify(JSON_FORMATTER_SAMPLE, null, 2);
    setJsonInput(sampleText);
    setJsonTree(JSON_FORMATTER_SAMPLE);
    setTreeError(null);
    setValidationError(null);
    resetOutput();
  };

  const syncTreeFromText = () => {
    if (!jsonInput.trim()) {
      setTreeError(t("error.enterJsonText"));
      return false;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      setJsonTree(parsed as JsonValue);
      setTreeError(null);
      return true;
    } catch (err) {
      setTreeError(getParseMessageFromError(err));
      return false;
    }
  };

  const handleTreeChange = (next: JsonValue) => {
    setJsonTree(next);
    setJsonInput(JSON.stringify(next, null, 2));
    setValidationError(null);
    resetOutput();
  };

  const handleTreePaste = (next: JsonValue) => {
    setJsonTree(next);
    setJsonInput(JSON.stringify(next, null, 2));
    setTreeError(null);
    setValidationError(null);
    resetOutput();
  };

  const handleInputSourceChange = (next: "text" | "file") => {
    setInputSource(next);
    setValidationError(null);
    resetOutput();
    if (next === "file") {
      setEditorMode("text");
      setTreeError(null);
    }
    if (next === "text") {
      setFiles([]);
    }
  };

  const handleEditorModeChange = (next: "text" | "tree") => {
    if (next === "tree") {
      const ok = syncTreeFromText();
      if (!ok) {
        return;
      }
    }
    setEditorMode(next);
  };

  const handleProcess = async () => {
    if (!canProcess || processing === "processing") {
      return;
    }

    setError(null);
    setErrorLine(null);
    setErrorColumn(null);
    setParseMessage(null);
    setCopyError(null);
    setProcessing("processing");
    setResult(null);
    setPreview("");
    trackEvent("process_start", { tool: "json-formatter" });

    let sourceText = "";
    let fileName = "formatted.json";

    try {
      if (inputSource === "text") {
        sourceText = jsonInput.trim();
        if (!sourceText) {
          throw new Error(t("error.enterJsonText"));
        }
      } else {
        const source = files[0];
        if (!source) {
          throw new Error(t("error.selectJsonFile"));
        }

        const fileSizeError = validateFileSize(source);
        const mimeError = validateMime(source, "application/json,text/plain");
        if (fileSizeError || mimeError) {
          throw new Error(fileSizeError?.message ?? mimeError?.message ?? t("error.invalidFile"));
        }
        sourceText = await readFileAsText(source);
        fileName = source.name;
      }

      const output = mode === "format" ? formatJson(sourceText) : minifyJson(sourceText);
      const outputFileName = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
      const blob = new Blob([output], { type: "application/json" });
      setResult({
        blob,
        fileName: outputFileName,
        mimeType: "application/json",
        size: blob.size,
      });
      setPreview(output);
      setValidationError(null);
      setProcessing("success");
      trackEvent("process_success", { tool: "json-formatter" });
    } catch (err) {
      const message = getParseMessageFromError(err);
      const isInputError =
        message === t("error.enterJsonText") || message === t("error.selectJsonFile") || message === t("error.invalidFile");

      if (isInputError) {
        setError(message);
      } else {
        const parse = extractParseError(sourceText, message || t("error.unableParse"));
        setErrorLine(parse.line);
        setErrorColumn(parse.column);
        setParseMessage(parse.message);
        setError(t("error.processingFailed"));

        if (inputSource === "text") {
          try {
            JSON.parse(sourceText);
          } catch {
            setValidationError(parse);
          }
        }
      }
      setProcessing("error");
      trackEvent("process_failed", { tool: "json-formatter" });
      console.error(err);
    }
  };

  const workspaceNode = useMemo(
    () => (
      <div className="tool-form json-formatter-workspace">
        <div className="json-formatter-workspace__controls">
          <label>
            {t("label.inputSource")}
            <select
              value={inputSource}
              onChange={(event) => handleInputSourceChange(event.target.value as "text" | "file")}
            >
              <option value="text">{t("tool.json-formatter.label.inputSourceText")}</option>
              <option value="file">{t("tool.json-formatter.label.inputSourceFile")}</option>
            </select>
          </label>

          {inputSource === "text" ? (
            <label>
              {t("label.editorMode")}
              <select
                value={editorMode}
                onChange={(event) =>
                  handleEditorModeChange(event.target.value as "text" | "tree")
                }
              >
                <option value="text">{t("tool.json-formatter.label.editorText")}</option>
                <option value="tree">{t("tool.json-formatter.label.editorTree")}</option>
              </select>
            </label>
          ) : null}

          <label>
            {t("label.mode")}
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as "format" | "minify")}
            >
              <option value="format">{t("tool.json-formatter.mode.format")}</option>
              <option value="minify">{t("tool.json-formatter.mode.minify")}</option>
            </select>
          </label>

          <button
            type="button"
            className="btn primary json-formatter-workspace__process"
            onClick={handleProcess}
            disabled={!canProcess || processing === "processing"}
          >
            {processing === "processing"
              ? t("button.processing")
              : mode === "format"
                ? t("tool.json-formatter.action.format")
                : t("tool.json-formatter.action.minify")}
          </button>
        </div>

        {inputSource === "text" ? (
          <>
            {editorMode === "text" ? (
              <div className="json-formatter-editor">
                <div className="json-formatter-editor__heading">
                  <label htmlFor="json-formatter-input">
                    {t("tool.json-formatter.label.jsonInput")}
                  </label>
                    <div className="tool-actions">
                      <button type="button" className="btn secondary" onClick={loadSample}>
                        {t("tool.json-formatter.action.loadSample")}
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={!jsonInput.trim()}
                        onClick={() => navigate(locale === "en" ? "/en/data/json-diff" : "/data/json-diff", {
                          state: { leftJson: jsonInput },
                        })}
                      >
                        {locale === "en" ? "Compare with another JSON" : "與另一份 JSON 比較"}
                      </button>
                    </div>
                </div>
                <textarea
                  id="json-formatter-input"
                  rows={16}
                  value={jsonInput}
                  placeholder='{"name":"value"}'
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={
                    validationError
                      ? validationErrorId
                      : isLargeInput
                        ? largeInputHintId
                        : undefined
                  }
                  onChange={(event) => handleJsonInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      void handleProcess();
                    }
                  }}
                />
                {validationError ? (
                  <p id={validationErrorId} role="alert" className="error json-formatter-editor__feedback">
                    {validationError.line !== null && validationError.column !== null
                      ? t("tool.json-formatter.validation.invalid", {
                          line: validationError.line,
                          column: validationError.column,
                          message: validationError.message,
                        })
                      : t("tool.json-formatter.validation.invalidWithoutPosition", {
                          message: validationError.message,
                        })}
                  </p>
                ) : null}
                {isLargeInput ? (
                  <p id={largeInputHintId} role="status" className="json-formatter-editor__feedback">
                    {t("tool.json-formatter.validation.largeInput")}
                  </p>
                ) : null}
                <p className="json-formatter-editor__shortcut">
                  {t("tool.json-formatter.shortcut")}
                </p>
              </div>
            ) : (
              <>
                {treeError ? (
                  <p role="alert" className="error">{`${t("tool.json-formatter.label.treeParseError")}\\n${treeError}`}</p>
                ) : (
                  <JsonTreeEditor value={jsonTree} onChange={handleTreeChange} onPasteJson={handleTreePaste} />
                )}
              </>
            )}
          </>
        ) : (
          <>
            <FileDropzone
              label={t("label.dropJson")}
              accept="application/json,text/plain"
              onFiles={setFiles}
              compact={files.length > 0}
            />
            <FileInfo files={files} mode="single" compact={files.length > 0} />
          </>
        )}
      </div>
    ),
    [
      editorMode,
      files,
      inputSource,
      isLargeInput,
      jsonInput,
      jsonTree,
      largeInputHintId,
      mode,
      navigate,
      locale,
      processing,
      t,
      treeError,
      validationError,
      validationErrorId,
    ]
  );

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.json-formatter.title")]}
        layout="split"
        showIdleResult
        workflow={{
          state: processing,
          error: processing === "error" ? error : null,
          onRetry: canProcess ? () => void handleProcess() : undefined,
        }}
        children={{
        workspace: workspaceNode,
        options: null,
        result: (
          <>
            {copyError && <p role="alert" className="error">{copyError}</p>}
            {preview ? (
              <div className="json-formatter-output">
                <div className="tool-actions json-formatter-output__actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(preview);
                        setCopyError(null);
                      } catch {
                        setCopyError(t("error.copyFailed"));
                      }
                    }}
                  >
                    {t("button.copy")}
                  </button>
                  <DownloadButton
                    result={result}
                    onDownloaded={() => trackEvent("download", { tool: "json-formatter" })}
                  />
                </div>
                <pre className="json-formatter-result">{preview}</pre>
              </div>
            ) : (
              <div className="json-formatter-empty-state">
                <span className="json-formatter-empty-state__mark" aria-hidden="true">
                  {"{ }"}
                </span>
                <p>{t("tool.json-formatter.label.noPreview")}</p>
              </div>
            )}
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
