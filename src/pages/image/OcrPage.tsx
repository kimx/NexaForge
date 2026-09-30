import { useEffect, useRef, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { createOcrTextFile, MAX_OCR_FILE_BYTES, startOcr, validateOcrFile, type OcrJob, type OcrLanguage, type OcrProgress } from "../../services/ocr/ocrService";
import type { FileProcessResult, ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { formatFileSize } from "../../utils/fileSize";
import { getRelatedTools } from "../../utils/toolHelpers";

const copy = {
  en: {
    title: "Image OCR", description: "Recognize Traditional Chinese and English text from an image in your browser.",
    drop: "Choose an image", limits: "PNG, JPEG or WebP · up to 20 MB · 16 megapixels · 8000 px per side",
    models: "First use downloads language models from tessdata.projectnaptha.com. Internet access is required; your image stays in this browser. Models may be cached for later use.",
    language: "Recognition language", traditional: "Traditional Chinese (includes Latin letters)", bilingual: "Traditional Chinese + English", english: "English only",
    recognize: "Recognize text", busy: "Recognizing…", cancel: "Cancel", cancelled: "Recognition cancelled. You can try again.",
    loading: "Loading OCR engine and language models…", decoding: "Reading image…", recognizing: "Recognizing text…",
    text: "Recognized text", download: "Download text", copy: "Copy text", copied: "Text copied.", copyError: "Copy failed. Select the text and copy it manually.",
    emptyText: "No text detected. Try a sharper, well-lit image with upright text.", accuracy: "Review the text before using it. Handwriting, small print and complex layouts may be inaccurate.",
    type: "Choose a PNG, JPEG or WebP image.", size: "This image exceeds 20 MB. Resize or compress it and try again.", empty: "This file is empty. Choose another image.",
    pixels: "This image is too large. Resize it below 16 megapixels and 8000 pixels per side.", image: "Unable to read this image. Try exporting it as PNG or JPEG.",
    model: "Unable to download the OCR models. Check your connection and try again.", worker: "Unable to start OCR. Reload this page in a current browser and try again.",
    recognition: "Recognition failed. Try a smaller, clearer image or choose English only.",
    how: ["Select one PNG, JPEG or WebP image.", "Choose a language and recognize text. The first run downloads the language models.", "Review the result, then copy it or download a UTF-8 text file."],
    faq: [{ q: "Is my image uploaded?", a: "No. Images are decoded and recognized by workers in this browser. Only OCR engine and language model files are downloaded." }, { q: "How can I improve accuracy?", a: "Use upright text, good lighting and a sharp image. Choose English only for English documents. Always review the recognized text." }],
  },
  "zh-TW": {
    title: "圖片文字辨識 OCR", description: "在瀏覽器內辨識圖片中的繁體中文與英文文字。",
    drop: "選擇圖片", limits: "PNG、JPEG 或 WebP · 上限 20 MB · 1600 萬像素 · 每邊 8000 px",
    models: "首次使用會從 tessdata.projectnaptha.com 下載語言模型，需要網路連線；圖片保留在此瀏覽器內。模型可能快取供之後使用。",
    language: "辨識語言", traditional: "繁體中文（含英文字母）", bilingual: "繁體中文 + 英文", english: "僅英文",
    recognize: "辨識文字", busy: "辨識中…", cancel: "取消", cancelled: "已取消辨識，可以重新嘗試。",
    loading: "載入 OCR 引擎與語言模型…", decoding: "讀取圖片…", recognizing: "辨識文字中…",
    text: "辨識結果", download: "下載文字", copy: "複製文字", copied: "已複製文字。", copyError: "複製失敗，請選取文字後手動複製。",
    emptyText: "未偵測到文字，請使用清晰、光線充足且文字朝上的圖片。", accuracy: "使用前請檢查文字。手寫、小字與複雜排版可能辨識不準確。",
    type: "請選擇 PNG、JPEG 或 WebP 圖片。", size: "圖片超過 20 MB，請縮小或壓縮後重試。", empty: "檔案是空的，請選擇其他圖片。",
    pixels: "圖片太大，請縮小至 1600 萬像素以內，且每邊不超過 8000 像素。", image: "無法讀取圖片，請重新匯出為 PNG 或 JPEG 後重試。",
    model: "無法下載 OCR 模型，請檢查網路連線後重試。", worker: "無法啟動 OCR，請使用新版瀏覽器重新載入頁面後重試。",
    recognition: "文字辨識失敗，請使用較小且清晰的圖片，或選擇僅英文。",
    how: ["選擇一張 PNG、JPEG 或 WebP 圖片。", "選擇語言並開始辨識，首次執行會下載語言模型。", "檢查辨識結果，複製或下載 UTF-8 文字檔。"],
    faq: [{ q: "圖片會上傳嗎？", a: "不會，圖片解碼與辨識都在此瀏覽器的 worker 中完成，網路只用於下載 OCR 引擎與語言模型。" }, { q: "如何提高辨識準確率？", a: "請使用文字朝上、光線充足且清晰的圖片。英文文件可選擇僅英文，使用前務必檢查辨識結果。" }],
  },
};

export function OcrPage(): JSX.Element {
  const { locale, t } = useLanguage();
  const c = copy[locale];
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<OcrLanguage>("chi_tra");
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [progress, setProgress] = useState<OcrProgress>({ progress: 0, stage: "decoding" });
  const [notice, setNotice] = useState("");
  const operation = useRef(0);
  const job = useRef<OcrJob | null>(null);
  const fallback: ToolDefinition = { id: "image-ocr", title: c.title, description: c.description, path: "/image/ocr", category: "Image" };
  const tool = FILE_TOOLS.find((item) => item.id === "image-ocr") ?? fallback;
  const meta: ToolMeta = { title: `${c.title} - ${t("header.title")}`, description: c.description, canonical: tool.path, h1: c.title };
  useSeo(meta);
  useEffect(() => () => { operation.current += 1; job.current?.cancel(); job.current = null; }, []);
  const busy = state === "processing";
  const invalidate = (): void => {
    operation.current += 1;
    job.current?.cancel(); job.current = null;
    setText(""); setResult(null); setError(null); setNotice(""); setState("idle");
  };
  const select = (files: File[]): void => {
    invalidate();
    const next = files[0];
    const invalid = validateOcrFile(next);
    if (invalid) { setFile(null); setError(c[invalid]); setState("error"); }
    else setFile(next);
  };
  const process = async (): Promise<void> => {
    if (!file || job.current) return;
    invalidate();
    const current = operation.current;
    setState("processing"); setProgress({ progress: 0, stage: "decoding" });
    trackEvent("process_start", { tool: tool.id });
    try {
      const nextJob = startOcr(file, language, { onProgress: (next) => {
        if (operation.current === current) setProgress((previous) => ({ ...next, progress: Math.max(previous.progress, next.progress) }));
      } });
      job.current = nextJob;
      const recognized = await nextJob.result;
      if (operation.current !== current) return;
      job.current = null;
      setText(recognized.text);
      setResult(recognized.text.trim() ? createOcrTextFile(recognized.text, file.name) : null);
      setState("success");
      trackEvent("process_success", { tool: tool.id });
    } catch (reason) {
      if (operation.current !== current) return;
      job.current = null;
      const code = (reason as { code?: string }).code;
      setError(code && code in c ? String(c[code as keyof typeof c]) : c.recognition);
      setState("error");
      trackEvent("process_failed", { tool: tool.id });
    }
  };
  const copyText = async (): Promise<void> => {
    const current = operation.current;
    try { await navigator.clipboard.writeText(text); if (current === operation.current) setNotice(c.copied); }
    catch { if (current === operation.current) setNotice(c.copyError); }
  };

  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", c.title]}
    workflow={{ state, error, progress: progress.progress * 100, onRetry: file ? process : undefined, onReprocess: file ? process : undefined }} children={{
      workspace: <>
        <FileDropzone label={c.drop} accept="image/png,image/jpeg,image/webp" maxSize={MAX_OCR_FILE_BYTES} onFiles={select} disabled={busy} compact={!!file}
          onRejectedFiles={(rejections) => { invalidate(); setFile(null); setState("error"); setError(rejections[0]?.reason === "size exceeds" ? c.size : c.type); }} />
        <p>{c.limits}</p>
        <FileInfo files={file ? [file] : []} mode="single" compact onClear={busy ? undefined : () => { invalidate(); setFile(null); }} />
      </>,
      options: <div className="tool-form">
        <p>{c.models}</p>
        <label>{c.language}<select value={language} disabled={busy} onChange={(event) => { invalidate(); setLanguage(event.target.value as OcrLanguage); }}>
          <option value="chi_tra">{c.traditional}</option><option value="chi_tra+eng">{c.bilingual}</option><option value="eng">{c.english}</option>
        </select></label>
        <button type="button" className="btn primary" onClick={process} disabled={!file || busy} aria-busy={busy}>{busy ? c.busy : c.recognize}</button>
        {busy ? <><p role="status">{c[progress.stage]} {Math.round(progress.progress * 100)}%</p><button type="button" className="btn secondary" onClick={() => { invalidate(); setNotice(c.cancelled); }}>{c.cancel}</button></> : null}
        {notice ? <p role="status">{notice}</p> : null}
      </div>,
      result: text.trim() ? <div className="tool-form">
        <p>{c.accuracy}</p>
        <label>{c.text}<textarea value={text} readOnly rows={12} style={{ width: "100%", resize: "vertical" }} /></label>
        {result ? <p>{result.fileName} · {formatFileSize(result.size)} · UTF-8</p> : null}
        <div className="tool-actions"><button type="button" className="btn secondary" onClick={copyText}>{c.copy}</button><DownloadButton result={result} label={c.download} onDownloaded={() => trackEvent("download", { tool: tool.id })} /></div>
      </div> : <p>{c.emptyText}</p>,
      howItWorks: c.how, faq: c.faq, relatedTools: getRelatedTools(tool.id),
    }} />;
}
