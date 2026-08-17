import { formatFileSize } from "../utils/fileSize";
import { useLanguage } from "../context/LanguageContext";

interface FileInfoProps {
  files: File[];
  mode?: "single" | "multi";
  showEmpty?: boolean;
  onRemove?: (index: number) => void;
  onReplace?: (index: number) => void;
  onClear?: () => void;
}

export function FileInfo({ files, mode = "multi", showEmpty = true, onRemove, onReplace, onClear }: FileInfoProps): JSX.Element {
  const { t } = useLanguage();

  if (files.length === 0 && showEmpty) {
    return <p>{t("fileInfo.noSelection")}</p>;
  }

  if (files.length === 0) {
    return <></>;
  }

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);
  const totalLabel = files.length === 1 ? t("fileInfo.selected", { count: 1 }) : t("fileInfo.selectedPlural", { count: files.length });

  return (
    <section className="file-list-wrap" aria-live="polite">
      <div className="file-summary">
        <p>{totalLabel} · {t("fileInfo.totalSize")}: {formatFileSize(totalSize)}</p>
        {onClear && mode === "multi" ? (
          <button type="button" className="btn secondary file-btn" onClick={onClear}>
            {t("fileInfo.clearAll")}
          </button>
        ) : null}
      </div>
      <ul className="file-list" aria-label={t("fileInfo.listLabel")}>
        {files.map((file, index) => (
          <li key={`${file.name}-${file.size}-${index}`} className="file-list__item">
            <span className="file-list__name">{file.name}</span>
            <span className="file-list__size">{formatFileSize(file.size)}</span>
            <span className="file-list__type">{file.type || t("fileInfo.unknownType")}</span>
            <span className="file-list__actions">
              {onReplace ? (
                <button
                  type="button"
                  className="btn secondary file-btn file-list__action"
                  onClick={() => onReplace(index)}
                >
                  {mode === "single" ? t("fileInfo.replace") : t("fileInfo.replace")}
                </button>
              ) : null}
              {onRemove ? (
                <button
                  type="button"
                  className="btn secondary file-btn file-list__action"
                  onClick={() => onRemove(index)}
                >
                  {t("fileInfo.remove")}
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
