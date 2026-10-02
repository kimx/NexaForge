import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { fileWorkflowMessages } from "../../i18n/fileWorkflowMessages";
import { useStagedWorkflow } from "../../hooks/useStagedWorkflow";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { WorkflowShell } from "../../components/workflows/WorkflowShell";
import { WorkflowFileList } from "../../components/workflows/WorkflowFileList";
import { PdfStagePreview } from "../../components/workflows/WorkflowPreviews";
import { mergePdf } from "../../services/pdf/pdfService";
import { addPageNumbersToPdf, PDF_PAGE_NUMBER_FORMATS, type AddPageNumbersOptions, type PdfPageNumberFormat, type PdfPageNumberPosition } from "../../services/pdf/pageNumberService";
import { compressPdf, type PdfCompressionOptions, type PdfCompressionResult } from "../../services/pdf/compressService";
import { resultFile, checkWorkflowAbort } from "../../services/workflow/fileWorkflowService";
import type { FileProcessResult } from "../../types/tool";
import { formatFileSize } from "../../utils/fileSize";
import { trackEvent } from "../../utils/analytics";

const defaultNumbers: AddPageNumbersOptions = { startingNumber: 1, format: "{n} / {total}", position: "bottom-center", fontSize: 12 };

export function PdfDeliveryPage() {
  const { locale } = useLanguage(); const c = fileWorkflowMessages[locale];
  const flow = useStagedWorkflow<[FileProcessResult, FileProcessResult, PdfCompressionResult]>("pdf-delivery");
  const [files, setFiles] = useState<File[]>([]);
  const [numbers, setNumbers] = useState(defaultNumbers);
  const [mode, setMode] = useState<PdfCompressionOptions["mode"]>("preserve-text");
  const [quality, setQuality] = useState(70);
  const [dpi, setDpi] = useState(120);
  const validFiles = files.length > 0 && files.length <= 20 && files.every(file => file.size > 0 && file.size <= 100 * 1024 * 1024 && (file.type === "application/pdf" || /\.pdf$/i.test(file.name))) && files.reduce((sum, file) => sum + file.size, 0) <= 100 * 1024 * 1024;
  const validNumbers = Number.isInteger(numbers.startingNumber) && numbers.startingNumber! >= 0 && numbers.startingNumber! <= 1_000_000 && Number.isFinite(numbers.fontSize) && numbers.fontSize! >= 6 && numbers.fontSize! <= 72;
  const validCompression = mode === "preserve-text" || (quality >= 10 && quality <= 100 && dpi >= 72 && dpi <= 300);
  function select(next: File[]) { flow.invalidate(0); setFiles(next); }
  function changeNumbers(update: Partial<AddPageNumbersOptions>) { flow.invalidate(1); setNumbers(current => ({ ...current, ...update })); }
  function reset() { select([]); setNumbers(defaultNumbers); setMode("preserve-text"); setQuality(70); setDpi(120); }
  async function merge() {
    if (!validFiles) return;
    await flow.run(0, async signal => { checkWorkflowAbort(signal); const result = await mergePdf(files); checkWorkflowAbort(signal); return result; });
  }
  async function number() {
    const merged = flow.results[0]; if (!merged || !validNumbers) return;
    await flow.run(1, async signal => { checkWorkflowAbort(signal); const result = await addPageNumbersToPdf(resultFile(merged), numbers); checkWorkflowAbort(signal); return result; });
  }
  async function compress() {
    const numbered = flow.results[1]; if (!numbered || !validCompression) return;
    await flow.run(2, (signal, report) => compressPdf(resultFile(numbered), { mode, quality: quality / 100, dpi, signal, onProgress: (done, total) => report(total ? done / total * 100 : 0) }));
  }
  const preview = flow.step === 0 ? flow.results[0] : flow.step === 1 ? flow.results[1] ?? flow.results[0] : flow.results[2] ?? flow.results[1];
  return <WorkflowShell id="pdf-delivery" flow={flow} reset={reset} preview={preview ? <PdfStagePreview result={preview} /> : null}>
    {flow.step === 0 ? <fieldset disabled={flow.busy}>
      <FileDropzone label={c.selectPdfs} compact={Boolean(files.length)} compactLabel={c.replace} accept="application/pdf,.pdf" multiple maxSize={100 * 1024 * 1024} disabled={flow.busy} onFiles={select} />
      <p>PDF · 20 {locale === "en" ? "files" : "個檔案"} · 100 MiB</p><p>{c.order}</p>
      <WorkflowFileList files={files} disabled={flow.busy} onChange={select} />
      {files.length > 0 && !validFiles ? <p role="alert" className="error">{c.limits}</p> : null}
      <button type="button" className="btn primary" disabled={!validFiles} onClick={merge}>{c.merge}</button>
    </fieldset> : null}
    {flow.step === 1 ? <fieldset disabled={flow.busy}>
      <div className="file-workflow__fields"><label>{c.start}<input type="number" min={0} max={1_000_000} value={numbers.startingNumber} onChange={event => changeNumbers({ startingNumber: Number(event.target.value) })} /></label><label>{c.fontSize}<input type="number" min={6} max={72} value={numbers.fontSize} onChange={event => changeNumbers({ fontSize: Number(event.target.value) })} /></label></div>
      <label>{c.numberFormat}<select aria-label={c.numberFormat} value={numbers.format} onChange={event => changeNumbers({ format: event.target.value as PdfPageNumberFormat })}>{PDF_PAGE_NUMBER_FORMATS.map(format => <option key={format} value={format}>{format.replace("{n}", "1").replace("{total}", "10")}</option>)}</select></label>
      <label>{c.numberPosition}<select aria-label={c.numberPosition} value={numbers.position} onChange={event => changeNumbers({ position: event.target.value as PdfPageNumberPosition })}><option value="bottom-center">{c.bottomCenter}</option><option value="bottom-right">{c.bottomRight}</option><option value="top-center">{c.topCenter}</option><option value="top-left">{c.topLeft}</option></select></label>
      {!validNumbers ? <p role="alert" className="error">{c.invalid}</p> : null}<button type="button" className="btn primary" disabled={!validNumbers} onClick={number}>{c.numbers}</button>
    </fieldset> : null}
    {flow.step === 2 ? <fieldset disabled={flow.busy}>
      <label>{c.compressionMode}<select aria-label={c.compressionMode} value={mode} onChange={event => { flow.invalidate(2); setMode(event.target.value as PdfCompressionOptions["mode"]); }}><option value="preserve-text">{c.preserve}</option><option value="raster">{c.raster}</option></select></label>
      {mode === "raster" ? <><p>{c.rasterWarning}</p><div className="file-workflow__fields"><label>{c.quality}<input type="number" min={10} max={100} value={quality} onChange={event => { flow.invalidate(2); setQuality(Number(event.target.value)); }} /></label><label>{c.dpi}<input type="number" min={72} max={300} value={dpi} onChange={event => { flow.invalidate(2); setDpi(Number(event.target.value)); }} /></label></div></> : null}
      {!validCompression ? <p role="alert" className="error">{c.invalid}</p> : null}<button type="button" className="btn primary" disabled={!validCompression} onClick={compress}>{c.compress}</button>
      {flow.results[2] ? <p>{flow.results[2].status === "original-kept" ? c.kept : c.reduced}: {formatFileSize(flow.results[2].originalSize)} → {formatFileSize(flow.results[2].size)}</p> : null}
    </fieldset> : null}
    {flow.step === 3 ? <><p>{c.complete}</p>{flow.results[2]?.status === "original-kept" ? <p>{c.kept}</p> : null}<DownloadButton result={flow.results[2] ?? null} label={c.downloadPdf} onDownloaded={() => trackEvent("download", { tool: "pdf-delivery" })} /></> : null}
  </WorkflowShell>;
}
