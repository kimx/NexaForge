import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { Link } from "react-router-dom";
import { DownloadButton } from "../../components/DownloadButton";
import { FileDropzone } from "../../components/FileDropzone";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  createPdfPageItems,
  exportPdfPages,
  type PdfPageItem,
} from "../../services/pdf/pageEditorService";
import { getPdfPageCount } from "../../services/pdf/pdfService";
import type { FileProcessResult, ProcessingState, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { downloadBlob } from "../../utils/download";
import { validateFileSize, validateMime } from "../../utils/validation";
import { assertValidPageRanges, parsePageRanges } from "../../services/pdf/pageRange";
import { localizePath } from "../../routing/localePaths";

export type PdfPageEditorMode = "reorder" | "delete" | "extract";

interface PdfRenderPage {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }): { promise: Promise<unknown> };
}

interface PdfRenderDocument {
  getPage(pageNumber: number): Promise<PdfRenderPage>;
  cleanup(): Promise<void>;
  destroy(): Promise<void>;
}

const COPY = {
  en: {
    loading: "Loading PDF…",
    detected: "{count} pages detected",
    previews: "Generating previews… {completed} / {total}",
    loadError: "This PDF could not be read. Check that it is a valid, non-empty PDF.",
    passwordError: "This PDF is password-protected and cannot currently be processed.",
    exportError: "Unable to create this PDF. Please try another file.",
    page: "Page {page}",
    selected: "selected",
    deleted: "Marked for deletion",
    restore: "Restore",
    selectAll: "Select all",
    clear: "Clear selection",
    reverse: "Reverse order",
    reset: "Reset",
    rotate: "Rotate selected 90°",
    moveLeft: "Move page {page} left",
    moveRight: "Move page {page} right",
    deleteSelected: "Delete selected",
    deletingAll: "A PDF must contain at least one page.",
    range: "Pages to extract",
    rangeHint: "For example: 1,3,5-8",
    rangeError: "Enter valid page numbers or ranges within this PDF.",
    export: "Export PDF",
    exporting: "Creating PDF…",
    selectedSummary: "{count} page(s) selected",
    deletedSummary: "{count} page(s) marked for deletion",
    result: "PDF created ({size} KB).",
    next: {
      reorder: [["/pdf/delete-pages", "Delete Pages"], ["/pdf/extract-pages", "Extract Pages"], ["/pdf/rotate", "Rotate Pages"]],
      delete: [["/pdf/reorder-pages", "Reorder Pages"], ["/pdf/extract-pages", "Extract Pages"], ["/pdf/split", "Split PDF"]],
      extract: [["/pdf/reorder-pages", "Reorder Pages"], ["/pdf/rotate", "Rotate Pages"], ["/pdf/to-image", "PDF to Image"]],
    },
  },
  "zh-TW": {
    loading: "正在載入 PDF…",
    detected: "偵測到 {count} 頁",
    previews: "正在產生預覽… {completed} / {total}",
    loadError: "無法讀取這份 PDF。請確認檔案有效且不是空白檔。",
    passwordError: "這份 PDF 已受密碼保護，目前無法處理。",
    exportError: "無法建立 PDF，請嘗試其他檔案。",
    page: "第 {page} 頁",
    selected: "已選取",
    deleted: "已標記刪除",
    restore: "還原",
    selectAll: "全選",
    clear: "取消選取",
    reverse: "反轉順序",
    reset: "重設",
    rotate: "將選取頁面旋轉 90°",
    moveLeft: "將第 {page} 頁左移",
    moveRight: "將第 {page} 頁右移",
    deleteSelected: "刪除選取頁面",
    deletingAll: "PDF 至少必須保留一頁。",
    range: "要擷取的頁面",
    rangeHint: "例如：1,3,5-8",
    rangeError: "請輸入這份 PDF 範圍內的有效頁碼或範圍。",
    export: "匯出 PDF",
    exporting: "正在建立 PDF…",
    selectedSummary: "已選取 {count} 頁",
    deletedSummary: "已標記刪除 {count} 頁",
    result: "PDF 已建立（{size} KB）。",
    next: {
      reorder: [["/pdf/delete-pages", "刪除 PDF 頁面"], ["/pdf/extract-pages", "擷取 PDF 頁面"], ["/pdf/rotate", "旋轉 PDF"]],
      delete: [["/pdf/reorder-pages", "重新排序 PDF 頁面"], ["/pdf/extract-pages", "擷取 PDF 頁面"], ["/pdf/split", "分割 PDF"]],
      extract: [["/pdf/reorder-pages", "重新排序 PDF 頁面"], ["/pdf/rotate", "旋轉 PDF"], ["/pdf/to-image", "PDF 轉圖片"]],
    },
  },
} as const;

