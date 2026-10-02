import type { BatchItem } from "../services/batch/batchService";
import { downloadBlob } from "../utils/download";
import { useLanguage } from "../context/LanguageContext";
import { formatFileSize } from "../utils/fileSize";

export function BatchFileResults({
  items,
  onDownloaded,
  showImageDetails = false,
}: {
  items: BatchItem[];
  onDownloaded?: (item: BatchItem) => void;
  showImageDetails?: boolean;
}): JSX.Element {
  const { t } = useLanguage();
  return (
    <ul className="batch-file-results" aria-label={t("toolPage.result")}>
      {items.map((item, index) => (
        <li className={`batch-file-results__item batch-file-results__item--${item.status}`} key={`${item.file.name}-${index}`}>
          <span className="batch-file-results__name">{item.file.name}</span>
          {item.status === "success" ? (
            <>
              <div className="batch-file-results__details">
                <span>{item.result.targetStatus ? t(`image-compress.status.${item.result.targetStatus}`) : t("batch.success")}</span>
                {showImageDetails ? (
                  <>
                    <span>{t("label.originalSize")}: {formatFileSize(item.file.size)} · {t("label.outputSize")}: {formatFileSize(item.result.size)}</span>
                    {item.result.width && item.result.height ? (
                      <span>{t("image-compress.dimensions")}: {item.result.originalWidth ?? item.result.width} × {item.result.originalHeight ?? item.result.height} → {item.result.width} × {item.result.height}</span>
                    ) : null}
                    {item.result.targetBytes ? <span>{t("image-compress.targetLimit")}: {formatFileSize(item.result.targetBytes)}</span> : null}
                  </>
                ) : null}
              </div>
              <button type="button" className="btn secondary" onClick={() => {
                downloadBlob(item.result.blob, item.result.fileName);
                onDownloaded?.(item);
              }}>
                {t("batch.downloadFile", { name: item.result.fileName })}
              </button>
            </>
          ) : <span className="error">{item.error.message}</span>}
        </li>
      ))}
    </ul>
  );
}
