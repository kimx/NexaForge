import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { fileWorkflowMessages } from "../../i18n/fileWorkflowMessages";
import { useStagedWorkflow } from "../../hooks/useStagedWorkflow";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { WorkflowShell } from "../../components/workflows/WorkflowShell";
import { WorkflowFileList } from "../../components/workflows/WorkflowFileList";
import { ImageStagePreview } from "../../components/workflows/WorkflowPreviews";
import { resizeImage } from "../../services/image/imageService";
import { applyWatermark, getPresetPosition, type WatermarkPreset } from "../../services/image/watermarkService";
import { createZip } from "../../services/file/zipService";
import { processWorkflowFiles, resultFile, checkWorkflowAbort } from "../../services/workflow/fileWorkflowService";
import { validateImageBatch } from "../../services/batch/batchService";
import type { FileProcessResult, ImageResizeOptions } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";

const defaults: ImageResizeOptions = { width: 1200, height: 1200, keepAspectRatio: true, quality: .9, format: "jpeg" };

export function ImageDeliveryPage() {
  const { locale } = useLanguage(); const c = fileWorkflowMessages[locale];
  const flow = useStagedWorkflow<[FileProcessResult[], FileProcessResult[], FileProcessResult]>("image-delivery");
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState(defaults);
  const [text, setText] = useState("");
  const [position, setPosition] = useState<WatermarkPreset>("bottom-right");
  const [opacity, setOpacity] = useState(60);
  const [size, setSize] = useState(5);
  const [color, setColor] = useState("#ffffff");
  const validFiles = files.length > 0 && !validateImageBatch(files).length;
  const validResize = [options.width, options.height].every(value => Number.isInteger(value) && value >= 1 && value <= 4096) && options.quality >= .1 && options.quality <= 1;
  const validWatermark = text.trim().length > 0 && opacity >= 5 && opacity <= 100 && size >= 1 && size <= 50;
  function select(next: File[]) { flow.invalidate(0); setFiles(next); }
  function change(update: Partial<ImageResizeOptions>) { flow.invalidate(0); setOptions(current => ({ ...current, ...update })); }
  function reset() {
    select([]); setOptions(defaults); setText(""); setPosition("bottom-right"); setOpacity(60); setSize(5); setColor("#ffffff");
  }
  async function resize() {
    if (!validFiles || !validResize) return;
    await flow.run(0, async (signal, report) => processWorkflowFiles(files, async file => {
      // Check the actual aspect-ratio dimensions before allocating a canvas.
      const bitmap = await createImageBitmap(file);
      try {
        const width = options.width;
        const height = options.keepAspectRatio ? Math.max(1, Math.round(width * bitmap.height / bitmap.width)) : options.height;
        if (width > 8192 || height > 8192 || width * height > 16_000_000) throw new Error("Image dimensions exceed workflow limits");
      } finally { bitmap.close(); }
      checkWorkflowAbort(signal);
      return resizeImage(file, options);
    }, signal, report));
  }
  async function watermark() {
    const resized = flow.results[0]; if (!resized || !validWatermark) return;
    await flow.run(1, (signal, report) => processWorkflowFiles(resized.map(resultFile), file => applyWatermark(file, {
      mode: "text", text, position: getPresetPosition(position), opacity: opacity / 100, rotation: 0,
      fontFamily: "sans-serif", color, sizeRatio: size / 100,
    }), signal, report));
  }
  async function zip() {
    const watermarked = flow.results[1]; if (!watermarked) return;
    await flow.run(2, async signal => { checkWorkflowAbort(signal); const result = await createZip(watermarked, "images-delivery.zip"); checkWorkflowAbort(signal); return result; });
  }
  const preview = flow.step === 0 ? flow.results[0] : flow.results[1] ?? flow.results[0];
  return <WorkflowShell id="image-delivery" flow={flow} reset={reset} preview={preview ? <>{preview.map((result, index) => <ImageStagePreview key={index} result={result} />)}</> : null}>
    {flow.step === 0 ? <fieldset disabled={flow.busy}>
      <FileDropzone label={c.selectImages} compact={Boolean(files.length)} compactLabel={c.replace} accept="image/jpeg,image/png,image/webp" multiple maxSize={50 * 1024 * 1024} disabled={flow.busy} onFiles={select} />
      <p>JPG / PNG / WebP · 20 {locale === "en" ? "files" : "個檔案"} · 200 MiB</p>
      <WorkflowFileList files={files} disabled={flow.busy} onChange={select} />
      {files.length > 0 && !validFiles ? <p role="alert" className="error">{c.limits}</p> : null}
      <div className="file-workflow__fields"><label>{c.width}<input type="number" min={1} max={4096} value={options.width} onChange={event => change({ width: Number(event.target.value) })} /></label><label>{c.height}<input type="number" min={1} max={4096} disabled={options.keepAspectRatio} value={options.height} onChange={event => change({ height: Number(event.target.value) })} /></label></div>
      <label><input type="checkbox" checked={options.keepAspectRatio} onChange={event => change({ keepAspectRatio: event.target.checked })} />{c.aspect}</label>
      <div className="file-workflow__fields"><label>{c.format}<select aria-label={c.format} value={options.format} onChange={event => change({ format: event.target.value as ImageResizeOptions["format"] })}><option value="jpeg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></label>
        <label>{c.quality}<input type="number" min={10} max={100} value={Math.round(options.quality * 100)} onChange={event => change({ quality: Number(event.target.value) / 100 })} /></label></div>
      {!validResize ? <p className="error" role="alert">{c.invalid}</p> : null}
      <button type="button" className="btn primary" disabled={!validFiles || !validResize} onClick={resize}>{c.resize}</button>
    </fieldset> : null}
    {flow.step === 1 ? <fieldset disabled={flow.busy}>
      <label>{c.text}<input value={text} maxLength={200} onChange={event => { flow.invalidate(1); setText(event.target.value); }} /></label>
      <label>{c.position}<select aria-label={c.position} value={position} onChange={event => { flow.invalidate(1); setPosition(event.target.value as WatermarkPreset); }}><option value="top-left">{c.topLeft}</option><option value="center">{c.center}</option><option value="bottom-right">{c.bottomRight}</option></select></label>
      <div className="file-workflow__fields"><label>{c.opacity}<input type="number" min={5} max={100} value={opacity} onChange={event => { flow.invalidate(1); setOpacity(Number(event.target.value)); }} /></label><label>{c.size}<input type="number" min={1} max={50} value={size} onChange={event => { flow.invalidate(1); setSize(Number(event.target.value)); }} /></label></div>
      <label>{c.color}<input type="color" value={color} onChange={event => { flow.invalidate(1); setColor(event.target.value); }} /></label>
      <button type="button" className="btn primary" disabled={!validWatermark} onClick={watermark}>{c.watermark}</button>
    </fieldset> : null}
    {flow.step === 2 ? <><p>{c.outputCount}: {flow.results[1]?.length}</p><p>{c.zipHint}</p><button type="button" className="btn primary" disabled={flow.busy} onClick={zip}>{c.zip}</button></> : null}
    {flow.step === 3 ? <><p>{c.complete} · {c.outputCount}: {flow.results[1]?.length}</p><DownloadButton result={flow.results[2] ?? null} label={c.downloadZip} onDownloaded={() => trackEvent("download", { tool: "image-delivery" })} /></> : null}
  </WorkflowShell>;
}
