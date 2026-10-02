import { useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { fileWorkflowMessages } from "../../i18n/fileWorkflowMessages";
import { useStagedWorkflow } from "../../hooks/useStagedWorkflow";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { FileDropzone } from "../../components/FileDropzone";
import { DocumentScanEditor } from "../../components/DocumentScanEditor";
import { DownloadButton } from "../../components/DownloadButton";
import { WorkflowShell } from "../../components/workflows/WorkflowShell";
import { ImageStagePreview } from "../../components/workflows/WorkflowPreviews";
import { DEFAULT_DOCUMENT_CORNERS, DOCUMENT_IMAGE_TYPES, DOCUMENT_MAX_BYTES, scanDocument, validateDocumentCorners, type DocumentCorners, type DocumentMode } from "../../services/image/documentScanService";
import { createOcrTextFile, type OcrLanguage, type OcrResult } from "../../services/ocr/ocrService";
import { recognizeWorkflowDocument, resultFile } from "../../services/workflow/fileWorkflowService";
import { cleanText, type TextCleanerOptions } from "../../services/text/textWorkflowService";
import type { FileProcessResult } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";

const defaultCleanup: TextCleanerOptions = { trimLines: true, collapseSpaces: true, removeEmptyLines: false, normalizeLineEndings: true };
type CleanedDocument = FileProcessResult & { text: string };

export function DocumentTextPage() {
  const { locale } = useLanguage(); const c = fileWorkflowMessages[locale];
  const flow = useStagedWorkflow<[FileProcessResult, OcrResult, CleanedDocument]>("document-text");
  const [file, setFile] = useState<File | null>(null);
  const [corners, setCorners] = useState<DocumentCorners>(DEFAULT_DOCUMENT_CORNERS);
  const [mode, setMode] = useState<DocumentMode>("color");
  const [ready, setReady] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const [language, setLanguage] = useState<OcrLanguage>("chi_tra");
  const [text, setText] = useState("");
  const [cleanup, setCleanup] = useState(defaultCleanup);
  const cleaned = flow.results[2]?.text ?? "";
  const [copyStatus, setCopyStatus] = useState("");
  const sourceUrl = useBlobUrl(file);
  useEffect(() => { if (flow.results[1]) setText(flow.results[1].text); }, [flow.results[1]]);
  useEffect(() => { setCopyStatus(""); }, [cleaned]);
  function select(files: File[]) {
    flow.invalidate(0); setFile(files[0] ?? null); setCorners(DEFAULT_DOCUMENT_CORNERS); setReady(false); setSourceError(false); setText(""); setCopyStatus("");
  }
  function reset() { select([]); setMode("color"); setLanguage("chi_tra"); setCleanup(defaultCleanup); }
  async function scan() {
    if (!file || !ready || !validateDocumentCorners(corners)) return;
    await flow.run(0, signal => scanDocument(file, corners, mode, signal));
  }
  async function recognize() {
    const scanResult = flow.results[0]; if (!scanResult) return;
    await flow.run(1, (signal, report) => recognizeWorkflowDocument(resultFile(scanResult), language, signal, report));
  }
  async function clean() {
    if (!flow.results[1]) return;
    await flow.run(2, async () => {
      const result = cleanText(text, cleanup).text;
      return { ...createOcrTextFile(result, file?.name ?? "document"), text: result };
    });
  }
  async function copy() {
    try { await navigator.clipboard.writeText(cleaned); setCopyStatus(c.copied); trackEvent("copy_success", { tool: "document-text" }); }
    catch { setCopyStatus(c.copyFailed); }
  }
  const scanned = flow.results[0];
  const preview = flow.step === 0 ? (scanned ? <ImageStagePreview result={scanned} /> : null)
    : flow.step === 1 ? <>{scanned ? <ImageStagePreview result={scanned} /> : null}{flow.results[1] ? <label>{c.originalText}<textarea aria-label={c.originalText} readOnly value={flow.results[1].text} /></label> : null}</>
    : flow.results[2] ? <label>{c.cleaned}<textarea aria-label={c.cleaned} readOnly value={cleaned} /></label> : <label>{c.originalText}<textarea aria-label={c.originalText} readOnly value={flow.results[1]?.text ?? ""} /></label>;
  return <WorkflowShell id="document-text" flow={flow} reset={reset} preview={preview}>
    {flow.step === 0 ? <fieldset disabled={flow.busy}>
      <FileDropzone label={c.selectPhoto} accept={DOCUMENT_IMAGE_TYPES} capture="environment" maxSize={DOCUMENT_MAX_BYTES} disabled={flow.busy} onFiles={select} />
      <FileDropzone label={c.savedPhoto} compact compactLabel={c.savedPhoto} accept={DOCUMENT_IMAGE_TYPES} maxSize={DOCUMENT_MAX_BYTES} disabled={flow.busy} onFiles={select} />
      {file ? <p>{file.name}</p> : null}
      {file && sourceUrl ? <><p>{c.corners}</p><DocumentScanEditor key={sourceUrl} sourceUrl={sourceUrl} value={corners} disabled={flow.busy || !ready} onReady={() => { setReady(true); setSourceError(false); }} onError={() => { flow.invalidate(0); setReady(false); setSourceError(true); }} onChange={next => { flow.invalidate(0); setCorners(next); }} /></> : null}
      {file && !ready && !sourceError ? <p role="status">{c.decoding}</p> : null}
      {sourceError ? <p role="alert" className="error">{c.decodeError}</p> : null}
      {!validateDocumentCorners(corners) ? <p role="alert" className="error">{c.geometry}</p> : null}
      <label>{c.mode}<select aria-label={c.mode} value={mode} onChange={event => { flow.invalidate(0); setMode(event.target.value as DocumentMode); }}><option value="color">{c.colorMode}</option><option value="grayscale">{c.gray}</option><option value="contrast">{c.contrast}</option></select></label>
      <button type="button" className="btn primary" disabled={!file || !ready || !validateDocumentCorners(corners)} onClick={scan}>{c.scan}</button>
    </fieldset> : null}
    {flow.step === 1 ? <fieldset disabled={flow.busy}><p>{c.models}</p><label>{c.language}<select aria-label={c.language} value={language} onChange={event => { flow.invalidate(1); setLanguage(event.target.value as OcrLanguage); }}><option value="chi_tra">{c.traditional}</option><option value="eng">{c.english}</option><option value="chi_tra+eng">{c.bilingual}</option></select></label><button type="button" className="btn primary" onClick={recognize}>{c.recognize}</button><p>{c.review}</p></fieldset> : null}
    {flow.step === 2 ? <fieldset disabled={flow.busy}>
      <p>{c.review}</p>{!text.trim() ? <p role="status">{c.noText}</p> : null}
      <label>{c.recognized}<textarea aria-label={c.recognized} value={text} onChange={event => { flow.invalidate(2); setText(event.target.value); }} /></label>
      {([["trimLines", c.trim], ["collapseSpaces", c.spaces], ["removeEmptyLines", c.blanks]] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(cleanup[key])} onChange={event => { flow.invalidate(2); setCleanup(current => ({ ...current, [key]: event.target.checked })); }} />{label}</label>)}
      <button type="button" className="btn primary" onClick={clean}>{c.clean}</button>
    </fieldset> : null}
    {flow.step === 3 ? <><p>{c.complete}</p><DownloadButton result={flow.results[2] ?? null} label={c.downloadText} onDownloaded={() => trackEvent("download", { tool: "document-text" })} /><div className="file-workflow__actions"><button type="button" className="btn secondary" onClick={copy}>{c.copy}</button></div>{copyStatus ? <p role="status">{copyStatus}</p> : null}</> : null}
  </WorkflowShell>;
}
