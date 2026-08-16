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
import type { FileProcessResult } from "../../types/tool";

export function ImageResizePage(): JSX.Element {
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
  const toolMeta: ToolMeta = {
    title: "Image Resize - NexaForge",
    description: "Resize JPG, PNG, and WebP files directly in your browser.",
    canonical: "/image/resize",
    h1: "Image Resize",
  };
  useSeo(toolMeta);

  const previewUrl = useBlobUrl(result?.blob);
  const relatedTools = getRelatedTools("image-resize");

  const hasSelection = files.length > 0;

  const howItWorks = useMemo(
    () => [
      "Drop your JPG, PNG or WebP file.",
      "Set your output width, height and quality.",
      "Click Process to create a resized image in your browser.",
      "Download the result as JPG, PNG, or WebP.",
    ],
    []
  );

  const faq = useMemo(
    () => [
      {
        q: "Do images upload to any server?",
        a: "No. Processing stays completely inside your browser.",
      },
      {
        q: "What happens with memory usage?",
        a: "We release image objects after processing and revoke object URLs on replace/unmount.",
      },
    ],
    []
  );

  const handleProcess = async () => {
    if (!hasSelection) {
      setError("Please select one image file.");
      return;
    }

    const source = files[0];
    const mimeError = validateMime(source, "image/jpeg,image/png,image/webp");
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? "Invalid file.");
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
      const output = await resizeImage(source, options);
      setResult(output);
      setProcessing("success");
      trackEvent("process_success", { tool: "image-resize" });
    } catch (err) {
      setProcessing("error");
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      trackEvent("process_failed", { tool: "image-resize" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "Image Resize"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop image here"
              accept="image/jpeg,image/png,image/webp"
              onFiles={setFiles}
              multiple={false}
            />
            <FileInfo files={files} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              Width
              <input
                type="number"
                value={width}
                min={1}
                onChange={(event) => setWidth(event.target.value)}
              />
            </label>
            <label>
              Height
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
              Keep Aspect Ratio
            </label>
            <label>
              Quality: {quality}
              <input
                type="range"
                min={1}
                max={100}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
              />
            </label>
            <label>
              Format
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
              {processing === "processing" ? "Processing..." : "Process"}
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
                <p>Size: {(result.size / 1024).toFixed(2)} KB</p>
                <img src={previewUrl} alt="Resized preview" className="preview-image" />
              </div>
            ) : (
              <p>Run processing to preview output.</p>
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

