import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "../context/LanguageContext";
import { DownloadButton } from "./DownloadButton";
import type { FileProcessResult } from "../types/tool";

export interface CodeEditorError {
  message: string;
  line?: number | null;
  column?: number | null;
}

interface CodeEditorToolkitProps {
  value: string;
  onChange?: (value: string) => void;
  label: string;
  language?: string;
  readOnly?: boolean;
  placeholder?: string;
  rows?: number;
  error?: CodeEditorError | null;
  outputEmptyText?: string;
  fileName?: string;
  inputActions?: ReactNode;
  footer?: ReactNode;
  onClear?: () => void;
  onReset?: () => void;
  clearLabel?: string;
  resetLabel?: string;
  copyLabel?: string;
  downloadLabel?: string;
  onDownloaded?: () => void;
  className?: string;
}

interface LineNumberedTextareaProps {
  id: string;
  value: string;
  onChange?: (value: string) => void;
  label: string;
  language?: string;
  readOnly: boolean;
  placeholder?: string;
  rows: number;
  error?: CodeEditorError | null;
  describedBy?: string;
}

function lineCount(value: string): number {
  return Math.max(1, value.split(/\r?\n/).length);
}

function LineNumberedTextarea({
  id,
  value,
  onChange,
  label,
  language,
  readOnly,
  placeholder,
  rows,
  error,
  describedBy,
}: LineNumberedTextareaProps): JSX.Element {
  const gutterRef = useRef<HTMLPreElement | null>(null);
  const lines = Array.from({ length: lineCount(value) }, (_, index) => index + 1).join("\n");

  return (
    <div className={`code-editor-toolkit__surface${error ? " code-editor-toolkit__surface--error" : ""}`}>
      <pre ref={gutterRef} className="code-editor-toolkit__gutter" aria-hidden="true">{lines}</pre>
      <textarea
        id={id}
        className="code-editor-toolkit__textarea"
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        readOnly={readOnly || !onChange}
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        wrap="off"
        data-language={language}
        aria-label={label}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy}
        onScroll={(event) => {
          if (gutterRef.current) {
            gutterRef.current.scrollTop = event.currentTarget.scrollTop;
          }
        }}
      />
    </div>
  );
}

function formatError(error: CodeEditorError): string {
  const location = error.line
    ? ` (line ${error.line}${error.column ? `, column ${error.column}` : ""})`
    : "";
  return `${error.message}${location}`;
}

export function CodeEditorToolkit({
  value,
  onChange,
  label,
  language = "text",
  readOnly = false,
  placeholder,
  rows = 16,
  error = null,
  outputEmptyText,
  fileName = "output.txt",
  inputActions,
  footer,
  onClear,
  onReset,
  clearLabel,
  resetLabel,
  copyLabel,
  downloadLabel,
  onDownloaded,
  className,
}: CodeEditorToolkitProps): JSX.Element {
  const { t } = useLanguage();
  const editorId = useId();
  const errorId = useId();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const outputResult: FileProcessResult | null = value
    ? (() => {
        const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
        return { blob, fileName, mimeType: "text/plain", size: blob.size };
      })()
    : null;

  useEffect(() => {
    setCopied(false);
    setCopyError(null);
  }, [value]);

  const hasActions = !readOnly && (inputActions || onClear || onReset);

  return (
    <section className={`code-editor-toolkit${className ? ` ${className}` : ""}`}>
      <div className="code-editor-toolkit__header">
        <label htmlFor={editorId} className="code-editor-toolkit__label">{label}</label>
        {hasActions ? (
          <div className="code-editor-toolkit__actions">
            {inputActions}
            {onClear ? (
              <button type="button" className="btn secondary" onClick={onClear}>
                {clearLabel ?? t("button.clear")}
              </button>
            ) : null}
            {onReset ? (
              <button type="button" className="btn secondary" onClick={onReset}>
                {resetLabel ?? t("button.reset")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <LineNumberedTextarea
        id={editorId}
        value={value}
        onChange={readOnly ? undefined : onChange}
        label={label}
        language={language}
        readOnly={readOnly}
        placeholder={placeholder}
        rows={rows}
        error={error}
        describedBy={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="error code-editor-toolkit__error" role="alert">
          {formatError(error)}
        </p>
      ) : null}
      {footer}
      {readOnly ? (
        <>
          {!value && outputEmptyText ? <p className="code-editor-toolkit__empty">{outputEmptyText}</p> : null}
          <div className="code-editor-toolkit__actions code-editor-toolkit__output-actions">
            <button
              type="button"
              className="btn secondary"
              disabled={!value}
              onClick={async () => {
                try {
                  if (!navigator.clipboard) throw new Error("Clipboard unavailable");
                  await navigator.clipboard.writeText(value);
                  setCopied(true);
                  setCopyError(null);
                } catch {
                  setCopied(false);
                  setCopyError(t("error.copyFailed"));
                }
              }}
            >
              {copyLabel ?? t("button.copy")}
            </button>
            <DownloadButton result={outputResult} label={downloadLabel} onDownloaded={onDownloaded} />
          </div>
          {copied ? <p className="code-editor-toolkit__status" role="status">{t("status.copied")}</p> : null}
          {copyError ? <p className="error" role="alert">{copyError}</p> : null}
        </>
      ) : null}
    </section>
  );
}
