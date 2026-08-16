import { useMemo, useState } from "react";
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

interface ParseError {
  line: number;
  column: number;
  message: string;
}

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
      line: 1,
      column: 1,
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
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [inputSource, setInputSource] = useState<"text" | "file">("text");
  const [editorMode, setEditorMode] = useState<"text" | "tree">("tree");
  const [jsonInput, setJsonInput] = useState("{}");
  const [jsonTree, setJsonTree] = useState<JsonValue>({} as JsonValue);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [mode, setMode] = useState<"format" | "minify">("format");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [errorColumn, setErrorColumn] = useState<number | null>(null);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "json-formatter");
  const title = t("tool.json-formatter.title");
  const description = t("tool.json-formatter.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/data/json-formatter",
    h1: title,
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
  };

  const handleTreePaste = (next: JsonValue) => {
    setJsonTree(next);
    setJsonInput(JSON.stringify(next, null, 2));
    setTreeError(null);
  };

  const handleInputSourceChange = (next: "text" | "file") => {
    setInputSource(next);
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
      }
      setProcessing("error");
      trackEvent("process_failed", { tool: "json-formatter" });
      console.error(err);
    }
  };

  const workspaceNode = useMemo(
    () => (
      <div className="tool-form">
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
          <>
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
            {editorMode === "text" ? (
              <textarea
                rows={12}
                value={jsonInput}
                placeholder='{"name":"value"}'
                onChange={(event) => setJsonInput(event.target.value)}
              />
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
            />
            <FileInfo files={files} />
          </>
        )}
      </div>
    ),
    [editorMode, files, inputSource, jsonInput, jsonTree, treeError, t]
  );

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
      breadcrumb={["Home", t("tool.json-formatter.title")]}
        children={{
        workspace: workspaceNode,
        options: (
          <div className="tool-form">
            <label>
              {t("label.mode")}
              <select value={mode} onChange={(event) => setMode(event.target.value as "format" | "minify")}>
                <option value="format">{t("tool.json-formatter.mode.format")}</option>
                <option value="minify">{t("tool.json-formatter.mode.minify")}</option>
              </select>
            </label>
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={processing === "processing"}
            >
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {copyError && <p role="alert" className="error">{copyError}</p>}
            {(errorLine !== null && errorColumn !== null) ? (
              <pre className="error-block">
                {t("tool.json-formatter.parseError", {
                  line: errorLine,
                  column: errorColumn,
                  message: parseMessage ?? t("error.unableParse"),
                })}
              </pre>
            ) : null}
            <pre>{preview || t("tool.json-formatter.label.noPreview")}</pre>
            <div className="tool-actions">
              <button
                type="button"
                className="btn secondary"
                disabled={!preview || processing === "processing"}
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
                disabled={processing === "processing"}
                onDownloaded={() => trackEvent("download", { tool: "json-formatter" })}
              />
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
