import { useMemo, useRef, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { BatchFileResults } from "../../components/BatchFileResults";
import { DownloadCollectionButton } from "../../components/DownloadCollectionButton";
import { SizeComparison } from "../../components/SizeComparison";
import { FILE_TOOLS } from "../../data/tools";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { useLanguage } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import { resizeImage } from "../../services/image/imageService";
import { MAX_FILE_BYTES, runBatch, validateImageBatch, type BatchItem } from "../../services/batch/batchService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import type { ImageResizeOptions, ProcessingState, ToolMeta } from "../../types/tool";

export function ImageResizePage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [completed, setCompleted] = useState(0);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectionValid, setSelectionValid] = useState(true);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [quality, setQuality] = useState(90);
  const [format, setFormat] = useState<"jpeg" | "png" | "webp">("jpeg");
  const operationRef = useRef(0);
  const tool = FILE_TOOLS.find((item) => item.id === "image-resize") ?? FILE_TOOLS[0];
  const title = t("tool.image-resize.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.image-resize.description"), canonical: "/image/resize", h1: title };
  useSeo(meta);
  const successes = items.flatMap((item) => item.status === "success" ? [item.result] : []);
  const singleResult = files.length === 1 ? successes[0] : undefined;
  const previewUrl = useBlobUrl(singleResult?.blob);
  const clearOutputs = (): void => { operationRef.current += 1; setItems([]); setCompleted(0); setError(null); setProcessing("idle"); };
  const selectFiles = (next: File[]): void => { clearOutputs(); setFiles(next); const validation = validateImageBatch(next); setSelectionValid(!validation.length); if (validation[0]) { setError(validation[0].message); setProcessing("error"); } };
  const clearSelection = (): void => { clearOutputs(); setFiles([]); setSelectionValid(true); };
  const rejectFiles = (message?: string): void => { setError(message ?? t("error.invalidFile")); setProcessing("error"); setSelectionValid(false); };
  const process = async (): Promise<void> => {
    if (!files.length || !selectionValid) return;
    const operation = operationRef.current + 1; operationRef.current = operation;
    setItems([]); setCompleted(0); setError(null); setProcessing("processing");
    const options: ImageResizeOptions = { width: Number(width) || 0, height: Number(height) || 0, keepAspectRatio, quality: quality / 100, format };
    trackEvent("process_start", { tool: "image-resize" });
    const batch = await runBatch(files, (file) => resizeImage(file, options), { concurrency: 2, onProgress: (done) => { if (operationRef.current === operation) setCompleted(done); } });
    if (operationRef.current !== operation) return;
    setItems(batch.items);
    if (!batch.successful) { setError(t("error.processingFailed")); setProcessing("error"); trackEvent("process_failed", { tool: "image-resize" }); }
    else { setProcessing("success"); trackEvent("process_success", { tool: "image-resize" }); }
  };
  const howItWorks = useMemo(() => [0, 1, 2, 3].map((index) => t(`tool.image-resize.how.${index}`)), [t]);
  const faq = useMemo(() => [0, 1].map((index) => ({ q: t(`tool.image-resize.faq.${index}.question`), a: t(`tool.image-resize.faq.${index}.answer`) })), [t]);
  const canProcess = files.length > 0 && selectionValid && processing !== "processing";
  const optionsHint = files.length > 0 ? t("tool.image-resize.how.1") : t("tool.image-resize.how.0");
  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]}
    workflow={{ state: processing, error, progress: files.length ? (completed / files.length) * 100 : 0, onRetry: process, onReprocess: process }} children={{
      workspace: <><FileDropzone label={t("label.dropImage")} accept="image/jpeg,image/png,image/webp" onFiles={selectFiles} onRejectedFiles={(rejections) => rejectFiles(rejections[0]?.message)} multiple maxSize={MAX_FILE_BYTES} compact={files.length > 0} /><FileInfo files={files} mode="multi" onClear={clearSelection} compact={files.length > 0} /></>,
      options: <div className="tool-form issue23-form image-resize-options">
        <p className="image-resize-options__hint" id="image-resize-options-hint">{optionsHint}</p>
        <div className="issue23-form__grid image-resize-options__dimensions">
          <label>{t("label.width")}<input type="number" value={width} min={1} aria-describedby="image-resize-options-hint" onChange={(event) => { setWidth(event.target.value); clearOutputs(); }} /></label>
          <label>{t("label.height")}<input type="number" value={height} min={1} aria-describedby="image-resize-options-hint" onChange={(event) => { setHeight(event.target.value); clearOutputs(); }} /></label>
        </div>
        <div className="image-resize-options__quality-row">
          <label className="checkbox image-resize-options__checkbox">
            <input type="checkbox" checked={keepAspectRatio} onChange={(event) => { setKeepAspectRatio(event.target.checked); clearOutputs(); }} />{t("label.keepAspectRatio")}
          </label>
          <label className="image-resize-options__quality">{t("label.quality")} <output>{quality}</output>
            <input type="range" min={1} max={100} value={quality} onChange={(event) => { setQuality(Number(event.target.value)); clearOutputs(); }} />
          </label>
        </div>
        <label>{t("label.format")}<select value={format} onChange={(event) => { setFormat(event.target.value as "jpeg" | "png" | "webp"); clearOutputs(); }}><option value="jpeg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></label>
        <button className="btn primary image-resize-options__action" type="button" disabled={!canProcess} aria-busy={processing === "processing"} onClick={process}>
          {processing === "processing" ? t("button.processing") : t("button.process")}
        </button>
      </div>,
      result: <>{items.length ? <><p>{t("batch.progress", { completed: items.length, total: files.length })}</p><BatchFileResults items={items} />{singleResult ? <><SizeComparison originalSize={files[0]?.size ?? 0} outputSize={singleResult.size} /><img src={previewUrl} alt={t("label.preview")} className="preview-image" /></> : null}<DownloadCollectionButton results={successes} fileName="resized-images.zip" disabled={processing === "processing"} /></> : <p>{t("label.noResult")}</p>}</>,
      howItWorks, faq, relatedTools: getRelatedTools("image-resize"),
    }} />;
}
