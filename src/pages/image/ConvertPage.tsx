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

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function ImageConvertPage(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<"jpeg" | "png" | "webp">("png");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "image-convert");
  const toolMeta: ToolMeta = {
    title: "Image Converter - NexaForge",
    description: "Convert JPG, PNG and WebP formats directly in the browser.",
    canonical: "/image/convert",
    h1: "Image Converter",
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("image-convert");
  const previewUrl = useBlobUrl(result?.blob);

  const howItWorks = useMemo(
    () => [
      "Upload a supported image.",
      "Pick output format.",
      "Process to convert format in-browser.",
      "Download converted result.",
    ],
    []
  );

  const faq = useMemo(
    () => [
      {
        q: "Can all conversions run offline?",
        a: "Yes. Files never leave your browser.",
      },
      {
        q: "Can I keep all image metadata?",
        a: "Not all metadata is preserved in this first phase.",
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
      setError("Unable to process this file.\nThe file may be corrupted or unsupported.");
      setProcessing("error");
      trackEvent("process_failed", { tool: "image-convert" });
      console.error(err);
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", tool?.title ?? "Image Converter"]}
      children={{
        workspace: (
          <>
            <FileDropzone
              label="Drop image here"
              accept={IMAGE_ACCEPT}
              onFiles={setFiles}
              multiple={false}
            />
            <FileInfo files={files} />
          </>
        ),
        options: (
          <div className="tool-form">
            <label>
              Target format
              <select value={format} onChange={(event) => setFormat(event.target.value as "jpeg" | "png" | "webp")}>
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
                <img src={previewUrl} alt="Converted preview" className="preview-image" />
              </div>
            ) : (
              <p>No result yet.</p>
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

