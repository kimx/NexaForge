import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DownloadCollectionButton } from "../../components/DownloadCollectionButton";
import { FileDropzone } from "../../components/FileDropzone";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { useSeo } from "../../hooks/useSeo";
import { convertPdfToImages } from "../../services/pdf/conversionService";
import type { FileProcessResult, ProcessingState, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { downloadBlob } from "../../utils/download";
import { getRelatedTools } from "../../utils/toolHelpers";
import { localizePath } from "../../routing/localePaths";

function PagePreview({ result, page }: { result: FileProcessResult; page: number }): JSX.Element {
  const { t } = useLanguage();
  const source = useBlobUrl(result.blob);
  return (
    <li className="pdf-image-preview__item">
      <div className="pdf-image-preview__canvas">
        <img src={source || undefined} alt={t("tool.pdf-to-image.preview", { page })} />
      </div>
      <div className="pdf-image-preview__footer">
        <strong>{t("tool.pdf-to-image.page", { page })}</strong>
        <button type="button" className="btn secondary" aria-label={t("tool.pdf-to-image.downloadPage", { page })} onClick={() => downloadBlob(result.blob, result.fileName)}>
          {t("button.download")}
        </button>
      </div>
    </li>
  );
}

export function PdfToImagePage(): JSX.Element {
  const { t, locale } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<FileProcessResult[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const tool = FILE_TOOLS.find((item) => item.id === "pdf-to-image") ?? FILE_TOOLS[0];
  const title = t("tool.pdf-to-image.title");
  const description = t("tool.pdf-to-image.description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/pdf/to-image",
    h1: title,
  };
  useSeo(meta);
  const howItWorks = useMemo(() => [0, 1, 2].map((index) => t(`tool.pdf-to-image.how.${index}`)), [t]);
  const faq = useMemo(() => [0, 1].map((index) => ({
    q: t(`tool.pdf-to-image.faq.${index}.question`),
    a: t(`tool.pdf-to-image.faq.${index}.answer`),
  })), [t]);

  const handleProcess = async (): Promise<void> => {
    if (!file) return;
    setResults([]);
    setError(null);
    setProgress(0);
    setProgressText("");
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-to-image" });
    try {
      const output = await convertPdfToImages(file, (completed, total) => {
        setProgress(Math.round((completed / total) * 100));
        setProgressText(t("tool.pdf-to-image.progress", { completed, total }));
      });
      setResults(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-to-image", resultCount: output.length });
    } catch (cause) {
      console.error(cause);
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-to-image" });
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state: processing, error, progress, onRetry: handleProcess, onReprocess: handleProcess }}
      children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropPdf")}
              accept="application/pdf,.pdf"
              compact={Boolean(file)}
              disabled={processing === "processing"}
              onFiles={([selected]) => {
                setFile(selected);
                setResults([]);
                setError(null);
                setProcessing("ready");
                trackEvent("workflow_ready", { tool: "pdf-to-image" });
              }}
            />
            {file ? (
              <div className="pdf-merge-list-summary">
                <strong>{file.name}</strong>
                <button type="button" className="btn secondary file-btn" disabled={processing === "processing"} onClick={() => {
                  setFile(null);
                  setResults([]);
                  setError(null);
                  setProcessing("idle");
                }}>{t("fileInfo.clearAll")}</button>
              </div>
            ) : null}
          </>
        ),
        options: (
          <div className="tool-form">
            <button type="button" className="btn primary" disabled={!file || processing === "processing"} aria-busy={processing === "processing"} onClick={handleProcess}>
              {processing === "processing" ? t("button.processing") : t("tool.pdf-to-image.convert")}
            </button>
            {processing === "processing" && progressText ? <p role="status">{progressText}</p> : null}
          </div>
        ),
        result: (
          <>
            <p>{t("tool.pdf-to-image.ready", { count: results.length })}</p>
            <ul className="pdf-image-preview" aria-label={t("toolPage.result")}>
              {results.map((result, index) => <PagePreview key={result.fileName} result={result} page={index + 1} />)}
            </ul>
          </>
        ),
        nextActions: <>
          <DownloadCollectionButton results={results} fileName="pdf-pages.zip" />
          <Link className="btn secondary" to={localizePath("/image/compress", locale)}>{locale === "en" ? "Compress Images" : "壓縮圖片"}</Link>
          <Link className="btn secondary" to={localizePath("/image/resize", locale)}>{locale === "en" ? "Resize Images" : "調整圖片尺寸"}</Link>
          <Link className="btn secondary" to={localizePath("/image/convert", locale)}>{locale === "en" ? "Convert Image Format" : "轉換圖片格式"}</Link>
          <Link className="btn secondary" to={localizePath("/image/to-pdf", locale)}>{locale === "en" ? "Image to PDF" : "圖片轉 PDF"}</Link>
        </>,
        howItWorks,
        faq,
        relatedTools: getRelatedTools("pdf-to-image"),
      }}
    />
  );
}
