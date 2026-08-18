import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FILE_TOOLS } from "../../data/tools";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { compressImage } from "../../services/image/imageService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";
import { SizeComparison } from "../../components/SizeComparison";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function ImageCompressPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<"jpeg" | "png" | "webp">("jpeg");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);

  const tool = FILE_TOOLS.find((item) => item.id === "image-compress");
  const title = t("tool.image-compress.title");
  const description = t("tool.image-compress.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/image/compress",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("image-compress");
  const previewUrl = useBlobUrl(result?.blob);

  const howItWorks = useMemo(
    () => [
      t("tool.image-compress.how.0"),
      t("tool.image-compress.how.1"),
      t("tool.image-compress.how.2"),
      t("tool.image-compress.how.3"),
    ],
    [t]
  );

  const faq = useMemo(
    () => [
      {
        q: t("tool.image-compress.faq.0.question"),
        a: t("tool.image-compress.faq.0.answer"),
      },
      {
        q: t("tool.image-compress.faq.1.question"),
        a: t("tool.image-compress.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleProcess = async () => {
    if (!files[0]) {
      setError(t("error.selectOneFile", { type: t("label.fileType.image") }));
      return;
    }
    const source = files[0];
    const mimeError = validateMime(source, IMAGE_ACCEPT);
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? t("error.invalidFile"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "image-compress" });
      return;
    }

    setOriginalSize(source.size);
    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "image-compress" });
    try {
      const output = await compressImage(source, {
        quality: quality / 100,
        format,
      });
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "image-compress" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "image-compress" });
      console.error(err);
    }
  };

  const clearSelection = (): void => {
    setFiles([]);
    setResult(null);
    setOriginalSize(0);
    setError(null);
    setProcessing("idle");
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.image-compress.title")]}
        children={{
        workspace: (
          <>
            <FileDropzone
              label={t("label.dropImage")}
              accept={IMAGE_ACCEPT}
              onFiles={setFiles}
              multiple={false}
            />
            <FileInfo files={files} onClear={clearSelection} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              {t("label.outputFormat")}
              <select value={format} onChange={(event) => setFormat(event.target.value as "jpeg" | "png" | "webp")}>
                <option value="jpeg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
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
            <button
              type="button"
              className="btn primary"
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
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {result ? (
              <div>
                <SizeComparison originalSize={originalSize} outputSize={result.size} />
                <img src={previewUrl} alt={t("label.preview")} className="preview-image" />
              </div>
            ) : (
              <p>{t("label.noResult")}</p>
            )}
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => trackEvent("download", { tool: "image-compress" })}
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
