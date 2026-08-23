import { useRef, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { DownloadCollectionButton } from "../../components/DownloadCollectionButton";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { generateSocialImages, SOCIAL_PRESETS, type ImageFit, type SocialImageFormat, type SocialImageRequest } from "../../services/image/socialImageService";
import type { FileProcessResult, ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

function validDimension(value: number): boolean { return Number.isInteger(value) && value >= 16 && value <= 4096; }

export function SocialResizerPage(): JSX.Element {
  const { t } = useLanguage();
  const fallback: ToolDefinition = { id: "social-resizer", title: "Social Media Image Resizer", description: "Create social image sizes locally.", path: "/image/social-resizer", category: "Image" };
  const tool = FILE_TOOLS.find((item) => item.id === "social-resizer") ?? fallback;
  const title = t("tool.social-resizer.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.social-resizer.description"), canonical: "/image/social-resizer", h1: title };
  useSeo(meta);
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<string[]>(["instagram-square"]);
  const [custom, setCustom] = useState(false);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(630);
  const [fit, setFit] = useState<ImageFit>("cover");
  const [format, setFormat] = useState<SocialImageFormat>("jpeg");
  const [results, setResults] = useState<FileProcessResult[]>([]);
  const [requestedCount, setRequestedCount] = useState(0);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const operation = useRef(0);
  const clearResult = (): void => { operation.current += 1; setResults([]); setRequestedCount(0); setError(null); setState("idle"); };
  const customValid = !custom || (validDimension(width) && validDimension(height));
  const buildRequests = (): SocialImageRequest[] => {
    const presets = SOCIAL_PRESETS.filter((preset) => selected.includes(preset.id)).map((preset) => ({ ...preset, fit, format }));
    return custom ? [...presets, { id: "custom", label: t("tool.social-resizer.custom"), width, height, fit, format }] : presets;
  };
  const process = async (): Promise<void> => {
    if (!file || !customValid) return;
    const requests = buildRequests(); if (!requests.length) return;
    const current = ++operation.current; setRequestedCount(requests.length); setResults([]); setError(null); setState("processing");
    try {
      const next = await generateSocialImages(file, requests);
      if (current !== operation.current) return;
      setResults(next); setState("success");
    } catch (cause) {
      if (current !== operation.current) return;
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(t("tool.social-resizer.error", { message })); setState("error");
    }
  };
  const canGenerate = Boolean(file) && customValid && (selected.length > 0 || custom) && state !== "processing";
  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} layout="split" workflow={{ state, error, onRetry: process, onReprocess: process }} children={{
    workspace: <><FileDropzone label={t("label.dropImage")} accept="image/png,image/jpeg,image/webp,image/avif" multiple={false} onFiles={(files) => { setFile(files[0]); clearResult(); }} compact={Boolean(file)} /><FileInfo files={file ? [file] : []} mode="single" onClear={() => { setFile(null); clearResult(); }} compact={Boolean(file)} /></>,
    options: <div className="issue23-form"><fieldset><legend>{t("tool.social-resizer.presets")}</legend>{SOCIAL_PRESETS.map((preset) => <label className="checkbox" key={preset.id}><input type="checkbox" checked={selected.includes(preset.id)} onChange={(event) => { setSelected((current) => event.target.checked ? [...current, preset.id] : current.filter((id) => id !== preset.id)); clearResult(); }} />{t(`tool.social-resizer.preset.${preset.id}`)} — {preset.width} × {preset.height}</label>)}<label className="checkbox"><input type="checkbox" checked={custom} onChange={(event) => { setCustom(event.target.checked); clearResult(); }} />{t("tool.social-resizer.custom")}</label></fieldset><div className="issue23-form__grid"><label>{t("tool.social-resizer.customWidth")}<input type="number" min={16} max={4096} value={width} disabled={!custom} onChange={(event) => { setWidth(Number(event.target.value)); clearResult(); }} /></label><label>{t("tool.social-resizer.customHeight")}<input type="number" min={16} max={4096} value={height} disabled={!custom} onChange={(event) => { setHeight(Number(event.target.value)); clearResult(); }} /></label></div>{custom && !customValid ? <p className="error" role="alert">{t("tool.social-resizer.dimensionError")}</p> : null}<label>{t("tool.social-resizer.fit")}<select value={fit} onChange={(event) => { setFit(event.target.value as ImageFit); clearResult(); }}><option value="cover">{t("tool.social-resizer.cover")}</option><option value="contain">{t("tool.social-resizer.contain")}</option></select></label><label>{t("label.outputFormat")}<select value={format} onChange={(event) => { setFormat(event.target.value as SocialImageFormat); clearResult(); }}><option value="jpeg">JPG</option><option value="png">PNG</option></select></label><button type="button" className="btn primary" disabled={!canGenerate} onClick={process}>{t("tool.social-resizer.generate")}</button></div>,
    result: results.length ? <><p role="status">{t("tool.social-resizer.generated", { completed: results.length, total: requestedCount })}</p><ul className="batch-file-results">{results.map((result) => <li className="batch-file-results__item" key={result.fileName}><span className="batch-file-results__name">{result.fileName}</span><DownloadButton result={result} label={t("batch.downloadFile", { name: result.fileName })} /></li>)}</ul><DownloadCollectionButton results={results} fileName="social-images.zip" /></> : <p>{t("label.noResult")}</p>,
    howItWorks: [0, 1, 2].map((index) => t(`tool.social-resizer.how.${index}`)), faq: [0, 1].map((index) => ({ q: t(`tool.social-resizer.faq.${index}.question`), a: t(`tool.social-resizer.faq.${index}.answer`) })), relatedTools: getRelatedTools("social-resizer"),
  }} />;
}
