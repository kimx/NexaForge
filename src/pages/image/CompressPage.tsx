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

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function ImageCompressPage(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<"jpeg" | "png" | "webp">("jpeg");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);

  const tool = FILE_TOOLS.find((item) => item.id === "image-compress");
  const toolMeta: ToolMeta = {
    title: "Image Compress - NexaForge",
    description: "Compress image files entirely in browser with quality control.",
    canonical: "/image/compress",
    h1: "Image Compress",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("image-compress");
  const previewUrl = useBlobUrl(result?.blob);
  const ratio = result && originalSize > 0 ? ((result.size / originalSize) * 100).toFixed(2) : "0";

  const howItWorks = useMemo(
    () => [
      "Pick an image file.",
      "Adjust quality to reduce size.",
      "Run processing to compress and compare original / output.",
      "Download the compressed output.",
    ],
    []
  );

  const faq = useMemo(
    () => [
      {
        q: "Can I keep transparency?",
        a: "PNG/WebP outputs can keep transparency better than JPG.",
      },
      {
        q: "Are files uploaded?",
        a: "No. All processing is local.",
      },
    ],
    []
  );

  const handleProcess = async () => {
    if (!files[0]) {
      setError("Please select one image file.");
      return;
    }
    const source = files[0];
    const mimeError = validateMime(source, IMAGE_ACCEPT);
    const sizeError = validateFileSize(source);
    if (mimeError || sizeError) {
      setError(mimeError?.message ?? sizeError?.message ?? "Invalid file.");
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
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "image-compress" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "Image Compress"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop image here"
              accept={IMAGE_ACCEPT}
              onFiles={(selected) => {
                setFiles(selected);
              }}
              multiple={false}
            />
            <FileInfo files={files} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              Output Format
              <select value={format} onChange={(event) => setFormat(event.target.value as "jpeg" | "png" | "webp")}>
                <option value="jpeg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
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
            <button
              type="button"
              className="btn primary"
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
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {result ? (
              <div>
                <p>Original Size: {(originalSize / 1024).toFixed(2)} KB</p>
                <p>Output Size: {(result.size / 1024).toFixed(2)} KB</p>
                <p>Compression Ratio: {ratio}%</p>
                <img src={previewUrl} alt="Compressed preview" className="preview-image" />
              </div>
            ) : (
              <p>No result yet.</p>
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

