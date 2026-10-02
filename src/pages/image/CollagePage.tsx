import { useEffect, useRef, useState } from "react";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { useSeo } from "../../hooks/useSeo";
import { createCollage, COLLAGE_MAX_FILES, type CollageOptions } from "../../services/image/collageService";
import type { FileProcessResult, ProcessingState } from "../../types/tool";
import { formatFileSize } from "../../utils/fileSize";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import "../../styles/everyday-tools.css";

const copy = {
  en: {
    select: "Select photos or screenshots", add: "Add images", limits: "Up to 20 images, 50 MB and 20 megapixels each, 8192 px per side and 150 MB total. Arrange them below before creating the image.",
    layout: "Layout", vertical: "Long image (vertical)", horizontal: "Horizontal strip", grid: "Grid", width: "Output width (px)", gap: "Spacing (px)", columns: "Grid columns", background: "Background", format: "Output format", create: "Create image", cancel: "Cancel", clear: "Clear images", up: "Move {name} up", down: "Move {name} down", remove: "Remove {name}",
    invalid: "Choose a width of 100–4096 px, spacing of 0–200 px and 1–6 grid columns.", count: "Choose at most 20 images and keep the total below 150 MB.", failed: "Unable to read an image. Try a valid JPG, PNG or WebP, or choose a smaller version.", canvasLimit: "This image would be too large. Reduce the output width or split it into smaller groups.", preview: "Combined image preview", dimensions: "Output dimensions", waiting: "Choose images and a layout to create a preview.",
    how: ["Select photos or screenshots and arrange their order.", "Choose a long image, horizontal strip or grid, then set width and spacing.", "Create and preview the image, then download JPG or PNG."],
    faqQ: "Will the images be cropped?", faqA: "No. Each source retains its aspect ratio. Grid cells use your chosen background to fill the remaining space.",
  },
  "zh-TW": {
    select: "選擇照片或截圖", add: "新增圖片", limits: "最多 20 張，每張 50 MB、2,000 萬像素、每邊 8192 px，總計 150 MB。產生圖片前可在下方調整順序。",
    layout: "排列方式", vertical: "合成長圖（直向）", horizontal: "橫向排列", grid: "網格拼貼", width: "輸出寬度（px）", gap: "間距（px）", columns: "網格欄數", background: "背景顏色", format: "輸出格式", create: "產生圖片", cancel: "取消", clear: "清除圖片", up: "將 {name} 上移", down: "將 {name} 下移", remove: "移除 {name}",
    invalid: "寬度請設定為 100–4096 px，間距 0–200 px，網格 1–6 欄。", count: "請選擇最多 20 張圖片，總大小不超過 150 MB。", failed: "無法讀取圖片，請改用有效的 JPG、PNG 或 WebP，或先縮小圖片。", canvasLimit: "合成圖片太大，請降低輸出寬度或分批製作。", preview: "合成圖片預覽", dimensions: "輸出尺寸", waiting: "選擇圖片與排列方式，再產生預覽。",
    how: ["選擇照片或截圖，調整排列順序。", "選擇長圖、橫向或網格，設定寬度與間距。", "產生並檢查預覽，再下載 JPG 或 PNG。"],
    faqQ: "會裁掉圖片內容嗎？", faqA: "不會。每張原圖都保留比例；網格內剩餘的空間會填入你選擇的背景顏色。",
  },
};

function SourceThumbnail({ file }: { file: File }): JSX.Element {
  const url = useBlobUrl(file);
  return <img src={url || undefined} className="everyday-source-thumb" alt="" />;
}

