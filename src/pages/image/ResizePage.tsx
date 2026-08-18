import { useMemo, useState } from "react";
import { ImageResizeOptions, ProcessingState, ToolMeta } from "../../types/tool";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FILE_TOOLS } from "../../data/tools";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { resizeImage } from "../../services/image/imageService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";
import type { FileProcessResult } from "../../types/tool";
import { SizeComparison } from "../../components/SizeComparison";

export function ImageResizePage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [quality, setQuality] = useState(90);
  const [format, setFormat] = useState<"jpeg" | "png" | "webp">("jpeg");

  const tool = FILE_TOOLS.find((item) => item.id === "image-resize");
  const title = t("tool.image-resize.title");
  const description = t("tool.image-resize.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/image/resize",
    h1: title,
  };
  useSeo(toolMeta);

  const previewUrl = useBlobUrl(result?.blob);
  const relatedTools = getRelatedTools("image-resize");

  const hasSelection = files.length > 0;

  const howItWorks = useMemo(
    () => [
      t("tool.image-resize.how.0"),
      t("tool.image-resize.how.1"),
      t("tool.image-resize.how.2"),
      t("tool.image-resize.how.3"),
    ],
    [t]
  );

  const faq = useMemo(
    () => [
      {
        q: t("tool.image-resize.faq.0.question"),
        a: t("tool.image-resize.faq.0.answer"),
      },
      {
        q: t("tool.image-resize.faq.1.question"),
        a: t("tool.image-resize.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleProcess = async () => {
    if (!hasSelection) {
      setError(t("error.selectOneFile", { type: t("label.fileType.image") }));
      return;
    }

    const source = files[0];
    const mimeError = validateMime(source, "image/jpeg,image/png,image/webp");
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? t("error.invalidFile"));
      trackEvent("process_failed", { tool: "image-resize" });
      setProcessing("error");
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "image-resize" });
    try {
      const options: ImageResizeOptions = {
        width: Number(width) || 0,
        height: Number(height) || 0,
        keepAspectRatio,
        quality: quality / 100,
        format,
      };

      const clearSelection = (): void => {
        setFiles([]);
        setResult(null);
        setError(null);
        setProcessing("idle");
      };
      const output = await resizeImage(source, options);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "image-resize" });
    } catch (err) {
      setProcessing("error");
      setError(t("error.processingFailed"));
      trackEvent("process_failed", { tool: "image-resize" });
      console.error(err);
    }
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.image-resize.title")]}
        children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropImage")}
              accept="image/jpeg,image/png,image/webp"
              onFiles={setFiles}
              multiple={false}
            />
            <FileInfo files={files} onClear={clearSelection} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              {t("label.width")}
              <input
                type="number"
                value={width}
                min={1}
                onChange={(event) => setWidth(event.target.value)}
              />
            </label>
            <label>
              {t("label.height")}
              <input
                type="number"
                value={height}
                min={1}
                onChange={(event) => setHeight(event.target.value)}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={keepAspectRatio}
                onChange={(event) => setKeepAspectRatio(event.target.checked)}
              />
              {t("label.keepAspectRatio")}
            </label>
            <label>
              {t("label.quality")}: {quality}
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
              />
            </label>
            <label>
              {t("label.format")}
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as "jpeg" | "png" | "webp")}
              >
                <option value="jpeg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </label>
            <button
              className="btn primary"
              type="button"
              disabled={processing === "processing"}
              aria-busy={processing === "processing"}
              onClick={handleProcess}
            >
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            {processing === "error" && error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {result ? (
              <div>
                <SizeComparison originalSize={files[0]?.size ?? 0} outputSize={result.size} />
                <img src={previewUrl} alt={t("label.preview")} className="preview-image" />
              </div>
            ) : (
              <p>{t("label.noResult")}</p>
            )}
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => trackEvent("download", { tool: "image-resize" })}
            />
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
