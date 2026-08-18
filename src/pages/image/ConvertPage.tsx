import { useMemo, useState } from "react";
import { ProcessingState, ToolMeta, FileProcessResult } from "../../types/tool";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FILE_TOOLS } from "../../data/tools";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { convertImage } from "../../services/image/imageService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { validateFileSize, validateMime } from "../../utils/validation";
import { useLanguage } from "../../context/LanguageContext";
import { SizeComparison } from "../../components/SizeComparison";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function ImageConvertPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<"jpeg" | "png" | "webp">("png");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "image-convert");
  const title = t("tool.image-convert.title");
  const description = t("tool.image-convert.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/image/convert",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("image-convert");
  const previewUrl = useBlobUrl(result?.blob);

  const howItWorks = useMemo(
    () => [
      t("tool.image-convert.how.0"),
      t("tool.image-convert.how.1"),
      t("tool.image-convert.how.2"),
      t("tool.image-convert.how.3"),
    ],
    [t]
  );

  const faq = useMemo(
    () => [
      {
        q: t("tool.image-convert.faq.0.question"),
        a: t("tool.image-convert.faq.0.answer"),
      },
      {
        q: t("tool.image-convert.faq.1.question"),
        a: t("tool.image-convert.faq.1.answer"),
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
      trackEvent("process_failed", { tool: "image-convert" });
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "image-convert" });
    try {
      const output = await convertImage(source, { format });
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "image-convert" });
    } catch (err) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: "image-convert" });
      console.error(err);
    }
  };

  const clearSelection = (): void => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProcessing("idle");
  };

  return (
      <ToolPageTemplate
        tool={tool ?? FILE_TOOLS[0]}
        meta={toolMeta}
        breadcrumb={["Home", t("tool.image-convert.title")]}
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
              {t("label.targetFormat")}
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
                <SizeComparison originalSize={files[0]?.size ?? 0} outputSize={result.size} />
                <img src={previewUrl} alt={t("label.preview")} className="preview-image" />
              </div>
            ) : (
              <p>{t("label.noResult")}</p>
            )}
            <DownloadButton
              result={result}
              disabled={processing === "processing"}
              onDownloaded={() => trackEvent("download", { tool: "image-convert" })}
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
