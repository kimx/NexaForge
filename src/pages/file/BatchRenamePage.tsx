import { useEffect, useMemo, useRef, useState } from "react";
import { FileDropzone } from "../../components/FileDropzone";
import { DownloadButton } from "../../components/DownloadButton";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FILE_TOOLS } from "../../data/tools";
import { useLanguage } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import { buildRenamePreview, createRenamedArchive, RENAME_MAX_BYTES, RENAME_MAX_FILES, type RenameOptions } from "../../services/file/renameService";
import type { FileProcessResult, ProcessingState } from "../../types/tool";
import { formatFileSize } from "../../utils/fileSize";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import "../../styles/everyday-tools.css";

const defaults: RenameOptions = { baseName: "", find: "", replace: "", prefix: "", suffix: "", sequence: true, start: 1, padding: 3 };
const copy = {
  en: {
    select: "Select files to rename", limits: "Up to 200 files, 50 MB each and 200 MB total. Only the downloaded copies are renamed.", base: "New base name (optional)", find: "Find in base name", replace: "Replace with", prefix: "Prefix", suffix: "Suffix", sequence: "Add sequence numbers", start: "Starting number", padding: "Number of digits", original: "Original name", newName: "Download name", status: "Validation", valid: "Ready", collision: "Duplicate name — add numbering or change the rules.", invalidName: "Invalid name — remove path separators or reserved characters.", counter: "Use a non-negative whole starting number and 1–8 digits.", batch: "Select at most 200 files, with a total size below 200 MB.", create: "Create renamed ZIP", clear: "Clear files", remove: "Remove {name}", failed: "Unable to create the ZIP. Try fewer or smaller files and keep this tab open.", ready: "The ZIP contains renamed copies with unchanged file contents.", waiting: "Select files to preview their new names.", ruleHint: "Extensions are preserved. Find/replace matches literal text in the base name. The sequence follows the current file order.", reset: "Reset naming rules",
    how: ["Select the files you want to organize.", "Set naming rules and check every name in the preview; resolve duplicate or invalid names.", "Create and download a ZIP containing the renamed copies."],
    faqQ: "Will this change files on my device?", faqA: "No. The original names and contents stay unchanged. New names are applied only to copies inside the downloaded ZIP.",
  },
  "zh-TW": {
    select: "選擇要改名的檔案", limits: "最多 200 個檔案，每個 50 MB，總計 200 MB。只會修改下載副本的檔名。", base: "新檔名主體（選填）", find: "尋找檔名中的文字", replace: "取代為", prefix: "前綴", suffix: "後綴", sequence: "加入序號", start: "起始序號", padding: "序號位數", original: "原始檔名", newName: "下載檔名", status: "檢查結果", valid: "可下載", collision: "檔名重複，請加入序號或調整規則。", invalidName: "檔名無效，請移除路徑符號或保留字元。", counter: "起始序號請填非負整數，序號位數請填 1–8。", batch: "請選擇最多 200 個檔案，總大小不超過 200 MB。", create: "產生改名 ZIP", clear: "清除檔案", remove: "移除 {name}", failed: "無法產生 ZIP，請減少檔案數量或大小，並保持此分頁開啟後重試。", ready: "ZIP 內為改名後的副本，檔案內容保持不變。", waiting: "選擇檔案後即可預覽新檔名。", ruleHint: "保留副檔名；尋找與取代只比對檔名主體的文字。序號會依目前檔案順序排列。", reset: "重設命名規則",
    how: ["選擇要整理的檔案。", "設定命名規則並檢查預覽，先解決重複或無效的檔名。", "產生並下載 ZIP，取得改名後的副本。"],
    faqQ: "會修改裝置上的原始檔案嗎？", faqA: "不會。原始檔名與內容保持不變，只會對下載 ZIP 中的副本套用新檔名。",
  },
};

