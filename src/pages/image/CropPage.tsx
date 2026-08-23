import { useCallback, useMemo, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ImageCropEditor } from "../../components/ImageCropEditor";
import { SizeComparison } from "../../components/SizeComparison";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { useSeo } from "../../hooks/useSeo";
import { cropImage } from "../../services/image/cropService";
import type {
  CropSettings,
  CropValidation,
  ImageCropEditorLabels,
  ImageCropResult,
} from "../../types/imageCrop";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";
import { validateFileSize, validateMime } from "../../utils/validation";
import { createDefaultCropSettings, validateCropShape } from "../../utils/imageCropGeometry";

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";
const FALLBACK_TOOL: ToolDefinition = {
  id: "image-crop",
  title: "Image Crop",
  description: "Crop images locally with a live preview.",
  path: "/image/crop",
  category: "Image",
};

export function ImageCropPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<CropSettings>(createDefaultCropSettings);
  const [validation, setValidation] = useState<CropValidation>({ valid: true });
  const [sourceStatus, setSourceStatus] = useState<"loading" | "ready" | "error">("loading");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<ImageCropResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "image-crop") ?? FALLBACK_TOOL;
  const title = t("tool.image-crop.title");
  const description = t("tool.image-crop.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/image/crop",
    h1: title,
  };
  useSeo(toolMeta);

  const sourceUrl = useBlobUrl(files[0]);
  const resultUrl = useBlobUrl(result?.blob);
  const relatedTools = getRelatedTools("image-crop");
  const isRectangle = settings.shape.kind === "rectangle";
  const canProcess = Boolean(
    files[0] && sourceStatus === "ready" && validation.valid && processing !== "processing"
  );

  const editorLabels = useMemo<ImageCropEditorLabels>(
    () => ({
      canvas: t("tool.image-crop.canvas"),
      presets: t("tool.image-crop.presets"),
      rectangle: t("tool.image-crop.rectangle"),
      circle: t("tool.image-crop.circle"),
      heart: t("tool.image-crop.heart"),
      star: t("tool.image-crop.star"),
      polygon: t("tool.image-crop.polygon"),
      freehand: t("tool.image-crop.freehand"),
      zoom: t("tool.image-crop.zoom"),
      undo: t("tool.image-crop.undo"),
      reset: t("tool.image-crop.reset"),
      closeShape: t("tool.image-crop.closeShape"),
      addPoint: t("tool.image-crop.addPoint"),
      point: t("tool.image-crop.point"),
      xCoordinate: t("tool.image-crop.xCoordinate"),
      yCoordinate: t("tool.image-crop.yCoordinate"),
      resizeShape: t("tool.image-crop.resizeShape"),
      notEnoughPoints: t("tool.image-crop.validation.notEnoughPoints"),
      closeShapeHint: t("tool.image-crop.validation.closeShape"),
      selfIntersection: t("tool.image-crop.validation.selfIntersection"),
      shapeTooSmall: t("tool.image-crop.validation.shapeTooSmall"),
      outsideImage: t("tool.image-crop.validation.outsideImage"),
    }),
    [t]
  );

  const howItWorks = useMemo(
    () => [
      t("tool.image-crop.how.0"),
      t("tool.image-crop.how.1"),
      t("tool.image-crop.how.2"),
      t("tool.image-crop.how.3"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      { q: t("tool.image-crop.faq.0.question"), a: t("tool.image-crop.faq.0.answer") },
      { q: t("tool.image-crop.faq.1.question"), a: t("tool.image-crop.faq.1.answer") },
    ],
    [t]
  );

  const handleFiles = (nextFiles: File[]): void => {
    setFiles(nextFiles.slice(0, 1));
    setSettings(createDefaultCropSettings());
    setValidation({ valid: true });
    setSourceStatus("loading");
    setResult(null);
    setError(null);
    setDecodeError(null);
    setProcessing("idle");
  };

  const clearSelection = (): void => {
    setFiles([]);
    setSettings(createDefaultCropSettings());
    setValidation({ valid: true });
    setSourceStatus("loading");
    setResult(null);
    setError(null);
    setDecodeError(null);
    setProcessing("idle");
  };

  const handleSourceStatus = useCallback(
    (status: "loading" | "ready" | "error") => {
      setSourceStatus(status);
      setDecodeError(status === "error" ? t("tool.image-crop.decodeError") : null);
    },
    [t]
  );

  const handleEditorChange = (next: CropSettings): void => {
    setSettings(next);
    setResult(null);
    setError(null);
    setProcessing("idle");
  };

  const handleProcess = async (): Promise<void> => {
    const source = files[0];
    if (!source || sourceStatus !== "ready") return;

    const mimeError = validateMime(source, ACCEPTED_IMAGE_TYPES);
    const sizeError = validateFileSize(source);
    const shapeValidation = validateCropShape(settings.shape);
    if (mimeError || sizeError || !shapeValidation.valid || !validation.valid) {
      setError(mimeError?.message ?? sizeError?.message ?? t("error.invalidFile"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "image-crop" });
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "image-crop" });
    try {
      const output = await cropImage(source, settings);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "image-crop" });
    } catch (caught) {
      console.error(caught);
      setError(t("tool.image-crop.processError"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "image-crop" });
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={toolMeta}
      breadcrumb={["Home", title]}
      layout="split"
      showIdleResult
      workflow={{ state: processing, error, onRetry: handleProcess, onReprocess: handleProcess }}
      children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropImage")}
              accept={ACCEPTED_IMAGE_TYPES}
              multiple={false}
              onFiles={handleFiles}
              compact={Boolean(files[0])}
              compactLabel={t("tool.image-crop.replaceImage")}
            />
            <FileInfo files={files} mode="single" onClear={clearSelection} compact={Boolean(files[0])} />
            {files[0] && sourceUrl ? (
              <ImageCropEditor
                sourceUrl={sourceUrl}
                fileName={files[0].name}
                value={settings}
                onChange={handleEditorChange}
                onValidationChange={setValidation}
                onSourceStatusChange={handleSourceStatus}
                labels={editorLabels}
              />
            ) : null}
            {files[0] && sourceStatus === "loading" ? (
              <p className="image-crop-page__decode-status" role="status">
                {t("tool.image-crop.decoding")}
              </p>
            ) : null}
            {decodeError ? <p className="error" role="alert">{decodeError}</p> : null}
            <div
              className="tool-form image-crop-page__options"
              role="group"
              aria-label={t("tool.image-crop.outputControls")}
            >
              <div className="image-crop-page__settings">
                {isRectangle ? (
                  <label className="image-crop-page__format">
                    {t("label.format")}
                    <select
                      value={settings.format}
                      onChange={(event) => {
                        handleEditorChange({
                          ...settings,
                          format: event.target.value as CropSettings["format"],
                        });
                      }}
                    >
                      <option value="jpeg">JPG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WebP</option>
                    </select>
                  </label>
                ) : (
                  <p className="image-crop-page__transparent-format">{t("tool.image-crop.transparentPng")}</p>
                )}
                {isRectangle && settings.format !== "png" ? (
                  <label className="image-crop-page__quality">
                    {t("label.quality")}: {Math.round(settings.quality * 100)}
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={Math.round(settings.quality * 100)}
                      onChange={(event) => {
                        handleEditorChange({ ...settings, quality: Number(event.target.value) / 100 });
                      }}
                    />
                  </label>
                ) : null}
                {isRectangle && settings.format === "jpeg" ? (
                  <p className="image-crop-page__format-note">{t("tool.image-crop.jpegFill")}</p>
                ) : null}
              </div>
              <button
                className="btn primary"
                type="button"
                disabled={!canProcess}
                aria-busy={processing === "processing"}
                onClick={handleProcess}
              >
                {processing === "processing" ? t("tool.image-crop.cropping") : t("tool.image-crop.crop")}
              </button>
            </div>
          </>
        ),
        options: null,
        result: (
          <>
            {result && resultUrl ? (
              <div className="image-crop-page__result-preview">
                <SizeComparison originalSize={files[0]?.size ?? 0} outputSize={result.size} />
                <p>{t("tool.image-crop.dimensions", { width: result.width, height: result.height })}</p>
                <img src={resultUrl} alt={t("tool.image-crop.resultPreview")} className="preview-image" />
              </div>
            ) : (
              <div className="image-crop-page__result-empty">
                <span className="image-crop-page__result-mark" aria-hidden="true">✂</span>
                <p>{t("tool.image-crop.emptyResult")}</p>
              </div>
            )}
            {result ? (
              <DownloadButton
                result={result}
                disabled={processing === "processing"}
                onDownloaded={() => trackEvent("download", { tool: "image-crop" })}
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
