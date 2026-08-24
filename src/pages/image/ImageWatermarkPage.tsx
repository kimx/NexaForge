import { useMemo, useRef, useState } from "react";
import { BatchFileResults } from "../../components/BatchFileResults";
import { DownloadCollectionButton } from "../../components/DownloadCollectionButton";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { WatermarkEditor, type WatermarkEditorLabels } from "../../components/WatermarkEditor";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { runBatch, type BatchItem } from "../../services/batch/batchService";
import {
  applyWatermark,
  type WatermarkOptions,
  type WatermarkPosition,
  type WatermarkPreset,
  validateWatermarkOptions,
} from "../../services/image/watermarkService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

const WATERMARK_ACCEPT = "image/jpeg,image/png,image/webp";
const WATERMARK_MAX_BYTES = 20 * 1024 * 1024;
const WATERMARK_MAX_FILES = 20;
const DEFAULT_POSITION: WatermarkPosition = { x: 0.94, y: 0.94 };
const PRESETS: WatermarkPreset[] = [
  "top-left", "top-center", "top-right",
  "middle-left", "center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
];

function isSupportedImage(file: File): boolean {
  return file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
}

export function ImageWatermarkPage(): JSX.Element {
  const { t } = useLanguage();
  const fallback: ToolDefinition = {
    id: "image-watermark",
    title: "Image Watermark",
    description: "Add a text or logo watermark to images locally.",
    path: "/image/watermark",
    category: "Image",
  };
  const tool = FILE_TOOLS.find((item) => item.id === "image-watermark") ?? fallback;
  const title = t("tool.image-watermark.title");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description: t("tool.image-watermark.description"),
    canonical: "/image/watermark",
    h1: title,
  };
  useSeo(meta);

  const [files, setFiles] = useState<File[]>([]);
  const [selectionValid, setSelectionValid] = useState(true);
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("© NexaForge");
  const [fontFamily, setFontFamily] = useState("Arial, sans-serif");
  const [color, setColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(8);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoWidth, setLogoWidth] = useState(20);
  const [opacity, setOpacity] = useState(70);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState<WatermarkPosition>(DEFAULT_POSITION);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [completed, setCompleted] = useState(0);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const operationRef = useRef(0);

  const clearOutputs = (): void => {
    operationRef.current += 1;
    setItems([]);
    setCompleted(0);
    setProcessing("idle");
    setError(null);
  };

  const activeOptions: WatermarkOptions | null = mode === "text"
    ? {
        mode: "text", text, fontFamily, color, sizeRatio: textSize / 100,
        opacity: opacity / 100, rotation, position,
      }
    : logo
      ? {
          mode: "image", logo, widthRatio: logoWidth / 100,
          opacity: opacity / 100, rotation, position,
        }
      : null;

  const activeValidation = activeOptions ? validateWatermarkOptions(activeOptions) : [t("tool.image-watermark.error.logo")];
  const successes = items.flatMap((item) => item.status === "success" ? [item.result] : []);
  const canProcess = files.length > 0 && selectionValid && activeValidation.length === 0 && processing !== "processing";

  const editorLabels = useMemo<WatermarkEditorLabels>(() => ({
    preview: t("tool.image-watermark.preview"),
    loading: t("tool.image-watermark.preview.loading"),
    error: t("tool.image-watermark.preview.error"),
    position: t("tool.image-watermark.position"),
    horizontal: t("tool.image-watermark.position.x"),
    vertical: t("tool.image-watermark.position.y"),
    positions: Object.fromEntries(PRESETS.map((preset) => [preset, t(`tool.image-watermark.position.${preset}`)])) as Record<WatermarkPreset, string>,
  }), [t]);

  const selectSources = (next: File[]): void => {
    const candidates = files.length ? [...files, ...next] : next;
    clearOutputs();
    if (candidates.length > WATERMARK_MAX_FILES) {
      setSelectionValid(false);
      setError(t("tool.image-watermark.error.count"));
      setProcessing("error");
      return;
    }
    const invalid = candidates.find((file) => !isSupportedImage(file) || file.size > WATERMARK_MAX_BYTES);
    if (invalid) {
      setSelectionValid(false);
      setError(!isSupportedImage(invalid)
        ? t("tool.image-watermark.error.type", { name: invalid.name })
        : t("tool.image-watermark.error.size", { name: invalid.name }));
      setProcessing("error");
      return;
    }
    setFiles(candidates);
    setSelectionValid(true);
  };

  const process = async (): Promise<void> => {
    if (!canProcess || !activeOptions) return;
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    const snapshot = activeOptions;
    setItems([]);
    setCompleted(0);
    setError(null);
    setProcessing("processing");
    const batch = await runBatch(files, (file) => applyWatermark(file, snapshot), {
      concurrency: 2,
      onProgress: (done) => {
        if (operationRef.current === operation) setCompleted(done);
      },
    });
    if (operationRef.current !== operation) return;
    setItems(batch.items);
    if (batch.successful > 0) {
      setProcessing("success");
    } else {
      setError(t("tool.image-watermark.error.processing"));
      setProcessing("error");
    }
  };

  const setPositionAndClear = (next: WatermarkPosition): void => {
    setPosition(next);
    clearOutputs();
  };

  const preview = files[0] && activeOptions ? (
    <WatermarkEditor
      source={files[0]}
      options={activeOptions}
      labels={editorLabels}
      onPositionChange={setPositionAndClear}
    />
  ) : null;

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      layout="split"
      workflow={{
        state: processing,
        error,
        progress: files.length ? completed / files.length * 100 : 0,
        onRetry: process,
        onReprocess: process,
      }}
      children={{
        workspace: (
          <>
            <FileDropzone
              label={t("tool.image-watermark.drop")}
              accept={WATERMARK_ACCEPT}
              multiple
              maxSize={WATERMARK_MAX_BYTES}
              onFiles={selectSources}
              onRejectedFiles={(rejections) => {
                clearOutputs();
                setSelectionValid(false);
                setError(rejections[0]?.reason === "size exceeds"
                  ? t("tool.image-watermark.error.size", { name: rejections[0]?.fileName ?? "" })
                  : t("tool.image-watermark.error.type", { name: rejections[0]?.fileName ?? "" }));
                setProcessing("error");
              }}
              compact={files.length > 0}
            />
            <FileInfo
              files={files}
              mode="multi"
              compact={files.length > 0}
              onClear={() => {
                clearOutputs();
                setFiles([]);
                setSelectionValid(true);
              }}
            />
            {preview}
          </>
        ),
        options: (
          <div className="tool-form watermark-options">
            <fieldset>
              <legend>{t("tool.image-watermark.mode")}</legend>
              <label className="radio">
                <input
                  type="radio"
                  name="watermark-mode"
                  checked={mode === "text"}
                  onChange={() => { setMode("text"); clearOutputs(); }}
                />
                {t("tool.image-watermark.mode.text")}
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="watermark-mode"
                  checked={mode === "image"}
                  onChange={() => { setMode("image"); clearOutputs(); }}
                />
                {t("tool.image-watermark.mode.image")}
              </label>
            </fieldset>
            {mode === "text" ? (
              <>
                <label>
                  {t("tool.image-watermark.text")}
                  <input value={text} onChange={(event) => { setText(event.currentTarget.value); clearOutputs(); }} />
                </label>
                <label>
                  {t("tool.image-watermark.font")}
                  <select value={fontFamily} onChange={(event) => { setFontFamily(event.currentTarget.value); clearOutputs(); }}>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Courier New, monospace">Courier New</option>
                  </select>
                </label>
                <label>
                  {t("tool.image-watermark.color")}
                  <input type="color" value={color} onChange={(event) => { setColor(event.currentTarget.value); clearOutputs(); }} />
                </label>
                <label>
                  {t("tool.image-watermark.size")}: {textSize}%
                  <input type="range" min="1" max="50" value={textSize} onChange={(event) => { setTextSize(Number(event.currentTarget.value)); clearOutputs(); }} />
                </label>
              </>
            ) : (
              <>
                <FileDropzone
                  label={t("tool.image-watermark.logo")}
                  accept={WATERMARK_ACCEPT}
                  maxSize={WATERMARK_MAX_BYTES}
                  onFiles={(next) => { setLogo(next[0] ?? null); clearOutputs(); }}
                  onRejectedFiles={(rejections) => setError(rejections[0]?.message ?? t("tool.image-watermark.error.logo"))}
                  compact={Boolean(logo)}
                />
                <FileInfo files={logo ? [logo] : []} mode="single" compact={Boolean(logo)} onClear={() => { setLogo(null); clearOutputs(); }} />
                <label>
                  {t("tool.image-watermark.logoWidth")}: {logoWidth}%
                  <input type="range" min="1" max="100" value={logoWidth} onChange={(event) => { setLogoWidth(Number(event.currentTarget.value)); clearOutputs(); }} />
                </label>
              </>
            )}
            <label>
              {t("tool.image-watermark.opacity")}: {opacity}%
              <input type="range" min="5" max="100" value={opacity} onChange={(event) => { setOpacity(Number(event.currentTarget.value)); clearOutputs(); }} />
            </label>
            <label>
              {t("tool.image-watermark.rotation")}: {rotation}°
              <input type="range" min="-180" max="180" value={rotation} onChange={(event) => { setRotation(Number(event.currentTarget.value)); clearOutputs(); }} />
            </label>
            {mode === "text" && !text.trim() ? <p className="error" role="alert">{t("tool.image-watermark.error.text")}</p> : null}
            {mode === "image" && !logo ? <p className="error" role="alert">{t("tool.image-watermark.error.logo")}</p> : null}
            <button
              type="button"
              className="btn primary"
              disabled={!canProcess}
              aria-busy={processing === "processing"}
              onClick={process}
            >
              {processing === "processing" ? t("tool.image-watermark.applying") : t("tool.image-watermark.apply")}
            </button>
          </div>
        ),
        result: items.length ? (
          <>
            <p role="status">{t("tool.image-watermark.progress", { completed, total: files.length })}</p>
            <BatchFileResults items={items} />
            <DownloadCollectionButton
              results={successes}
              fileName="watermarked-images.zip"
              disabled={processing === "processing"}
            />
          </>
        ) : <p>{t("tool.image-watermark.empty")}</p>,
        howItWorks: [0, 1, 2].map((index) => t(`tool.image-watermark.how.${index}`)),
        faq: [0, 1].map((index) => ({
          q: t(`tool.image-watermark.faq.${index}.question`),
          a: t(`tool.image-watermark.faq.${index}.answer`),
        })),
        relatedTools: getRelatedTools("image-watermark"),
      }}
    />
  );
}
