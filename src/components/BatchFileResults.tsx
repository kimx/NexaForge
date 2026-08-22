import type { BatchItem } from "../services/batch/batchService";
import { downloadBlob } from "../utils/download";
import { useLanguage } from "../context/LanguageContext";

export function BatchFileResults({ items }: { items: BatchItem[] }): JSX.Element {
  const { t } = useLanguage();
  return (
    <ul className="batch-file-results" aria-label={t("toolPage.result")}>
      {items.map((item, index) => (
        <li className={`batch-file-results__item batch-file-results__item--${item.status}`} key={`${item.file.name}-${index}`}>
          <span className="batch-file-results__name">{item.file.name}</span>
          {item.status === "success" ? (
            <>
              <span>{t("batch.success")}</span>
              <button type="button" className="btn secondary" onClick={() => downloadBlob(item.result.blob, item.result.fileName)}>
                {t("batch.downloadFile", { name: item.result.fileName })}
              </button>
            </>
          ) : <span className="error">{item.error.message}</span>}
        </li>
      ))}
    </ul>
  );
}
