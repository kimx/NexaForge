import { useEffect, useRef, useState } from "react";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { DocumentScanEditor, type DocumentScanEditorProps } from "../../components/DocumentScanEditor";
import { documentScanMessages } from "../../components/documentScanMessages";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { useSeo } from "../../hooks/useSeo";
import { DEFAULT_DOCUMENT_CORNERS, DOCUMENT_IMAGE_TYPES, DOCUMENT_MAX_BYTES, DocumentScanError, createDocumentPdf, scanDocument, validateDocumentCorners, type DocumentCorners, type DocumentMode } from "../../services/image/documentScanService";
import type { FileProcessResult, ProcessingState, ToolDefinition } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";

// A new selection mounts a fresh URL hook, so an earlier photo cannot report ready
// while the new selection's object URL is still being created.
function DocumentScanSource({ file, ...props }: Omit<DocumentScanEditorProps, "sourceUrl"> & { file: File }): JSX.Element | null {
  const sourceUrl = useBlobUrl(file);
  return sourceUrl ? <DocumentScanEditor {...props} sourceUrl={sourceUrl} /> : null;
}

export function DocumentScanPage(): JSX.Element {
  const { locale, t } = useLanguage();
  const copy = documentScanMessages[locale];
  const [file, setFile] = useState<File | null>(null);
  const [corners, setCorners] = useState<DocumentCorners>(DEFAULT_DOCUMENT_CORNERS);
  const [mode, setMode] = useState<DocumentMode>("color");
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [pdf, setPdf] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<"decode" | "limit" | null>(null);
  const [selection, setSelection] = useState(0);
  const version = useRef(0);
  const selectedVersion = useRef(0);
  const mounted = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const resultUrl = useBlobUrl(result?.blob);
  const busy = processing === "processing" || exporting;
  const valid = validateDocumentCorners(corners);
  const tool: ToolDefinition = { id: "document-scan", title: copy.title, description: copy.description, path: "/image/document-scan", category: "Image" };
  const meta = { title: `${copy.title} - ${t("header.title")}`, description: copy.description, canonical: tool.path, h1: copy.title };
  useSeo(meta);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; version.current++; abort.current?.abort(); };
  }, []);

  const invalidate = () => {
    version.current++;
    abort.current?.abort(); abort.current = null;
    setResult(null); setPdf(null); setError(null); setExporting(false); setProcessing("idle");
  };
  const select = (next: File | null) => {
    invalidate(); selectedVersion.current++;
    setSelection(selectedVersion.current); setFile(next); setCorners(DEFAULT_DOCUMENT_CORNERS); setReady(false); setSourceError(null);
  };
  const cancel = () => { invalidate(); };
  const changeCorners = (next: DocumentCorners) => { invalidate(); setCorners(next); };
  const current = (token: number) => mounted.current && token === version.current;
  const process = async () => {
    if (!file || !ready || !valid || busy) return;
    invalidate();
    const token = version.current;
    const controller = new AbortController(); abort.current = controller;
    setProcessing("processing"); trackEvent("process_start", { tool: tool.id });
    try {
      const output = await scanDocument(file, corners, mode, controller.signal);
      if (!current(token)) return;
      setResult(output); setProcessing("success"); trackEvent("process_success", { tool: tool.id });
    } catch (caught) {
      if (!current(token) || controller.signal.aborted) return;
      setError(caught instanceof DocumentScanError && caught.code === "limit" ? copy.limit : caught instanceof DocumentScanError && caught.code === "decode" ? copy.decode : copy.failure);
      setProcessing("error"); trackEvent("process_failed", { tool: tool.id });
    } finally { if (current(token)) abort.current = null; }
  };
  const exportPdf = async () => {
    if (!result || busy) return;
    const token = version.current;
    setError(null); setExporting(true);
    try {
      const output = await createDocumentPdf(result);
      if (current(token)) setPdf(output);
    } catch { if (current(token)) setError(copy.pdfFailure); }
    finally { if (current(token)) setExporting(false); }
  };
  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", copy.title]} layout="split" showIdleResult workflow={{ state: processing, error, onRetry: process, onReprocess: process }} children={{
    workspace: <>
      <FileDropzone label={copy.select} accept={DOCUMENT_IMAGE_TYPES} capture="environment" multiple={false} maxSize={DOCUMENT_MAX_BYTES} disabled={busy} compact={Boolean(file)} compactLabel={copy.replace} onFiles={(files) => select(files[0] ?? null)} />
      <FileDropzone label={copy.savedPhoto} compact compactLabel={copy.savedPhoto} accept={DOCUMENT_IMAGE_TYPES} multiple={false} maxSize={DOCUMENT_MAX_BYTES} disabled={busy} onFiles={(files) => select(files[0] ?? null)} />
      <p>{copy.hint}</p>
      <FileInfo files={file ? [file] : []} mode="single" compact={Boolean(file)} onClear={() => select(null)} />
      {file ? <DocumentScanSource key={selection} file={file} value={corners} disabled={busy || !ready} onChange={changeCorners} onReady={() => {
        if (selection !== selectedVersion.current || !mounted.current) return;
        setReady(true); setSourceError(null);
      }} onError={(code) => {
        if (selection !== selectedVersion.current || !mounted.current) return;
        invalidate(); setReady(false); setSourceError(code);
      }} /> : null}
      {file && !ready && !sourceError ? <p role="status">{copy.decoding}</p> : null}
      {sourceError ? <p className="error" role="alert">{copy[sourceError]}</p> : null}
      {file && !valid ? <p className="error" role="alert">{copy.geometry}</p> : null}
      <div className="tool-form document-scan-page__actions">
        <label>{copy.mode}<select value={mode} disabled={busy} onChange={(event) => { invalidate(); setMode(event.target.value as DocumentMode); }}>
          <option value="color">{copy.color}</option><option value="grayscale">{copy.grayscale}</option><option value="contrast">{copy.contrast}</option>
        </select></label>
        {file ? <button type="button" className="btn secondary" disabled={busy || !ready} onClick={() => changeCorners(DEFAULT_DOCUMENT_CORNERS)}>{copy.reset}</button> : null}
        <button type="button" className="btn primary" disabled={!file || !ready || !valid || busy} aria-busy={processing === "processing"} onClick={process}>{processing === "processing" ? copy.processing : copy.process}</button>
        {busy ? <button type="button" className="btn secondary" onClick={cancel}>{copy.cancel}</button> : null}
      </div>
      {mode === "contrast" ? <p>{copy.threshold}</p> : null}
    </>,
    options: null,
    result: result && resultUrl ? <div className="document-scan-page__result">
      <img className="preview-image" src={resultUrl} alt={copy.preview} />
      <p>{result.width} × {result.height} px</p>
      <DownloadButton result={result} label={copy.jpeg} disabled={busy} onDownloaded={() => trackEvent("download", { tool: tool.id })} />
      {pdf ? <DownloadButton result={pdf} label={copy.pdf} disabled={busy} onDownloaded={() => trackEvent("download", { tool: tool.id })} /> : <button type="button" className="btn secondary" disabled={busy} onClick={exportPdf} aria-busy={exporting}>{exporting ? copy.creatingPdf : copy.createPdf}</button>}
      {error && processing !== "error" ? <p className="error" role="alert">{error}</p> : null}
    </div> : <p>{copy.empty}</p>,
    howItWorks: copy.how, faq: copy.faq, relatedTools: getRelatedTools(tool.id),
  }} />;
}
