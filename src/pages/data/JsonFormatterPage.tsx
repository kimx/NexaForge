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

export function JsonFormatterPage(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
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
  const toolMeta: ToolMeta = {
    title: "JSON Formatter - NexaForge",
    description: "Format, minify and validate JSON files completely in browser.",
    canonical: "/data/json-formatter",
    h1: "JSON Formatter",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("json-formatter");
  const howItWorks = useMemo(
    () => [
      "Upload a JSON file.",
      "Choose Format or Minify.",
      "Process to produce validated output.",
      "Copy or download result.",
    ],
    []
  );
  const faq = useMemo(
    () => [
      {
        q: "What error detail is shown?",
        a: "A parse error shows line and column when parsing fails.",
      },
      {
        q: "Can I fix JSON and retry?",
        a: "Yes. Update your file and process again.",
      },
    ],
    []
  );

  const handleProcess = async () => {
    if (!files[0]) {
      setError("Please select a json file.");
      setErrorLine(null);
      setErrorColumn(null);
      setParseMessage(null);
      setCopyError(null);
      setProcessing("error");
      return;
    }
    const source = files[0];
    const fileSizeError = validateFileSize(source);
    const mimeError = validateMime(source, "application/json,text/plain");
    if (fileSizeError || mimeError) {
      setError(fileSizeError?.message ?? mimeError?.message ?? "Invalid file.");
      setProcessing("error");
      setErrorLine(null);
      setErrorColumn(null);
      setParseMessage(null);
      setCopyError(null);
      trackEvent("process_failed", { tool: "json-formatter" });
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
    try {
      const sourceText = await readFileAsText(source);
      const output = mode === "format" ? formatJson(sourceText) : minifyJson(sourceText);
      const blob = new Blob([output], { type: "application/json" });
      setResult({
        blob,
        fileName: source.name.endsWith(".json") ? source.name : `${source.name}.json`,
        mimeType: "application/json",
        size: blob.size,
      });
      setPreview(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "json-formatter" });
    } catch (err) {
      const parse = err instanceof Error ? err : new Error("Unable to process this file.");
      const sourceText = files[0] ? await readFileAsText(files[0]) : "";
      const message = extractParseError(sourceText, parse.message || "JSON parse error");
      setErrorLine(message.line);
      setErrorColumn(message.column);
      setParseMessage(message.message);
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "json-formatter" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "JSON Formatter"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop json here"
              accept="application/json,text/plain"
              onFiles={setFiles}
            />
            <FileInfo files={files} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              Mode
              <select value={mode} onChange={(event) => setMode(event.target.value as "format" | "minify")}>
                <option value="format">Format</option>
                <option value="minify">Minify</option>
              </select>
            </label>
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={processing === "processing"}
            >
              {processing === "processing" ? "Processing..." : "Process"}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {copyError && <p role="alert" className="error">{copyError}</p>}
            {(errorLine !== null && errorColumn !== null) ? (
              <pre className="error-block">{`JSON parse error\nline: ${errorLine}\ncolumn: ${errorColumn}${parseMessage ? `\n${parseMessage}` : ""}`}</pre>
            ) : null}
            <pre>{preview || "No output."}</pre>
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
                    setCopyError("Unable to copy result to clipboard.");
                  }
                }}
              >
                Copy
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

