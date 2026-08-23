import { useMemo, useState } from "react";
import { DownloadButton } from "./DownloadButton";
import { useLanguage } from "../context/LanguageContext";

interface CodeOutputPanelProps {
  label: string;
  value: string;
  fileName: string;
  language: string;
  emptyText: string;
}

export function CodeOutputPanel({
  label,
  value,
  fileName,
  language,
  emptyText,
}: CodeOutputPanelProps): JSX.Element {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const result = useMemo(
    () =>
      value
        ? {
            blob: new Blob([value], { type: "text/plain;charset=utf-8" }),
            fileName,
            mimeType: "text/plain",
            size: new Blob([value]).size,
          }
        : null,
    [fileName, value]
  );

  if (!value) {
    return (
      <div className="code-output-panel code-output-panel--empty">
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="code-output-panel">
      <label>
        {label}
        <textarea
          className="code-output-panel__textarea"
          value={value}
          readOnly
          rows={16}
          spellCheck={false}
          data-language={language}
        />
      </label>
      <div className="issue23-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        >
          {t("button.copy")}
        </button>
        <DownloadButton result={result} />
      </div>
      {copied ? <p className="code-output-panel__status" role="status">{t("status.copied")}</p> : null}
    </div>
  );
}