function interpolate(value: string, params: Record<string, number>): string {
  return value.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));
}

function PdfThumbnail({
  document,
  page,
  onRendered,
}: {
  document: PdfRenderDocument | null;
  page: number;
  onRendered: () => void;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onRenderedRef = useRef(onRendered);
  const [visible, setVisible] = useState(false);
  onRenderedRef.current = onRendered;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !document) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [document]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !document || !visible) return;
    let cancelled = false;
    void document.getPage(page).then((pdfPage) => {
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale: 0.32 });
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      return pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
    }).then(() => {
      if (!cancelled) onRenderedRef.current();
    }).catch(() => {
      if (!cancelled) onRenderedRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, [document, page, visible]);

  return <canvas className="pdf-page-editor__thumbnail" ref={canvasRef} aria-hidden="true" />;
}

export function PdfPageEditorPage({ mode }: { mode: PdfPageEditorMode }): JSX.Element {
  const { locale, t } = useLanguage();
  const copy = COPY[locale];
  const toolId = `pdf-${mode === "reorder" ? "reorder-pages" : `${mode}-pages`}`;
  const tool = FILE_TOOLS.find((item) => item.id === toolId) ?? FILE_TOOLS[0];
  const title = t(`tool.${toolId}.title`);
  const description = t(`tool.${toolId}.description`);
  const meta: ToolMeta = { title: `${title} | NexaForge`, description, canonical: tool.path, h1: title };
  useSeo(meta);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [range, setRange] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [document, setDocument] = useState<PdfRenderDocument | null>(null);
  const [previewed, setPreviewed] = useState(0);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const markDirty = (): void => {
    setResult(null);
    setProcessing("ready");
  };

  useEffect(() => {
    if (!file || pageCount === 0) return;
    let active = true;
    let loadingTask: { promise: Promise<unknown>; destroy(): Promise<void> } | null = null;
    let pdf: PdfRenderDocument | null = null;
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        pdf = await loadingTask.promise as unknown as PdfRenderDocument;
        if (active) setDocument(pdf);
      } catch {
        // Editing remains available if preview rendering is unavailable.
      }
    })();
    return () => {
      active = false;
      setDocument(null);
      void pdf?.cleanup();
      void pdf?.destroy();
      void loadingTask?.destroy();
    };
  }, [file, pageCount]);

  const visiblePages = useMemo(
    () => mode === "delete" ? pages : pages,
    [mode, pages]
  );
  const selectedCount = selected.size;
  const deletedCount = pages.filter(({ deleted }) => deleted).length;
  const exportPages = mode === "delete"
    ? pages.filter(({ deleted }) => !deleted)
    : mode === "extract"
      ? pages.filter((page) => selected.has(page.id))
      : pages;
  const canExport = exportPages.length > 0 && processing !== "processing";

  const selectPage = (id: string): void => {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    markDirty();
  };

  const movePage = (index: number, direction: -1 | 1): void => {
    setPages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    markDirty();
  };

  const loadFile = async (incoming: File[]): Promise<void> => {
    const source = incoming[0];
    if (!source) return;
    const validation = validateFileSize(source) ?? validateMime(source, "application/pdf");
    if (validation) {
      setError(validation.message);
      setProcessing("error");
      return;
    }
    setFile(source);
    setPageCount(0);
    setPages([]);
    setSelected(new Set());
    setRange("");
    setRangeError(null);
    setPreviewed(0);
    setResult(null);
    setError(null);
    setProgressText(copy.loading);
    setProcessing("processing");
    try {
      const count = await getPdfPageCount(source);
      if (count < 1) throw new Error("Empty PDF");
      setPageCount(count);
      setPages(createPdfPageItems(count));
      setProgressText(interpolate(copy.detected, { count }));
      setProcessing("ready");
      trackEvent("workflow_ready", { tool: toolId, resultCount: count });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(/password|encrypted/i.test(message) ? copy.passwordError : copy.loadError);
      setProcessing("error");
      trackEvent("process_failed", { tool: toolId });
    }
  };

  const updateRange = (value: string): void => {
    setRange(value);
    try {
      const rangePages = parsePageRanges(value);
      assertValidPageRanges(rangePages, pageCount);
      setSelected(new Set(rangePages.map((index) => `page-${index}`)));
      setRangeError(null);
      markDirty();
    } catch {
      setRangeError(copy.rangeError);
    }
  };

  const exportPdf = async (): Promise<void> => {
    if (!file || !canExport) return;
    setError(null);
    setProgressText(copy.exporting);
    setProcessing("processing");
    try {
      const names: Record<PdfPageEditorMode, string> = {
        reorder: "reordered.pdf",
        delete: "pages-removed.pdf",
        extract: "extracted-pages.pdf",
      };
      const output = await exportPdfPages(file, exportPages, names[mode]);
      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setProcessing("success");
      trackEvent("process_success", { tool: toolId, resultCount: exportPages.length });
    } catch {
      setError(copy.exportError);
      setProcessing("error");
      trackEvent("process_failed", { tool: toolId });
    }
  };

  const relatedTools = useMemo(
    () => copy.next[mode].map(([path, label]) => ({ id: path, path, title: label, description: "", category: "PDF" as const })),
    [copy.next, mode]
  );

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state: processing, error, onRetry: () => file && void loadFile([file]), onReprocess: exportPdf }}
      children={{
        workspace: (
          <>
            <FileDropzone label={t("label.dropPdf")} accept="application/pdf,.pdf" compact={Boolean(file)} disabled={processing === "processing"} onFiles={(incoming) => void loadFile(incoming)} />
            {file ? <p className="pdf-page-editor__file"><strong>{file.name}</strong> · {pageCount ? interpolate(copy.detected, { count: pageCount }) : progressText}</p> : null}
          </>
        ),
        options: pageCount > 0 ? (
          <div className="pdf-page-editor">
            <p className="pdf-page-editor__progress" role="status">
              {document && previewed < pageCount ? interpolate(copy.previews, { completed: previewed, total: pageCount }) : progressText}
            </p>
            {mode === "extract" ? (
              <label className="pdf-page-editor__range">
                {copy.range}
                <input value={range} onChange={(event) => updateRange(event.target.value)} aria-label={copy.range} aria-describedby="pdf-page-range-hint pdf-page-range-error" />
                <small id="pdf-page-range-hint">{copy.rangeHint}</small>
                {rangeError ? <span id="pdf-page-range-error" role="alert">{rangeError}</span> : null}
              </label>
            ) : null}
            <div className="pdf-page-editor__toolbar">
              <span aria-live="polite">{mode === "delete" ? interpolate(copy.deletedSummary, { count: deletedCount }) : interpolate(copy.selectedSummary, { count: selectedCount })}</span>
              <button type="button" className="pdf-page-picker__action" onClick={() => { setSelected(new Set(pages.filter(({ deleted }) => !deleted).map(({ id }) => id))); markDirty(); }}>{copy.selectAll}</button>
              <button type="button" className="pdf-page-picker__action" onClick={() => { setSelected(new Set()); markDirty(); }} disabled={!selectedCount}>{copy.clear}</button>
              {mode === "reorder" ? <>
                <button type="button" className="pdf-page-picker__action" onClick={() => { setPages((current) => [...current].reverse()); markDirty(); }}>{copy.reverse}</button>
                <button type="button" className="pdf-page-picker__action" onClick={() => { setPages(createPdfPageItems(pageCount)); setSelected(new Set()); markDirty(); }}>{copy.reset}</button>
                <button type="button" className="pdf-page-picker__action" disabled={!selectedCount} onClick={() => { setPages((current) => current.map((page) => selected.has(page.id) ? { ...page, rotation: ((page.rotation + 90) % 360) as PdfPageItem["rotation"] } : page)); markDirty(); }}>{copy.rotate}</button>
              </> : null}
              {mode === "delete" ? <button type="button" className="btn secondary" disabled={!selectedCount} onClick={() => { setPages((current) => current.map((page) => selected.has(page.id) ? { ...page, deleted: true } : page)); setSelected(new Set()); markDirty(); }}>{copy.deleteSelected}</button> : null}
            </div>
            {mode === "delete" && exportPages.length === 0 ? <p className="error" role="alert">{copy.deletingAll}</p> : null}
            <ol className="pdf-page-editor__grid" aria-label={title}>
              {visiblePages.map((page, index) => {
                const isSelected = selected.has(page.id);
                const pageNumber = page.originalIndex + 1;
                return (
                  <li key={page.id} className={`pdf-page-editor__card${isSelected ? " pdf-page-editor__card--selected" : ""}${page.deleted ? " pdf-page-editor__card--deleted" : ""}`} draggable={mode === "reorder"} onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event: DragEvent<HTMLLIElement>) => {
                    event.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== index) {
                      setPages((current) => {
                        const next = [...current];
                        const [moved] = next.splice(draggedIndex, 1);
                        next.splice(index, 0, moved);
                        return next;
                      });
                      markDirty();
                    }
                    setDraggedIndex(null);
                  }} onDragEnd={() => setDraggedIndex(null)}>
                    <button type="button" className="pdf-page-editor__select" aria-pressed={isSelected} aria-label={`${interpolate(copy.page, { page: pageNumber })}${isSelected ? `, ${copy.selected}` : ""}${page.deleted ? `, ${copy.deleted}` : ""}`} disabled={Boolean(page.deleted)} onClick={() => selectPage(page.id)}>
                      <PdfThumbnail document={document} page={pageNumber} onRendered={() => setPreviewed((count) => Math.min(pageCount, count + 1))} />
                      <strong>{interpolate(copy.page, { page: pageNumber })}</strong>
                      {page.rotation ? <small>{page.rotation}°</small> : null}
                      {page.deleted ? <span className="pdf-page-editor__badge">{copy.deleted}</span> : null}
                    </button>
                    {mode === "delete" && page.deleted ? <button type="button" className="pdf-page-editor__restore" onClick={() => { setPages((current) => current.map((item) => item.id === page.id ? { ...item, deleted: false } : item)); markDirty(); }}>{copy.restore}</button> : null}
                    {mode === "reorder" ? <div className="pdf-page-editor__move">
                      <button type="button" aria-label={interpolate(copy.moveLeft, { page: pageNumber })} disabled={index === 0} onClick={() => movePage(index, -1)}>←</button>
                      <button type="button" aria-label={interpolate(copy.moveRight, { page: pageNumber })} disabled={index === pages.length - 1} onClick={() => movePage(index, 1)}>→</button>
                    </div> : null}
                  </li>
                );
              })}
            </ol>
            <button type="button" className="btn primary" disabled={!canExport} aria-busy={processing === "processing"} onClick={() => void exportPdf()}>{processing === "processing" ? copy.exporting : copy.export}</button>
          </div>
        ) : null,
        result: result ? <p>{interpolate(copy.result, { size: Number((result.size / 1024).toFixed(2)) })}</p> : <p>{progressText}</p>,
        nextActions: result ? <><DownloadButton result={result} onDownloaded={() => trackEvent("download", { tool: toolId })} />{copy.next[mode].map(([path, label]) => <Link key={path} className="btn secondary" to={localizePath(path, locale)}>{label}</Link>)}</> : undefined,
        howItWorks: [],
        faq: [],
        relatedTools,
      }}
    />
  );
}
