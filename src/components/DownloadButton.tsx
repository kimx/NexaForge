import { downloadBlob } from "../utils/download";
import type { FileProcessResult } from "../types/tool";
import { useLanguage } from "../context/LanguageContext";
import { useEffect, useId, useState } from "react";
import { formatFileSize } from "../utils/fileSize";

interface DownloadButtonProps {
  result: FileProcessResult | null;
  disabled?: boolean;
  label?: string;
  onDownloaded?: () => void;
}

export function DownloadButton({
  result,
  disabled,
  label,
  onDownloaded,
}: DownloadButtonProps): JSX.Element {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "started" | "error">("idle");
  const descriptionId = useId();
  useEffect(() => { setStatus("idle"); }, [result]);

  return (
    <div className="download-action">
    {result ? <p id={descriptionId} className="download-action__details">{result.fileName} · {formatFileSize(result.size)}</p> : null}
    <button
      type="button"
      className="btn primary"
      disabled={!result || disabled}
      aria-describedby={result ? descriptionId : undefined}
      onClick={() => {
        if (result) {
          try {
            downloadBlob(result.blob, result.fileName);
            setStatus("started");
            onDownloaded?.();
          } catch { setStatus("error"); }
        }
      }}
    >
      {label ?? t("button.download")}
    </button>
    {status === "started" ? <p role="status">{t("download.started")}</p> : null}
    {status === "error" ? <p role="alert" className="error">{t("download.failed")}</p> : null}
    </div>
  );
}
