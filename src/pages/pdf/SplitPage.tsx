import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { getPdfPageCount, splitPdf } from "../../services/pdf/pdfService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";
import { downloadBlob } from "../../utils/download";

export function PdfSplitPage(): JSX.Element {
  const { t } = useLanguage();
  const [file, setFile] = useState<File[]>([]);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-split");
  const title = t("tool.pdf-split.title");
  const description = t("tool.pdf-split.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/pdf/split",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("pdf-split");
  const howItWorks = useMemo(
    () => [
      t("tool.pdf-split.how.0"),
      t("tool.pdf-split.how.1"),
      t("tool.pdf-split.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.pdf-split.faq.0.question"),
        a: t("tool.pdf-split.faq.0.answer"),
      },
      {
        q: t("tool.pdf-split.faq.1.question"),
        a: t("tool.pdf-split.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleFiles = (incoming: File[]): void => {
    setFile(incoming);
    setPageCount(null);
    setSelectedPages([]);
    setResult(null);
    setError(null);
    setProcessing("idle");
  };

  const validateSource = (): File | null => {
    if (!file[0]) {
      setError(t("error.selectOneFile", { type: t("label.fileType.pdf") }));
      return null;
    }
    const source = file[0];
    const sizeError = validateFileSize(source);
    const mimeError = validateMime(source, "application/pdf");
    if (sizeError || mimeError) {
      setError(sizeError?.message ?? mimeError?.message ?? t("error.invalidFile"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-split" });
      return null;
    }
    return source;
  };

  const handleProcess = async () => {
    const source = validateSource();
    if (!source) return;

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-split" });
    try {
      const totalPages = await getPdfPageCount(source);
      setPageCount(totalPages);
      setSelectedPages([]);
      setResult(null);
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-split" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-split" });
      console.error(err);
    }
  };

  const handleExport = async () => {
    const source = validateSource();
    if (!source || !selectedPages.length) {
      if (source && !selectedPages.length) {
        setError(t("tool.pdf-split.error.noPages"));
        setProcessing("error");
      }
      return;
    }

    setError(null);
    setProcessing("processing");
    try {
      const output = await splitPdf(source, selectedPages.map((page) => String(page + 1)).join(","));
      setResult(output);
      setProcessing("success");
      downloadBlob(output.blob, output.fileName);
      trackEvent("download", { tool: "pdf-split" });
      trackEvent("process_success", { tool: "pdf-split" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-split" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.pdf-split.title")]}
        children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropPdf")}
              accept="application/pdf"
              onFiles={handleFiles}
              multiple={false}
              compact={file.length > 0}
            />
            <FileInfo files={file} mode="single" compact={file.length > 0} />
          </>
        ),
        options: (
          <div className="tool-form">
            <button
              type="button"
              className="btn primary"
              onClick={handleProcess}
              disabled={!file.length || processing === "processing"}
              aria-busy={processing === "processing"}
            >
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
            {pageCount !== null && (
              <>
                <fieldset className="pdf-page-picker">
                  <legend className="pdf-page-picker__legend">
                    {t("tool.pdf-split.selectPages")}
                  </legend>
                  <div className="pdf-page-picker__header">
                    <div className="pdf-page-picker__status">
                      <p className="pdf-page-picker__total">
                        {t("tool.pdf-split.pageCount", { count: pageCount })}
                      </p>
                      <p className="pdf-page-picker__summary" aria-live="polite">
                        {t("tool.pdf-split.selectionSummary", {
                          selected: selectedPages.length,
                          count: pageCount,
                        })}
                      </p>
                    </div>
                    <div className="pdf-page-picker__actions">
                      <button
                        type="button"
                        className="pdf-page-picker__action"
                        onClick={() => setSelectedPages(Array.from({ length: pageCount }, (_, page) => page))}
                        disabled={selectedPages.length === pageCount}
                      >
                        {t("tool.pdf-split.selectAll")}
                      </button>
                      <button
                        type="button"
                        className="pdf-page-picker__action"
                        onClick={() => setSelectedPages([])}
                        disabled={!selectedPages.length}
                      >
                        {t("tool.pdf-split.clearSelection")}
                      </button>
                    </div>
                  </div>
                  <div className="pdf-page-picker__grid">
                    {Array.from({ length: pageCount }, (_, page) => (
                      <label
                        key={page}
                        className={`pdf-page-picker__page${selectedPages.includes(page) ? " pdf-page-picker__page--selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="pdf-page-picker__checkbox"
                          aria-label={String(page + 1)}
                          checked={selectedPages.includes(page)}
                          onChange={() =>
                            setSelectedPages((current) =>
                              current.includes(page)
                                ? current.filter((item) => item !== page)
                                : [...current, page].sort((a, b) => a - b)
                            )
                          }
                        />
                        <span>{page + 1}</span>
                        <span className="pdf-page-picker__check" aria-hidden="true">✓</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleExport}
                  disabled={processing === "processing" || !selectedPages.length}
                  aria-busy={processing === "processing"}
                >
                  {t("button.export")}
                </button>
              </>
            )}
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && <p role="alert" className="error">{error}</p>}
            {result ? (
              <p>{t("tool.pdf-split.label.outputSize", { size: (result.size / 1024).toFixed(2) })}</p>
            ) : (
              <p>{t("label.noResult")}</p>
            )}
            {result ? (
              <DownloadButton
                result={result}
                disabled={processing === "processing"}
                onDownloaded={() => trackEvent("download", { tool: "pdf-split" })}
              />
            ) : null}
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
