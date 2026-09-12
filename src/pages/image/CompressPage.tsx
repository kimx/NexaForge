import { useEffect, useMemo, useRef, useState } from "react";
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
import { compressImage, compressImageToTarget } from "../../services/image/imageService";
import { MAX_FILE_BYTES, runBatch, validateImageBatch, type BatchItem } from "../../services/batch/batchService";
import { getRelatedTools } from "../../utils/toolHelpers";
import { createOperationId, trackEvent } from "../../utils/analytics";
import type { ImageCompressOptions, ImageTargetCompressOptions, ProcessingState, ToolMeta } from "../../types/tool";
import { useSeoLanding } from "../../hooks/useSeoLanding";
import { usePersonalization } from "../../hooks/usePersonalization";
import { usePersonalizationCopy } from "../../i18n/personalization";
import { saveToolPreferences } from "../../services/personalization";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const TARGET_PRESETS = ["100", "300", "500", "custom"] as const;
type CompressionMode = "quality" | "target";
type TargetPreset = (typeof TARGET_PRESETS)[number];

export function ImageCompressPage(): JSX.Element {
  const { locale, t } = useLanguage();
  const landing = useSeoLanding();
  const presetFormat = landing?.definition.preset.outputFormat ?? "jpeg";
  const sourceFormat = landing?.definition.preset.sourceFormat;
  const imageAccept = sourceFormat === "jpeg"
    ? "image/jpeg,.jpg,.jpeg"
    : sourceFormat === "png"
      ? "image/png,.png"
      : IMAGE_ACCEPT;
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [completed, setCompleted] = useState(0);
  const [mode, setMode] = useState<CompressionMode>("quality");
  const { preferences } = usePersonalization();
  const personalCopy = usePersonalizationCopy();
  const quality = preferences.compress.quality;
  const [formatOverride, setFormatOverride] = useState<"jpeg" | "png" | "webp" | null>(null);
  const format = formatOverride !== null && formatOverride === preferences.compress.format
    ? formatOverride
    : landing ? presetFormat : preferences.compress.format;
  const setQuality = (value: number): void => saveToolPreferences({ ...preferences, compress: { format, quality: value } });
  const setFormat = (value: "jpeg" | "png" | "webp"): void => {
    setFormatOverride(landing ? value : null);
    saveToolPreferences({ ...preferences, compress: { format: value, quality } });
  };
  const [targetPreset, setTargetPreset] = useState<TargetPreset>("500");
  const [customTarget, setCustomTarget] = useState("");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectionValid, setSelectionValid] = useState(true);
  const operationRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const analyticsOperationRef = useRef<{ id: string; startedAt: number } | null>(null);
  const tool = FILE_TOOLS.find((item) => item.id === "image-compress") ?? FILE_TOOLS[0];
  const title = t("tool.image-compress.title");
  const meta: ToolMeta = {
    title: landing?.content.title ?? `${title} - ${t("header.title")}`,
    description: landing?.content.description ?? t("tool.image-compress.description"),
    canonical: landing?.definition.path ?? "/image/compress",
    h1: landing?.content.h1 ?? title,
  };
  useSeo(meta);
  const successes = items.flatMap((item) => item.status === "success" ? [item.result] : []);
  const singleResult = files.length === 1 ? successes[0] : undefined;
  const previewUrl = useBlobUrl(singleResult?.blob);
  const targetKb = targetPreset === "custom" ? Number(customTarget.trim()) : Number(targetPreset);
  const computedTargetBytes = targetKb * 1024;
  const targetError = mode === "target" && (!customTarget.trim() && targetPreset === "custom" || !Number.isFinite(targetKb) || !Number.isFinite(computedTargetBytes) || targetKb <= 0)
    ? t("image-compress.validation.target")
    : null;
  const targetBytes = targetError || mode !== "target" ? undefined : computedTargetBytes;
  const resizeAvailable = mode === "target" && items.some((item) => item.status === "success" && item.result.targetStatus === "resize-available");
  const failedCount = items.filter((item) => item.status === "error").length;
  const invalidateOperation = (): void => {
    operationRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  };
  const clearOutputs = (): void => { invalidateOperation(); setItems([]); setCompleted(0); setError(null); setProcessing("idle"); };
  const selectFiles = (next: File[]): void => { clearOutputs(); setFiles(next); const validation = validateImageBatch(next); setSelectionValid(!validation.length); if (validation[0]) { setError(validation[0].message); setProcessing("error"); } };
  const clearSelection = (): void => { clearOutputs(); setFiles([]); setSelectionValid(true); };
  useEffect(() => {
    // A change in another tab must invalidate results made with earlier choices.
    clearOutputs();
  }, [preferences.compress.format, preferences.compress.quality]);
  useEffect(() => {
    invalidateOperation();
    setFormatOverride(null);
    setFiles([]);
    setItems([]);
    setCompleted(0);
    setError(null);
    setProcessing("idle");
    setSelectionValid(true);
    return () => {
      invalidateOperation();
    };
  }, [landing?.definition.path, presetFormat]);
  const process = async (allowResize = false): Promise<void> => {
    if (!files.length || !selectionValid || targetError || (mode === "target" && targetBytes === undefined)) return;
    const operation = operationRef.current + 1; operationRef.current = operation;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const analyticsOperation = { id: createOperationId("image-compress"), startedAt: Date.now() };
    analyticsOperationRef.current = analyticsOperation;
    setItems([]); setCompleted(0); setError(null); setProcessing("processing");
    trackEvent("process_start", { tool: "image-compress", operationId: analyticsOperation.id, language: locale });
    try {
      const batch = await runBatch(
        files,
        (file, _index, signal) => mode === "target"
          ? compressImageToTarget(file, { targetBytes: targetBytes as number, format, allowResize, signal } satisfies ImageTargetCompressOptions)
          : compressImage(file, { quality: quality / 100, format, signal } satisfies ImageCompressOptions),
        { concurrency: 2, signal: controller.signal, onProgress: (done) => { if (operationRef.current === operation) setCompleted(done); } }
      );
      if (operationRef.current !== operation) return;
      setItems(batch.items);
      if (!batch.successful) {
        setError(t("error.processingFailed"));
        setProcessing("error");
        trackEvent("process_failed", {
          tool: "image-compress",
          operationId: analyticsOperation.id,
          durationMs: Date.now() - analyticsOperation.startedAt,
          errorCategory: "processing",
          language: locale,
        });
      } else {
        setProcessing("success");
        trackEvent("process_success", {
          tool: "image-compress",
          operationId: analyticsOperation.id,
          durationMs: Date.now() - analyticsOperation.startedAt,
          resultCount: batch.successful,
          language: locale,
        });
      }
    } catch (cause) {
      if (operationRef.current !== operation) return;
      setError(cause instanceof Error ? cause.message : t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", {
        tool: "image-compress",
        operationId: analyticsOperation.id,
        durationMs: Date.now() - analyticsOperation.startedAt,
        errorCategory: "processing",
        language: locale,
      });
    } finally {
      if (operationRef.current === operation) {
        abortControllerRef.current = null;
      }
    }
  };
  const cancelProcessing = (): void => {
    if (processing !== "processing") return;
    invalidateOperation();
    setItems([]);
    setCompleted(0);
    setError(null);
    setProcessing("idle");
  };
  const keepDimensions = (): void => {
    setItems((current) => current.map((item) => item.status === "success" && item.result.targetStatus === "resize-available"
      ? { ...item, result: { ...item.result, targetStatus: "unmet" } }
      : item));
  };
  const howItWorks = useMemo(() => [0, 1, 2, 3].map((index) => t(`tool.image-compress.how.${index}`)), [t]);
  const faq = useMemo(() => [0, 1].map((index) => ({ q: t(`tool.image-compress.faq.${index}.question`), a: t(`tool.image-compress.faq.${index}.answer`) })), [t]);
  const canProcess = files.length > 0 && selectionValid && !targetError && processing !== "processing";
  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]}
    workflow={{ state: processing, error, progress: files.length ? (completed / files.length) * 100 : 0, onRetry: process, onReprocess: process }} children={{
      workspace: <><FileDropzone label={t("label.dropImage")} accept={imageAccept} onFiles={selectFiles} onRejectedFiles={(rejections) => { setError(rejections[0]?.message ?? t("error.invalidFile")); setProcessing("error"); setSelectionValid(false); }} multiple maxSize={MAX_FILE_BYTES} compact={files.length > 0} /><FileInfo files={files} mode="multi" onClear={clearSelection} compact={files.length > 0} /></>,
      options: <div className="tool-form image-compress-options">
        <p className="personalization-hint">{personalCopy.saved}</p>
        <button type="button" className="btn secondary" onClick={() => {
          setFormatOverride(null);
          saveToolPreferences({ ...preferences, compress: { format: presetFormat, quality: 80 } });
          clearOutputs();
        }}>{personalCopy.reset}</button>
        <fieldset>
          <legend>{t("image-compress.mode")}</legend>
          <label className="checkbox"><input type="radio" name="compression-mode" value="quality" checked={mode === "quality"} onChange={() => { setMode("quality"); clearOutputs(); }} />{t("image-compress.mode.quality")}</label>
          <label className="checkbox"><input type="radio" name="compression-mode" value="target" checked={mode === "target"} onChange={() => { setMode("target"); clearOutputs(); }} />{t("image-compress.mode.target")}</label>
        </fieldset>
        <label>{t("label.outputFormat")}<select value={format} onChange={(event) => { setFormat(event.target.value as "jpeg" | "png" | "webp"); clearOutputs(); }}><option value="jpeg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></label>
        {mode === "quality" ? <label>{t("label.quality")}: {quality}<input type="range" min={1} max={100} value={quality} onChange={(event) => { setQuality(Number(event.target.value)); clearOutputs(); }} /></label> : <><label>{t("image-compress.targetSize")}<select value={targetPreset} onChange={(event) => { setTargetPreset(event.target.value as TargetPreset); clearOutputs(); }}><option value="100">100 KB</option><option value="300">300 KB</option><option value="500">500 KB</option><option value="custom">{t("image-compress.customTarget")}</option></select></label>{targetPreset === "custom" ? <label>{t("image-compress.customTarget")}<input type="number" min="0.01" step="any" value={customTarget} aria-invalid={Boolean(targetError)} onChange={(event) => { setCustomTarget(event.target.value); clearOutputs(); }} />{targetError ? <span className="error" role="alert">{targetError}</span> : null}</label> : null}<p className="image-compress-options__hint">{t("image-compress.targetHint")}</p></>}
        {processing === "processing" ? <><button type="button" className="btn primary" disabled aria-busy="true">{t("button.processing")}</button><button type="button" className="btn secondary" onClick={cancelProcessing}>{t("image-compress.cancel")}</button></> : <button type="button" className="btn primary" disabled={!canProcess} onClick={() => process()}>{t("button.process")}</button>}
      </div>,
      result: <>{items.length ? <><p>{t("batch.progress", { completed: items.length, total: files.length })}</p>{failedCount ? <p className="error" role="alert">{t("image-compress.partialFailure", { count: failedCount })}</p> : null}<BatchFileResults items={items} showImageDetails onDownloaded={() => trackEvent("download_triggered", { tool: "image-compress", operationId: analyticsOperationRef.current?.id, language: locale })} />{resizeAvailable ? <div className="image-compress-options__resize-prompt"><p>{t("image-compress.resizePrompt")}</p><div><button type="button" className="btn primary" onClick={() => process(true)}>{t("image-compress.resize")}</button><button type="button" className="btn secondary" onClick={keepDimensions}>{t("image-compress.keepDimensions")}</button></div></div> : null}{singleResult ? <SizeComparison originalSize={files[0]?.size ?? 0} outputSize={singleResult.size} /> : null}<DownloadCollectionButton results={successes} fileName="compressed-images.zip" disabled={processing === "processing"} onDownloaded={() => trackEvent("download_triggered", { tool: "image-compress", operationId: analyticsOperationRef.current?.id, language: locale })} />{singleResult ? <details className="result-preview-disclosure"><summary>{t("label.preview")}</summary><img src={previewUrl} alt={t("label.preview")} className="preview-image" /></details> : null}</> : <p>{t("label.noResult")}</p>}</>,
      howItWorks, faq, relatedTools: getRelatedTools("image-compress"),
    }} />;
}
