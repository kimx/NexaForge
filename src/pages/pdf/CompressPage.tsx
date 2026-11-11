import { useEffect, useRef, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { FileDropzone } from "../../components/FileDropzone";
import { SizeComparison } from "../../components/SizeComparison";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { compressPdf, type PdfCompressionOptions, type PdfCompressionResult } from "../../services/pdf/compressService";
import { PDF_MAX_FILE_SIZE } from "../../services/pdf/pdfToolkit";
import type { ProcessingState, ToolDefinition } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { formatFileSize } from "../../utils/fileSize";

const COPY = {
  en: {
    title: "Compress PDF", description: "Try PDF rewriting or JPEG page compression locally. Keep the original when no smaller file is produced.",
    mode: "Compression mode", preserve: "Preserve selectable text", raster: "JPEG pages (lossy)",
    preserveHint: "Rewrites PDF objects while retaining text, links and forms. Existing images are not downsampled, and a smaller file is not guaranteed. Rewriting may invalidate digital signatures; keep signed originals.",
    rasterHint: "JPEG mode removes selectable text, search, links, forms and digital signatures. Pages become images; lower quality or resolution may blur fine detail. Physical page dimensions stay the same.",
    quality: "JPEG quality", resolution: "Resolution (DPI)", process: "Compress PDF", cancel: "Cancel", cancelled: "Compression cancelled. You can try again.",
    limits: "PDF up to 100 MB / 200 pages. JPEG rendering also has page and total pixel limits.",
    progress: (done: number, total: number) => `Rendered ${done} of ${total} pages`, rewriting: "Rewriting PDF objects…",
    kept: "No smaller file was produced. The original PDF is kept for download.", reduced: "A smaller PDF is ready. Review its pages before sharing.",
    attempted: "Attempted output", downloadOriginal: "Download original PDF", download: "Download compressed PDF", clear: "Clear file",
    errors: {
      "encrypted-pdf": "This PDF is password-protected. Export an unlocked copy in your PDF application and try again.",
      "unsupported-encryption": "This PDF uses an encryption method that this browser does not support.",
      "permission-restricted": "This PDF has owner-only permission restrictions that this tool does not remove.",
      "password-cancelled": "PDF processing was cancelled. The source file was not changed.",
      "password-modal-unavailable": "The PDF password prompt is unavailable. Reload the page and try again.",
      "broken-pdf": "This PDF could not be read or rendered. Export a fresh PDF in its source application and try again.",
      "empty-file": "The PDF is empty. Choose a PDF containing pages.", "empty-pdf": "The PDF has no pages. Choose another document.",
      "file-too-large": "The PDF exceeds 100 MB. Split it into smaller PDFs and try again.", "invalid-file-type": "Choose a PDF file (.pdf).",
      "render-limit": "The document exceeds the page or rendering limits. Try a lower resolution, split the PDF, or use text-preserving mode for oversized pages.",
      "invalid-options": "Choose a valid mode, quality from 10–100%, and resolution from 72–300 DPI.",
    },
    how: ["Choose a PDF; file contents stay in your browser.", "Start with text-preserving rewriting, or explicitly select lossy JPEG pages and choose quality and resolution.", "Compare sizes and review the PDF. Download the original if the attempt does not make it smaller."],
    faq: [{ q: "Will every PDF become smaller?", a: "No. Already optimized PDFs may stay the same size or grow. This tool only offers the new file when it is smaller, and otherwise keeps the original." }, { q: "What does JPEG mode remove?", a: "It replaces each visible page with an image. Selectable text, search, links, forms and digital signatures are removed. It is best suited to scanned pages when you accept reduced detail." }],
  },
  "zh-TW": {
    title: "壓縮 PDF", description: "在本機重寫 PDF 或使用 JPEG 頁面壓縮；無法縮小時保留原檔。",
    mode: "壓縮模式", preserve: "保留可選取文字", raster: "JPEG 頁面（有損）",
    preserveHint: "重新整理 PDF 物件並保留文字、連結及表單；不會縮小既有圖片解析度，也不保證檔案變小。重寫可能使數位簽章失效，請保留已簽署的原檔。",
    rasterHint: "JPEG 模式會移除可選取文字、搜尋、連結、表單及數位簽章。頁面會變成圖片；較低品質或解析度可能使細節模糊。實際頁面尺寸保持不變。",
    quality: "JPEG 品質", resolution: "解析度（DPI）", process: "壓縮 PDF", cancel: "取消", cancelled: "已取消壓縮，可以重新嘗試。",
    limits: "PDF 上限 100 MB／200 頁；JPEG 轉換另有單頁及總像素限制。",
    progress: (done: number, total: number) => `已轉換 ${done}／${total} 頁`, rewriting: "正在重寫 PDF 物件…",
    kept: "未產生更小的檔案，下載時將提供原始 PDF。", reduced: "更小的 PDF 已準備好，分享前請確認頁面內容。",
    attempted: "嘗試產生的檔案", downloadOriginal: "下載原始 PDF", download: "下載壓縮 PDF", clear: "清除檔案",
    errors: {
      "encrypted-pdf": "此 PDF 有密碼保護。請在 PDF 應用程式匯出未加密的副本後重試。",
      "unsupported-encryption": "此 PDF 使用目前瀏覽器不支援的加密方式。",
      "permission-restricted": "此 PDF 有本工具不會移除的擁有者權限限制。",
      "password-cancelled": "已取消 PDF 處理；來源檔案未變更。",
      "password-modal-unavailable": "目前無法開啟 PDF 密碼視窗，請重新載入頁面後再試。",
      "broken-pdf": "無法讀取或轉換此 PDF。請在來源應用程式重新匯出 PDF 後重試。",
      "empty-file": "PDF 檔案是空的，請選擇有頁面內容的檔案。", "empty-pdf": "PDF 沒有頁面，請選擇其他文件。",
      "file-too-large": "PDF 超過 100 MB，請先分割成較小的 PDF 後重試。", "invalid-file-type": "請選擇 PDF 檔案（.pdf）。",
      "render-limit": "文件超過頁數或轉換限制。請降低解析度、分割 PDF，或對過大頁面使用保留文字模式。",
      "invalid-options": "請選擇有效模式、10–100% 品質及 72–300 DPI 解析度。",
    },
    how: ["選擇 PDF，檔案內容只在瀏覽器處理。", "先嘗試保留文字重寫；或明確選擇有損 JPEG 頁面，再調整品質及解析度。", "比較大小並檢查內容；如果無法縮小，就下載原檔。"],
    faq: [{ q: "每份 PDF 都會變小嗎？", a: "不會。已經最佳化的 PDF 可能大小不變或增加。工具只在新檔較小時提供新檔，否則保留原始檔案。" }, { q: "JPEG 模式會移除什麼？", a: "每個可見頁面會替換成圖片，移除可選取文字、搜尋、連結、表單及數位簽章。適合願意接受細節減少的掃描文件。" }],
  },
};

export function PdfCompressPage(): JSX.Element {
  const { locale, t } = useLanguage();
  const copy = COPY[locale];
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<PdfCompressionOptions["mode"]>("preserve-text");
  const [quality, setQuality] = useState(70);
  const [dpi, setDpi] = useState(120);
  const [result, setResult] = useState<PdfCompressionResult | null>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const active = useRef<AbortController | null>(null);
  const busy = state === "processing";
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);

  const tool: ToolDefinition = FILE_TOOLS.find((item) => item.id === "pdf-compress") ?? {
    id: "pdf-compress", path: "/pdf/compress", category: "PDF", title: copy.title, description: copy.description,
  };
  const meta = { title: `${copy.title} - ${t("header.title")}`, description: copy.description, canonical: "/pdf/compress", h1: copy.title };
  useSeo(meta);

  const invalidate = (nextFile = file): void => {
    active.current?.abort();
    active.current = null;
    setResult(null);
    setError(null);
    setNotice(null);
    setProgress({ done: 0, total: 0 });
    setState(nextFile ? "ready" : "idle");
  };

  const process = async (): Promise<void> => {
    if (!file || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setResult(null);
    setError(null);
    setNotice(null);
    setProgress({ done: 0, total: 0 });
    setState("processing");
    trackEvent("process_start", { tool: "pdf-compress" });
    const current = () => active.current === controller && !controller.signal.aborted;
    try {
      const output = await compressPdf(file, { mode, quality: quality / 100, dpi, signal: controller.signal,
        onProgress: (done, total) => { if (current()) setProgress({ done, total }); },
      });
      if (!current()) return;
      setResult(output);
      setState("success");
      trackEvent("process_success", { tool: "pdf-compress" });
    } catch (cause) {
      if (!current()) return;
      const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "broken-pdf";
      setError(copy.errors[code as keyof typeof copy.errors] ?? copy.errors["broken-pdf"]);
      setState("error");
      trackEvent("process_failed", { tool: "pdf-compress" });
    } finally {
      if (active.current === controller) active.current = null;
    }
  };

  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", copy.title]}
    workflow={{ state, error, progress: progress.total ? Math.round(progress.done / progress.total * 100) : 0, onRetry: () => void process(), onReprocess: () => void process() }}
    children={{
      workspace: <>
        <FileDropzone label={t("label.dropPdf")} accept="application/pdf,.pdf" maxSize={PDF_MAX_FILE_SIZE} compact={Boolean(file)} disabled={busy}
          onFiles={([selected]) => { if (!selected) return; invalidate(selected); setFile(selected); trackEvent("workflow_ready", { tool: "pdf-compress" }); }}
          onRejectedFiles={() => { invalidate(null); setFile(null); }} />
        <p>{copy.limits}</p>
        {file ? <div className="pdf-merge-list-summary"><strong>{file.name} · {formatFileSize(file.size)}</strong>
          <button type="button" className="btn secondary file-btn" disabled={busy} onClick={() => { invalidate(null); setFile(null); }}>{copy.clear}</button>
        </div> : null}
      </>,
      options: <div className="tool-form">
        <label>{copy.mode}<select value={mode} disabled={busy} onChange={(event) => { invalidate(); setMode(event.target.value as PdfCompressionOptions["mode"]); }}>
          <option value="preserve-text">{copy.preserve}</option><option value="raster">{copy.raster}</option>
        </select></label>
        <p>{mode === "raster" ? copy.rasterHint : copy.preserveHint}</p>
        {mode === "raster" ? <>
          <label>{copy.quality}<input aria-label={copy.quality} aria-valuetext={`${quality}%`} type="range" min={10} max={100} step={1} value={quality} disabled={busy} onChange={(event) => { invalidate(); setQuality(Number(event.target.value)); }} /><span>{quality}%</span></label>
          <label>{copy.resolution}<select value={dpi} disabled={busy} onChange={(event) => { invalidate(); setDpi(Number(event.target.value)); }}>
            {[72, 96, 120, 144, 200, 300].map((value) => <option key={value} value={value}>{value} DPI</option>)}
          </select></label>
        </> : null}
        <button type="button" className="btn primary" disabled={!file || busy} aria-busy={busy} onClick={() => void process()}>{busy ? t("button.processing") : copy.process}</button>
        {busy ? <><p role="status">{mode === "raster" ? copy.progress(progress.done, progress.total) : copy.rewriting}</p>
          <button type="button" className="btn secondary" onClick={() => { invalidate(); setNotice(copy.cancelled); }}>{copy.cancel}</button></> : null}
        {notice ? <p role="status">{notice}</p> : null}
      </div>,
      result: <>{result ? <>
        <p role="status">{result.status === "original-kept" ? copy.kept : copy.reduced}</p>
        <p><strong>{result.fileName}</strong> · {formatFileSize(result.size)}</p>
        <SizeComparison originalSize={result.originalSize} outputSize={result.size} />
        {result.status === "original-kept" ? <p>{copy.attempted}: {formatFileSize(result.attemptedSize)}</p> : null}
        <DownloadButton result={result} label={result.status === "original-kept" ? copy.downloadOriginal : copy.download} onDownloaded={() => trackEvent("download", { tool: "pdf-compress" })} />
      </> : null}</>,
      howItWorks: copy.how, faq: copy.faq, relatedTools: FILE_TOOLS.filter((item) => item.category === "PDF" && item.id !== "pdf-compress"),
    }} />;
}
