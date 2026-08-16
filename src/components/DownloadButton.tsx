import { downloadBlob } from "../utils/download";
import type { FileProcessResult } from "../types/tool";
import { useLanguage } from "../context/LanguageContext";

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

  return (
    <button
      type="button"
      className="btn primary"
      disabled={!result || disabled}
      onClick={() => {
        if (result) {
          downloadBlob(result.blob, result.fileName);
          onDownloaded?.();
        }
      }}
    >
      {label ?? t("button.download")}
    </button>
  );
}
