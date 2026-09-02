import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { createPdfFromImages } from "../../services/pdf/conversionService";
import type { FileProcessResult, ProcessingState, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { formatFileSize } from "../../utils/fileSize";
import { getRelatedTools } from "../../utils/toolHelpers";
import { localizePath } from "../../routing/localePaths";

export function ImageToPdfPage(): JSX.Element {
  const { t, locale } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tool = FILE_TOOLS.find((item) => item.id === "image-to-pdf") ?? FILE_TOOLS[0];
  const title = t("tool.image-to-pdf.title");
  const description = t("tool.image-to-pdf.description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/image/to-pdf",
    h1: title,
  };
  useSeo(meta);

  const howItWorks = useMemo(
    () => [0, 1, 2].map((index) => t(`tool.image-to-pdf.how.${index}`)),
    [t]
  );
  const faq = useMemo(
    () => [0, 1].map((index) => ({
      q: t(`tool.image-to-pdf.faq.${index}.question`),
      a: t(`tool.image-to-pdf.faq.${index}.answer`),
    })),
    [t]
  );

  const resetResult = (): void => {
    setResult(null);
    setError(null);
    setProcessing("ready");
  };

  const moveFile = (index: number, direction: -1 | 1): void => {
    setFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    resetResult();
  };

  const handleProcess = async (): Promise<void> => {
    if (files.length === 0) return;
    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "image-to-pdf" });
    try {
      const output = await createPdfFromImages(files);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "image-to-pdf" });
    } catch (cause) {
      console.error(cause);
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "image-to-pdf" });
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state: processing, error, onRetry: handleProcess, onReprocess: handleProcess }}
      children={{
        workspace: (
          <>
            <FileDropzone
              label={t("tool.image-to-pdf.drop")}
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              compact={files.length > 0}
              disabled={processing === "processing"}
              onFiles={(incoming) => {
                setFiles((current) => [...current, ...incoming]);
                resetResult();
                trackEvent("workflow_ready", { tool: "image-to-pdf" });
              }}
            />
            {files.length > 0 ? (
              <>
                <div className="pdf-merge-list-summary">
                  <span>{t("fileInfo.selectedPlural", { count: files.length })} · {t("fileInfo.totalSize")}: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}</span>
                  <button type="button" className="btn secondary file-btn" disabled={processing === "processing"} onClick={() => {
                    setFiles([]);
                    setResult(null);
                    setError(null);
                    setProcessing("idle");
                  }}>{t("fileInfo.clearAll")}</button>
                </div>
                <ol className="reorder-list" aria-label={t("tool.image-to-pdf.order") }>
                  {files.map((file, index) => (
                    <li className="reorder-list__item" key={`${file.name}-${file.size}-${index}`}>
                      <span className="reorder-list__name">
                        <strong>{index + 1}. {file.name}</strong>
                        <small>{formatFileSize(file.size)}</small>
                      </span>
                      <div className="button-row reorder-list__actions">
                        <button type="button" className="file-btn" disabled={processing === "processing" || index === 0} aria-label={t("tool.image-to-pdf.moveUp", { name: file.name })} onClick={() => moveFile(index, -1)}>↑</button>
                        <button type="button" className="file-btn" disabled={processing === "processing" || index === files.length - 1} aria-label={t("tool.image-to-pdf.moveDown", { name: file.name })} onClick={() => moveFile(index, 1)}>↓</button>
                        <button type="button" className="file-btn" disabled={processing === "processing"} aria-label={`${t("fileInfo.remove")} ${file.name}`} onClick={() => {
                          setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
                          setResult(null);
                          setProcessing(files.length > 1 ? "ready" : "idle");
                        }}>×</button>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </>
        ),
        options: (
          <button type="button" className="btn primary" disabled={files.length === 0 || processing === "processing"} aria-busy={processing === "processing"} onClick={handleProcess}>
            {processing === "processing" ? t("button.processing") : t("tool.image-to-pdf.create")}
          </button>
        ),
        result: result ? <p>{t("tool.image-to-pdf.output", { count: files.length, size: formatFileSize(result.size) })}</p> : <></>,
        nextActions: (
          <>
            <DownloadButton result={result} onDownloaded={() => trackEvent("download", { tool: "image-to-pdf" })} />
            <Link className="btn secondary" to={localizePath("/pdf/merge", locale)}>{locale === "en" ? "Merge PDF files" : "合併 PDF"}</Link>
            <Link className="btn secondary" to={localizePath("/image/compress", locale)}>{locale === "en" ? "Compress this image" : "壓縮圖片"}</Link>
            <Link className="btn secondary" to={localizePath("/image/resize", locale)}>{locale === "en" ? "Resize this image" : "調整圖片尺寸"}</Link>
          </>
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools("image-to-pdf"),
      }}
    />
  );
}
