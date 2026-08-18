import { useMemo, useState } from "react";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { readExifEntries, removeExifData, type ExifEntry } from "../../services/image/exifService";
import type { FileProcessResult, ProcessingState, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";
import { validateFileSize, validateMime } from "../../utils/validation";
import { SizeComparison } from "../../components/SizeComparison";

export type ExifToolKind = "image-exif-viewer" | "image-remove-exif";

export function ExifPage({ kind }: { kind: ExifToolKind }): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [entries, setEntries] = useState<ExifEntry[]>([]);
  const [resultFile, setResultFile] = useState<FileProcessResult | null>(null);
  const [removedBytes, setRemovedBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === kind) ?? FILE_TOOLS[0];
  const title = t(`tool.${kind}.title`);
  const description = t(`tool.${kind}.description`);
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: tool.path,
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools(kind);
  const howItWorks = useMemo(
    () => [0, 1, 2].map((index) => t(`tool.${kind}.how.${index}`)),
    [kind, t]
  );
  const faq = useMemo(
    () => [0, 1].map((index) => ({ q: t(`tool.${kind}.faq.${index}.question`), a: t(`tool.${kind}.faq.${index}.answer`) })),
    [kind, t]
  );

  const handleProcess = async (): Promise<void> => {
    const source = files[0];
    if (!source) {
      setError(t("error.selectOneFile", { type: t("label.fileType.image") }));
      setProcessing("error");
      return;
    }

    const mimeError = validateMime(source, "image/jpeg");
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? t("error.invalidFile"));
      setProcessing("error");
      trackEvent("process_failed", { tool: kind });
      return;
    }

    setError(null);
    setProcessing("processing");
    setEntries([]);
    setResultFile(null);
    setRemovedBytes(0);
    trackEvent("process_start", { tool: kind });

    try {
      if (kind === "image-exif-viewer") {
        const nextEntries = await readExifEntries(source);
        setEntries(nextEntries);
      } else {
        const nextResult = await removeExifData(source);
        setResultFile(nextResult.result);
        setRemovedBytes(nextResult.removedBytes);
      }
      setProcessing("success");
      trackEvent("process_success", { tool: kind });
    } catch (processError) {
      setError(t(`tool.${kind}.error.processing`));
      setProcessing("error");
      trackEvent("process_failed", { tool: kind });
      console.error(processError);
    }
  };

  const clearSelection = (): void => {
    setFiles([]);
    setEntries([]);
    setResultFile(null);
    setRemovedBytes(0);
    setError(null);
    setProcessing("idle");
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={toolMeta}
      breadcrumb={["Home", title]}
      workflow={{ state: processing, error, onRetry: handleProcess, onReprocess: handleProcess }}
      children={{
        workspace: (
          <>
            <FileDropzone label={t("label.dropImage")} accept="image/jpeg" multiple={false} onFiles={setFiles} />
            <p>{t("tool.image-exif.shared.jpegOnly")}</p>
            <FileInfo files={files} onClear={clearSelection} />
          </>
        ),
        options: (
          <div className="tool-form">
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: kind === "image-exif-viewer" ? (
          entries.length > 0 ? (
            <dl className="tool-form">
              {entries.map((entry) => (
                <div key={`${entry.label}-${entry.value}`}>
                  <dt><strong>{entry.label}</strong></dt>
                  <dd>{entry.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>{t("tool.image-exif.shared.noExif")}</p>
          )
        ) : (
          <>
            {resultFile ? (
              <>
                <SizeComparison originalSize={files[0]?.size ?? resultFile.size + removedBytes} outputSize={resultFile.size} />
                <p>{t("tool.image-remove-exif.label.removedBytes", { count: removedBytes })}</p>
                <p>{t("label.size")}: {(resultFile.size / 1024).toFixed(2)} KB</p>
                <DownloadButton
                  result={resultFile}
                  disabled={processing === "processing"}
                  onDownloaded={() => trackEvent("download", { tool: kind })}
                />
              </>
            ) : (
              <p>{t("label.noResult")}</p>
            )}
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
