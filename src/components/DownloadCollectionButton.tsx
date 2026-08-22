import { useState } from "react";
import type { FileProcessResult } from "../types/tool";
import { createZip } from "../services/file/zipService";
import { downloadBlob } from "../utils/download";
import { useLanguage } from "../context/LanguageContext";

interface DownloadCollectionButtonProps {
  results: FileProcessResult[];
  fileName: string;
  disabled?: boolean;
}

export function DownloadCollectionButton({ results, fileName, disabled }: DownloadCollectionButtonProps): JSX.Element {
  const { t } = useLanguage();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);
  return <div className="download-collection">
    <button type="button" className="btn primary" disabled={disabled || creating || results.length === 0} aria-busy={creating}
      onClick={async () => {
        setCreating(true); setError(false);
        try {
          const archive = await createZip(results, fileName);
          downloadBlob(archive.blob, archive.fileName);
        } catch (cause) {
          console.error(cause); setError(true);
        } finally {
          setCreating(false);
        }
      }}>
      {creating ? t("batch.creatingZip") : t("batch.downloadZip")}
    </button>
    {error ? <p className="error" role="alert">{t("batch.zipError")}</p> : null}
  </div>;
}