export function BatchRenamePage(): JSX.Element {
  const { locale, t } = useLanguage();
  const c = copy[locale];
  const tool = FILE_TOOLS.find(item => item.id === "batch-rename")!;
  const title = t("tool.batch-rename.title");
  const meta = { title: `${title} - NexaForge`, description: t("tool.batch-rename.description"), canonical: tool.path, h1: title };
  useSeo(meta);
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<RenameOptions>(defaults);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const operation = useRef(0);
  const busy = state === "processing";
  useEffect(() => () => { operation.current += 1; }, []);
  const preview = useMemo(() => {
    try { return { rows: buildRenamePreview(files, options), error: null }; }
    catch (cause) { return { rows: [], error: cause instanceof Error && cause.message === "batch-limit" ? c.batch : c.counter }; }
  }, [files, options, c]);
  const canCreate = files.length > 0 && !preview.error && preview.rows.every(row => !row.error) && !busy;
  function invalidate(): void { operation.current += 1; setResult(null); setError(null); setState(files.length ? "ready" : "idle"); }
  function update<K extends keyof RenameOptions>(key: K, value: RenameOptions[K]): void { invalidate(); setOptions(current => ({ ...current, [key]: value })); }
  function addFiles(next: File[]): void {
    invalidate();
    const combined = [...files, ...next];
    if (combined.length > RENAME_MAX_FILES || combined.reduce((sum, file) => sum + file.size, 0) > RENAME_MAX_BYTES) { setError(c.batch); setState("error"); return; }
    setFiles(combined); setState("ready");
  }
  async function process(): Promise<void> {
    if (!canCreate) return;
    const token = ++operation.current;
    setError(null); setResult(null); setState("processing"); trackEvent("process_start", { tool: tool.id });
    try {
      const output = await createRenamedArchive(files, options);
      if (operation.current !== token) return;
      setResult(output); setState("success"); trackEvent("process_success", { tool: tool.id });
    } catch {
      if (operation.current !== token) return;
      setError(c.failed); setState("error"); trackEvent("process_failed", { tool: tool.id });
    }
  }
  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} workflow={{ state, error, onRetry: process, onReprocess: process }} children={{
    workspace: <>
      <FileDropzone label={c.select} multiple compact={files.length > 0} disabled={busy} maxSize={50 * 1024 * 1024} onFiles={addFiles} />
      <p className="everyday-hint">{c.limits}</p>
      {preview.error ? <p className="error" role="alert">{preview.error}</p> : null}
      {preview.rows.length ? <><div className="everyday-table-scroll"><table className="everyday-table"><caption>{locale === "en" ? "Rename preview" : "改名預覽"}</caption><thead><tr><th scope="col">{c.original}</th><th scope="col">{c.newName}</th><th scope="col">{c.status}</th><th scope="col">{locale === "en" ? "Actions" : "操作"}</th></tr></thead><tbody>{preview.rows.map((row, index) => <tr key={`${index}-${row.originalName}`}><td>{row.originalName}<small>{formatFileSize(files[index].size)}</small></td><td>{row.newName}</td><td className={row.error ? "error" : ""}>{row.error === "collision" ? c.collision : row.error === "invalid-name" ? c.invalidName : c.valid}</td><td><button type="button" className="btn secondary" aria-label={c.remove.replace("{name}", row.originalName)} disabled={busy} onClick={() => { invalidate(); const next = files.filter((_, item) => item !== index); setFiles(next); setState(next.length ? "ready" : "idle"); }}>{locale === "en" ? "Remove" : "移除"}</button></td></tr>)}</tbody></table></div><button type="button" className="btn secondary" disabled={busy} onClick={() => { invalidate(); setFiles([]); setState("idle"); }}>{c.clear}</button></> : <p>{c.waiting}</p>}
    </>,
    options: <div className="tool-form everyday-form"><fieldset className="everyday-options" disabled={busy}>
      <label>{c.base}<input type="text" maxLength={160} value={options.baseName} onChange={event => update("baseName", event.target.value)} /></label>
      <div className="everyday-form-grid"><label>{c.find}<input type="text" value={options.find} onChange={event => update("find", event.target.value)} /></label><label>{c.replace}<input type="text" value={options.replace} onChange={event => update("replace", event.target.value)} /></label></div>
      <div className="everyday-form-grid"><label>{c.prefix}<input type="text" maxLength={100} value={options.prefix} onChange={event => update("prefix", event.target.value)} /></label><label>{c.suffix}<input type="text" maxLength={100} value={options.suffix} onChange={event => update("suffix", event.target.value)} /></label></div>
      <label className="checkbox"><input type="checkbox" checked={options.sequence} onChange={event => update("sequence", event.target.checked)} />{c.sequence}</label>
      {options.sequence ? <div className="everyday-form-grid"><label>{c.start}<input type="number" min={0} step={1} value={Number.isNaN(options.start) ? "" : options.start} onChange={event => update("start", event.target.value === "" ? NaN : Number(event.target.value))} /></label><label>{c.padding}<input type="number" min={1} max={8} value={Number.isNaN(options.padding) ? "" : options.padding} onChange={event => update("padding", event.target.value === "" ? NaN : Number(event.target.value))} /></label></div> : null}
      <p className="everyday-hint">{c.ruleHint}</p>
      <button type="button" className="btn secondary" onClick={() => { invalidate(); setOptions(defaults); }}>{c.reset}</button>
    </fieldset><button type="button" className="btn primary" disabled={!canCreate} aria-busy={busy} onClick={() => void process()}>{busy ? t("button.processing") : c.create}</button></div>,
    result: result ? <><p>{c.ready}</p><DownloadButton result={result} onDownloaded={() => trackEvent("download", { tool: tool.id })} /></> : <p>{c.waiting}</p>,
    howItWorks: c.how, faq: [{ q: c.faqQ, a: c.faqA }], relatedTools: getRelatedTools(tool.id),
  }} />;
}
