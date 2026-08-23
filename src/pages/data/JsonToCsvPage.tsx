import { useId, useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { jsonToCsv } from "../../services/csv/csvService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";

const JSON_TO_CSV_SAMPLE = JSON.stringify([
  { name: "Alice", email: "alice@example.com", active: true },
  { name: "Bob", email: "bob@example.com", active: false },
], null, 2);

export function JsonToCsvPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [inputSource, setInputSource] = useState<"text" | "file">("text");
  const [jsonInput, setJsonInput] = useState(JSON_TO_CSV_SAMPLE);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const inputErrorId = useId();
  const canProcess =
    inputSource === "text" ? Boolean(jsonInput.trim()) : files.length > 0;

  const tool = FILE_TOOLS.find((item) => item.id === "json-to-csv");
  const title = t("tool.json-to-csv.title");
  const description = t("tool.json-to-csv.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/data/json-to-csv",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("json-to-csv");
  const howItWorks = useMemo(
    () => [
      t("tool.json-to-csv.how.0"),
      t("tool.json-to-csv.how.1"),
      t("tool.json-to-csv.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.json-to-csv.faq.0.question"),
        a: t("tool.json-to-csv.faq.0.answer"),
      },
      {
        q: t("tool.json-to-csv.faq.1.question"),
        a: t("tool.json-to-csv.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleProcess = async () => {
    let source: File;
    if (inputSource === "text") {
      if (!jsonInput.trim()) {
        setInputError(t("error.enterJsonText"));
        setProcessing("error");
        return;
      }

      try {
        const parsed = JSON.parse(jsonInput);
        if (!Array.isArray(parsed)) {
          setInputError(t("tool.json-to-csv.validation.arrayRequired"));
          setProcessing("error");
          return;
        }
      } catch {
        setInputError(t("tool.json-to-csv.validation.invalidJson"));
        setProcessing("error");
        return;
      }
      source = new File([jsonInput], "sample.json", { type: "application/json" });
    } else {
      const selectedFile = files[0];
      if (!selectedFile) {
        setError(t("error.selectOneFile", { type: t("label.fileType.json") }));
        return;
      }
      const mimeError = validateMime(selectedFile, "application/json,text/plain");
      const sizeError = validateFileSize(selectedFile);
      if (mimeError || sizeError) {
        setError(mimeError?.message ?? sizeError?.message ?? t("error.invalidFile"));
        setProcessing("error");
        trackEvent("process_failed", { tool: "json-to-csv" });
        return;
      }
      source = selectedFile;
    }
    setError(null);
    setInputError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "json-to-csv" });
    try {
      const output = await jsonToCsv(source, includeHeader);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "json-to-csv" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "json-to-csv" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.json-to-csv.title")]}
        children={{
        workspace: (
          <div className="tool-form">
            <label>
              {t("label.inputSource")}
              <select
                value={inputSource}
                onChange={(event) => {
                  const nextSource = event.target.value as "text" | "file";
                  setInputSource(nextSource);
                  setInputError(null);
                  setError(null);
                  setResult(null);
                  setProcessing(nextSource === "text" && jsonInput.trim() ? "ready" : "idle");
                }}
              >
                <option value="text">{t("tool.json-to-csv.label.inputSourceText")}</option>
                <option value="file">{t("tool.json-to-csv.label.inputSourceFile")}</option>
              </select>
            </label>
            {inputSource === "text" ? (
              <div className="tool-field">
                <label htmlFor="json-to-csv-input">
                  {t("tool.json-to-csv.label.inputSourceText")}
                </label>
                <textarea
                  id="json-to-csv-input"
                  rows={12}
                  value={jsonInput}
                  aria-invalid={Boolean(inputError)}
                  aria-describedby={inputError ? inputErrorId : undefined}
                  onChange={(event) => {
                    const nextInput = event.target.value;
                    setJsonInput(nextInput);
                    setInputError(null);
                    setError(null);
                    setResult(null);
                    setProcessing(nextInput.trim() ? "ready" : "idle");
                  }}
                />
                {inputError ? (
                  <p id={inputErrorId} role="alert" className="error">
                    {inputError}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <FileDropzone
                  label={t("label.dropJson")}
                  accept="application/json,text/plain"
                  onFiles={(nextFiles) => {
                    setFiles(nextFiles);
                    setError(null);
                    setResult(null);
                    setProcessing(nextFiles.length ? "ready" : "idle");
                  }}
                  multiple={false}
                  compact={files.length > 0}
                />
                <FileInfo files={files} mode="single" compact={files.length > 0} />
              </>
            )}
          </div>
        ),
        options: (
          <div className="tool-form">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={includeHeader}
                onChange={(event) => setIncludeHeader(event.target.checked)}
              />
              {t("label.includeHeader")}
            </label>
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={!canProcess || processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {result ? (
              <DownloadButton
                result={result}
                disabled={processing === "processing"}
                onDownloaded={() => trackEvent("download", { tool: "json-to-csv" })}
              />
            ) : null}
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
