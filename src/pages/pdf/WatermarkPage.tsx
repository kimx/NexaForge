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
  addWatermarkToPdf,
  PDF_WATERMARK_POSITIONS,
  type PdfWatermarkMode,
  type PdfWatermarkOptions,
  type PdfWatermarkPosition,
  validatePdfWatermarkOptions,
} from "../../services/pdf/watermarkService";
import { getPdfPageCount } from "../../services/pdf/pdfService";
import type { FileProcessResult, ProcessingState, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";
import { validateFileSize, validateMime } from "../../utils/validation";

const POSITION_TRANSLATION_KEYS: Record<PdfWatermarkPosition, string> = {
  "top-left": "tool.pdf-watermark.position.topLeft",
  "top-center": "tool.pdf-watermark.position.topCenter",
  "top-right": "tool.pdf-watermark.position.topRight",
  "center-left": "tool.pdf-watermark.position.centerLeft",
  center: "tool.pdf-watermark.position.center",
  "center-right": "tool.pdf-watermark.position.centerRight",
  "bottom-left": "tool.pdf-watermark.position.bottomLeft",
  "bottom-center": "tool.pdf-watermark.position.bottomCenter",
  "bottom-right": "tool.pdf-watermark.position.bottomRight",
};

const IMAGE_ACCEPT = "image/png,image/jpeg,.png,.jpg,.jpeg";

export function WatermarkPage(): JSX.Element {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [mode, setMode] = useState<PdfWatermarkMode>("text");
  const [text, setText] = useState("Confidential");
  const [fontSize, setFontSize] = useState("48");
  const [color, setColor] = useState("#222222");
  const [opacity, setOpacity] = useState(35);
  const [scale, setScale] = useState(25);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState<PdfWatermarkPosition>("center");
  const [rangeMode, setRangeMode] = useState<"all" | "custom">("all");
  const [pageRanges, setPageRanges] = useState("");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "pdf-watermark") ?? FILE_TOOLS[0];
  const title = t("tool.pdf-watermark.title");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description: t("tool.pdf-watermark.description"),
    canonical: "/pdf/watermark",
    h1: title,
  };
  useSeo(meta);

  const options: PdfWatermarkOptions = mode === "text"
    ? {
        mode,
        text,
        fontSize: Number(fontSize),
        color,
        opacity: opacity / 100,
        rotation,
        position,
        pageRanges: rangeMode === "custom" ? pageRanges : undefined,
      }
    : {
        mode,
        image: image ?? undefined,
        scale: scale / 100,
        opacity: opacity / 100,
        rotation,
        position,
        pageRanges: rangeMode === "custom" ? pageRanges : undefined,
      };
  const validation = validatePdfWatermarkOptions(options);
  const hasRangeError = rangeMode === "custom" && !pageRanges.trim();
  const canGenerate =
    Boolean(file) &&
    pageCount !== null &&
    validation.length === 0 &&
    !hasRangeError &&
    processing !== "processing";
  const previewUrl = useBlobUrl(result?.blob ?? file);

  const howItWorks = useMemo(
    () => [0, 1, 2, 3].map((index) => t(`tool.pdf-watermark.how.${index}`)),
    [t]
  );
  const faq = useMemo(
    () => [0, 1, 2, 3].map((index) => ({
      q: t(`tool.pdf-watermark.faq.${index}.question`),
      a: t(`tool.pdf-watermark.faq.${index}.answer`),
    })),
    [t]
  );

  const clearResult = (): void => {
    setResult(null);
    setError(null);
    if (processing !== "processing") {
      setProcessing(file ? "ready" : "idle");
    }
  };

  const handlePdf = async (incoming: File[]): Promise<void> => {
    const selected = incoming[0];
    if (!selected) return;
    const validationError = validateFileSize(selected) ?? validateMime(selected, "application/pdf");
    if (validationError) {
      setError(validationError.message);
      setProcessing("error");
      return;
    }

    setFile(selected);
    setPageCount(null);
    setResult(null);
    setError(null);
    setProcessing("processing");
    trackEvent("workflow_ready", { tool: "pdf-watermark" });
    try {
      setPageCount(await getPdfPageCount(selected));
      setProcessing("ready");
    } catch (cause) {
      console.error(cause);
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-watermark" });
    }
  };

  const handleImage = (incoming: File[]): void => {
    const selected = incoming[0];
    if (!selected) return;
    setImage(selected);
    clearResult();
  };

  const handleGenerate = async (): Promise<void> => {
    if (!file || pageCount === null) {
      setError(t("error.selectOneFile", { type: t("label.fileType.pdf") }));
      return;
    }
    if (hasRangeError) {
      setError(t("tool.pdf-watermark.error.rangeRequired"));
      setProcessing("error");
      return;
    }
    if (validation.length > 0) {
      setError(validation[0]);
      setProcessing("error");
      return;
    }

    setError(null);
    setResult(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "pdf-watermark" });
    try {
      const output = await addWatermarkToPdf(file, options);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "pdf-watermark" });
    } catch (cause) {
      console.error(cause);
      setError(t("tool.pdf-watermark.error.processing"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "pdf-watermark" });
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
              label={t("tool.pdf-watermark.drop")}
              accept="application/pdf,.pdf"
              multiple={false}
              compact={Boolean(file)}
              disabled={processing === "processing"}
              onFiles={(incoming) => void handlePdf(incoming)}
            />
            <FileInfo files={file ? [file] : []} mode="single" compact={Boolean(file)} />
            <div className="pdf-watermark-preview">
              {previewUrl ? (
                <object data={previewUrl} type="application/pdf" aria-label={t("tool.pdf-watermark.preview")}>
                  <p>{t("tool.pdf-watermark.previewUnavailable")}</p>
                </object>
              ) : (
                <p>{t("tool.pdf-watermark.previewEmpty")}</p>
              )}
            </div>
            {pageCount !== null ? (
              <p className="pdf-watermark-page-count" aria-live="polite">
                {t("tool.pdf-watermark.pageCount", { count: pageCount })}
              </p>
            ) : null}
          </>
        ),
        options: (
          <div className="tool-form pdf-watermark-settings">
            <div className="pdf-watermark-tabs" role="tablist" aria-label={t("tool.pdf-watermark.type")}>
              {(["text", "image"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab}
                  className={mode === tab ? "is-active" : undefined}
                  onClick={() => {
                    setMode(tab);
                    clearResult();
                  }}
                >
                  {t(`tool.pdf-watermark.type.${tab}`)}
                </button>
              ))}
            </div>

            {mode === "text" ? (
              <>
                <label>
                  {t("tool.pdf-watermark.text")}
                  <input value={text} onChange={(event) => { setText(event.target.value); clearResult(); }} />
                </label>
                <label>
                  {t("tool.pdf-watermark.fontSize")}
                  <input type="number" min="1" max="256" step="1" value={fontSize} onChange={(event) => { setFontSize(event.target.value); clearResult(); }} />
                </label>
                <label>
                  {t("tool.pdf-watermark.color")}
                  <input type="color" value={color} onChange={(event) => { setColor(event.target.value); clearResult(); }} />
                </label>
              </>
            ) : (
              <div className="pdf-watermark-image-control">
                <FileDropzone
                  label={t("tool.pdf-watermark.image")}
                  accept={IMAGE_ACCEPT}
                  maxSize={20 * 1024 * 1024}
                  compact={Boolean(image)}
                  onFiles={handleImage}
                  onRejectedFiles={(rejections) => {
                    setError(rejections[0]?.message ?? t("tool.pdf-watermark.error.image"));
                    setProcessing("error");
                  }}
                />
                <FileInfo
                  files={image ? [image] : []}
                  mode="single"
                  compact={Boolean(image)}
                  onClear={() => { setImage(null); clearResult(); }}
                />
              </div>
            )}

            {mode === "image" ? (
              <label htmlFor="pdf-watermark-scale">
                <span className="pdf-watermark-control-label">
                  <span>{t("tool.pdf-watermark.scale")}</span>
                  <output>{scale}%</output>
                </span>
                <input id="pdf-watermark-scale" type="range" min="1" max="100" value={scale} onChange={(event) => { setScale(Number(event.target.value)); clearResult(); }} />
              </label>
            ) : null}
            <label htmlFor="pdf-watermark-opacity">
              <span className="pdf-watermark-control-label">
                <span>{t("tool.pdf-watermark.opacity")}</span>
                <output>{opacity}%</output>
              </span>
              <input id="pdf-watermark-opacity" type="range" min="0" max="100" value={opacity} onChange={(event) => { setOpacity(Number(event.target.value)); clearResult(); }} />
            </label>
            <label htmlFor="pdf-watermark-rotation">
              <span className="pdf-watermark-control-label">
                <span>{t("tool.pdf-watermark.rotation")}</span>
                <output>{rotation}°</output>
              </span>
              <input id="pdf-watermark-rotation" type="range" min="-180" max="180" value={rotation} onChange={(event) => { setRotation(Number(event.target.value)); clearResult(); }} />
            </label>
            <label>
              {t("tool.pdf-watermark.position")}
              <select value={position} onChange={(event) => { setPosition(event.target.value as PdfWatermarkPosition); clearResult(); }}>
                {PDF_WATERMARK_POSITIONS.map((value) => (
                  <option key={value} value={value}>{t(POSITION_TRANSLATION_KEYS[value])}</option>
                ))}
              </select>
            </label>
            <fieldset className="pdf-watermark-pages">
              <legend>{t("tool.pdf-watermark.pages")}</legend>
              <label className="checkbox">
                <input type="radio" name="pdf-watermark-range" checked={rangeMode === "all"} onChange={() => { setRangeMode("all"); clearResult(); }} />
                {t("tool.pdf-watermark.allPages")}
              </label>
              <label className="checkbox">
                <input type="radio" name="pdf-watermark-range" checked={rangeMode === "custom"} onChange={() => { setRangeMode("custom"); clearResult(); }} />
                {t("tool.pdf-watermark.customPages")}
              </label>
              {rangeMode === "custom" ? (
                <input
                  aria-label={t("tool.pdf-watermark.customPages")}
                  placeholder={t("tool.pdf-watermark.rangePlaceholder")}
                  value={pageRanges}
                  onChange={(event) => { setPageRanges(event.target.value); clearResult(); }}
                />
              ) : null}
            </fieldset>
            {validation.length > 0 ? <p className="error" role="alert">{validation[0]}</p> : null}
            {hasRangeError ? <p className="error" role="alert">{t("tool.pdf-watermark.error.rangeRequired")}</p> : null}
            <button
              type="button"
              className="btn primary"
              disabled={!canGenerate}
              aria-busy={processing === "processing"}
              onClick={() => void handleGenerate()}
            >
              {processing === "processing" ? t("tool.pdf-watermark.applying") : t("tool.pdf-watermark.apply")}
            </button>
          </div>
        ),
        result: result ? (
          <>
            <p>{t("tool.pdf-watermark.resultReady", { size: (result.size / 1024).toFixed(2) })}</p>
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              label={t("tool.pdf-watermark.download")}
              onDownloaded={() => trackEvent("download", { tool: "pdf-watermark" })}
            />
          </>
        ) : <p>{t("tool.pdf-watermark.resultEmpty")}</p>,
        howItWorks,
        faq,
        relatedTools: getRelatedTools("pdf-watermark"),
      }}
    />
  );
}

export const PdfWatermarkPage = WatermarkPage;