export function CollagePage(): JSX.Element {
  const { locale, t } = useLanguage();
  const c = copy[locale];
  const tool = FILE_TOOLS.find(item => item.id === "image-collage")!;
  const title = t("tool.image-collage.title");
  useSeo({ title: `${title} - NexaForge`, description: t("tool.image-collage.description"), canonical: tool.path, h1: title });
  const [files, setFiles] = useState<File[]>([]);
  const [layout, setLayout] = useState<CollageOptions["layout"]>("vertical");
  const [width, setWidth] = useState("1280");
  const [gap, setGap] = useState("16");
  const [columns, setColumns] = useState("2");
  const [background, setBackground] = useState("#ffffff");
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [state, setState] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const operation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const preview = useBlobUrl(result?.blob);
  const busy = state === "processing";
  const valid = Number.isInteger(Number(width)) && Number(width) >= 100 && Number(width) <= 4096 && Number.isInteger(Number(gap)) && Number(gap) >= 0 && Number(gap) <= 200 && Number.isInteger(Number(columns)) && Number(columns) >= 1 && Number(columns) <= 6;
  useEffect(() => () => { operation.current += 1; controller.current?.abort(); }, []);
  function invalidate(): void { operation.current += 1; controller.current?.abort(); setResult(null); setError(null); setState(files.length ? "ready" : "idle"); }
  function addFiles(next: File[]): void {
    invalidate();
    const combined = [...files, ...next];
    if (combined.length > COLLAGE_MAX_FILES || combined.reduce((sum, file) => sum + file.size, 0) > 150 * 1024 * 1024) { setError(c.count); setState("error"); return; }
    setFiles(combined); setState("ready");
  }
  function move(index: number, direction: number): void {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    invalidate();
    const next = [...files]; [next[index], next[target]] = [next[target], next[index]]; setFiles(next);
  }
  async function process(): Promise<void> {
    if (!files.length || !valid || busy) return;
    const token = ++operation.current;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setError(null); setResult(null); setState("processing");
    trackEvent("process_start", { tool: tool.id });
    try {
      const output = await createCollage(files, { layout, width: Number(width), gap: Number(gap), columns: Number(columns), background, format }, abort.signal);
      if (operation.current !== token) return;
      setResult(output); setState("success"); trackEvent("process_success", { tool: tool.id });
    } catch (cause) {
      if (operation.current !== token || abort.signal.aborted) return;
      setError(cause instanceof Error && cause.message === "canvas-limit" ? c.canvasLimit : c.failed); setState("error"); trackEvent("process_failed", { tool: tool.id });
    }
  }
  return <ToolPageTemplate tool={tool} meta={{ title, description: t("tool.image-collage.description"), canonical: tool.path, h1: title }} breadcrumb={["Home", title]} workflow={{ state, error, onRetry: process, onReprocess: process }} children={{
    workspace: <>
      <FileDropzone label={c.select} compactLabel={c.add} accept="image/jpeg,image/png,image/webp" multiple maxSize={50 * 1024 * 1024} compact={files.length > 0} disabled={busy} onFiles={addFiles} />
      <p className="everyday-hint">{c.limits}</p>
      {files.length ? <><ol className="everyday-source-list">{files.map((file, index) => <li key={`${index}-${file.name}`}>
        <SourceThumbnail file={file} /><div className="everyday-source-label"><strong data-testid="collage-source-name">{file.name}</strong><span>{formatFileSize(file.size)}</span></div>
        <div className="everyday-source-actions">
          <button type="button" className="btn secondary" aria-label={c.up.replace("{name}", file.name)} disabled={busy || index === 0} onClick={() => move(index, -1)}>↑</button>
          <button type="button" className="btn secondary" aria-label={c.down.replace("{name}", file.name)} disabled={busy || index === files.length - 1} onClick={() => move(index, 1)}>↓</button>
          <button type="button" className="btn secondary" aria-label={c.remove.replace("{name}", file.name)} disabled={busy} onClick={() => { invalidate(); const next = files.filter((_, item) => item !== index); setFiles(next); setState(next.length ? "ready" : "idle"); }}>{locale === "en" ? "Remove" : "移除"}</button>
        </div>
      </li>)}</ol><button type="button" className="btn secondary" disabled={busy} onClick={() => { invalidate(); setFiles([]); setState("idle"); }}>{c.clear}</button></> : null}
    </>,
    options: <div className="tool-form everyday-form"><fieldset disabled={busy} className="everyday-options">
      <label>{c.layout}<select value={layout} onChange={event => { invalidate(); setLayout(event.target.value as CollageOptions["layout"]); }}><option value="vertical">{c.vertical}</option><option value="horizontal">{c.horizontal}</option><option value="grid">{c.grid}</option></select></label>
      <div className="everyday-form-grid"><label>{c.width}<input type="number" min={100} max={4096} value={width} onChange={event => { invalidate(); setWidth(event.target.value); }} /></label><label>{c.gap}<input type="number" min={0} max={200} value={gap} onChange={event => { invalidate(); setGap(event.target.value); }} /></label></div>
      {layout === "grid" ? <label>{c.columns}<input type="number" min={1} max={6} value={columns} onChange={event => { invalidate(); setColumns(event.target.value); }} /></label> : null}
      <label>{c.background}<input type="color" value={background} onChange={event => { invalidate(); setBackground(event.target.value); }} /></label>
      <label>{c.format}<select value={format} onChange={event => { invalidate(); setFormat(event.target.value as "jpeg" | "png"); }}><option value="jpeg">JPG</option><option value="png">PNG</option></select></label>
    </fieldset>{!valid ? <p role="alert" className="error">{c.invalid}</p> : null}
      <button type="button" className="btn primary" disabled={!files.length || !valid || busy} aria-busy={busy} onClick={() => void process()}>{busy ? t("button.processing") : c.create}</button>
      {busy ? <button type="button" className="btn secondary" onClick={() => { invalidate(); }}>{c.cancel}</button> : null}
    </div>,
    result: result ? <><p>{c.dimensions}: {result.width} × {result.height} px</p><DownloadButton result={result} onDownloaded={() => trackEvent("download", { tool: tool.id })} /><img className="everyday-result-image" src={preview || undefined} alt={c.preview} /></> : <p>{c.waiting}</p>,
    howItWorks: c.how, faq: [{ q: c.faqQ, a: c.faqA }], relatedTools: getRelatedTools(tool.id),
  }} />;
}
