import { useMemo, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { useSeo } from "../../hooks/useSeo";
import {
  addPageNumbersToPdf,
  PDF_PAGE_NUMBER_FORMATS,
  PDF_PAGE_NUMBER_POSITIONS,
  type PdfPageNumberFormat,
  type PdfPageNumberPosition,
} from "../../services/pdf/pageNumberService";
import { getPdfPageCount } from "../../services/pdf/pdfService";
import type { FileProcessResult, ProcessingState, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";
import { validateFileSize, validateMime } from "../../utils/validation";

const POSITION_TRANSLATION_KEYS: Record<PdfPageNumberPosition, string> = {
  "top-left": "tool.pdf-add-page-numbers.position.topLeft",
  "top-center": "tool.pdf-add-page-numbers.position.topCenter",
  "top-right": "tool.pdf-add-page-numbers.position.topRight",
  "bottom-left": "tool.pdf-add-page-numbers.position.bottomLeft",
  "bottom-center": "tool.pdf-add-page-numbers.position.bottomCenter",
  "bottom-right": "tool.pdf-add-page-numbers.position.bottomRight",
};

export function AddPageNumbersPage(): JSX.Element {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [position, setPosition] = useState<PdfPageNumberPosition>("bottom-center");
  const [startingNumber, setStartingNumber] = useState("1");
  const [rangeMode, setRangeMode] = useState<"all" | "custom">("all");
  const [pageRanges, setPageRanges] = useState("");
  const [format, setFormat] = useState<PdfPageNumberFormat>("{n}");
  const [fontSize, setFontSize] = useState("12");
  const [color, setColor] = useState("#222222");
  const [margin, setMargin] = useState("24");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useBlobUrl(file);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-add-page-numbers") ?? FILE_TOOLS[0];
  const title = t("tool.pdf-add-page-numbers.title");
  const description = t("tool.pdf-add-page-numbers.description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/pdf/add-page-numbers",
    h1: title,
  };
  useSeo(meta);

  const howItWorks = useMemo(
    () => [0, 1, 2, 3].map((index) => t(`tool.pdf-add-page-numbers.how.${index}`)),
    [t]
  );
  const faq = useMemo(
    () => [0, 1, 2].map((index) => ({
      q: t(`tool.pdf-add-page-numbers.faq.${index}.question`),
      a: t(`tool.pdf-add-page-numbers.faq.${index}.answer`),
    })),
    [t]
  );

  const handleFiles = async (incoming: File[]): Promise<void> => {
    const selected = incoming[0];
    if (!selected) return;

    const validation = validateFileSize(selected) ?? validateMime(selected, "application/pdf");
    if (validation) {
      setError(validation.message);
      setProcessing("error");
      return;
    }

    setFile(selected);
    setPageCount(null);
    setResult(null);
    setError(null);
    setProcessing("processing");
    trackEvent("workflow_ready", { tool: "pdf-add-page-numbers" });

    try {
      const count = await getPdfPageCount(selected);
      setPageCount(count);
      setProcessing("ready");
    } catch (cause) {
      console.error(cause);
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-add-page-numbers" });
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (!file || pageCount === null) {
      setError(t("error.selectOneFile", { type: t("label.fileType.pdf") }));
      return;
    }
    if (rangeMode === "custom" && !pageRanges.trim()) {
      setError(t("tool.pdf-add-page-numbers.error.rangeRequired"));
      setProcessing("error");
      return;
    }

    setError(null);
    setResult(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-add-page-numbers" });
    try {
      const output = await addPageNumbersToPdf(file, {
        position,
        startingNumber: Number(startingNumber),
        pageRanges: rangeMode === "custom" ? pageRanges : undefined,
        format,
        fontSize: Number(fontSize),
        color,
        margin: Number(margin),
      });
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-add-page-numbers" });
    } catch (cause) {
      console.error(cause);
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-add-page-numbers" });
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{
        state: processing,
        error,
        onRetry: handleGenerate,
        onReprocess: handleGenerate,
      }}
      children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropPdf")}
              accept="application/pdf,.pdf"
              multiple={false}
              compact={Boolean(file)}
              disabled={processing === "processing"}
              onFiles={(incoming) => void handleFiles(incoming)}
            />
            <FileInfo files={file ? [file] : []} mode="single" compact={Boolean(file)} />
            <div className="pdf-page-number-preview">
              {previewUrl ? (
                <object data={previewUrl} type="application/pdf" aria-label={t("tool.pdf-add-page-numbers.preview")}>
                  <p>{t("tool.pdf-add-page-numbers.previewUnavailable")}</p>
                </object>
              ) : (
                <p>{t("tool.pdf-add-page-numbers.previewEmpty")}</p>
              )}
            </div>
            {pageCount !== null ? (
              <p className="pdf-page-number-page-count" aria-live="polite">
                {t("tool.pdf-add-page-numbers.pageCount", { count: pageCount })}
              </p>
            ) : null}
          </>
        ),
        options: (
          <div className="tool-form pdf-page-number-settings">
            <label>
              {t("tool.pdf-add-page-numbers.position")}
              <select value={position} onChange={(event) => setPosition(event.target.value as PdfPageNumberPosition)}>
                {PDF_PAGE_NUMBER_POSITIONS.map((value) => (
                  <option key={value} value={value}>{t(POSITION_TRANSLATION_KEYS[value])}</option>
                ))}
              </select>
            </label>
            <label>
              {t("tool.pdf-add-page-numbers.startingNumber")}
              <input
                type="number"
                min="0"
                step="1"
                value={startingNumber}
                onChange={(event) => setStartingNumber(event.target.value)}
              />
            </label>
            <fieldset>
              <legend>{t("tool.pdf-add-page-numbers.pages")}</legend>
              <label className="checkbox">
                <input
                  type="radio"
                  name="page-number-range"
                  checked={rangeMode === "all"}
                  onChange={() => setRangeMode("all")}
                />
                {t("tool.pdf-add-page-numbers.allPages")}
              </label>
              <label className="checkbox">
                <input
                  type="radio"
                  name="page-number-range"
                  checked={rangeMode === "custom"}
                  onChange={() => setRangeMode("custom")}
                />
                {t("tool.pdf-add-page-numbers.customRange")}
              </label>
              {rangeMode === "custom" ? (
                <input
                  aria-label={t("tool.pdf-add-page-numbers.customRange")}
                  placeholder={t("tool.pdf-add-page-numbers.rangePlaceholder")}
                  value={pageRanges}
                  onChange={(event) => setPageRanges(event.target.value)}
                />
              ) : null}
            </fieldset>
            <label>
              {t("tool.pdf-add-page-numbers.format")}
              <select value={format} onChange={(event) => setFormat(event.target.value as PdfPageNumberFormat)}>
                {PDF_PAGE_NUMBER_FORMATS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>
              {t("tool.pdf-add-page-numbers.fontSize")}
              <input type="number" min="1" max="72" step="1" value={fontSize} onChange={(event) => setFontSize(event.target.value)} />
            </label>
            <label>
              {t("tool.pdf-add-page-numbers.color")}
              <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
            </label>
            <label>
              {t("tool.pdf-add-page-numbers.margin")}
              <input type="number" min="0" max="200" step="1" value={margin} onChange={(event) => setMargin(event.target.value)} />
            </label>
            <button
              type="button"
              className="btn primary"
              disabled={!file || pageCount === null || processing === "processing"}
              aria-busy={processing === "processing"}
              onClick={() => void handleGenerate()}
            >
              {processing === "processing" ? t("button.processing") : t("tool.pdf-add-page-numbers.generate")}
            </button>
          </div>
        ),
        result: result ? (
          <>
            <p>{t("tool.pdf-add-page-numbers.resultReady", { size: (result.size / 1024).toFixed(2) })}</p>
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              label={t("tool.pdf-add-page-numbers.download")}
              onDownloaded={() => trackEvent("download", { tool: "pdf-add-page-numbers" })}
            />
          </>
        ) : <p>{t("tool.pdf-add-page-numbers.resultEmpty")}</p>,
        howItWorks,
        faq,
        relatedTools: getRelatedTools("pdf-add-page-numbers"),
      }}
    />
  );
}
