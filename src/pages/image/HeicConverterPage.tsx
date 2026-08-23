import { useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { DownloadButton } from "../../components/DownloadButton";
import { SizeComparison } from "../../components/SizeComparison";
import { FILE_TOOLS } from "../../data/tools";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { useLanguage } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import { convertHeic } from "../../services/image/heicService";
import { getRelatedTools } from "../../utils/toolHelpers";
import type { FileProcessResult, ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";

export function HeicConverterPage(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg");
  const [quality, setQuality] = useState(85);
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useBlobUrl(result?.blob);
  const fallback: ToolDefinition = { id: "heic-converter", title: "HEIC → JPG / PNG", description: "Convert HEIC locally.", path: "/image/heic-converter", category: "Image" };
  const tool = FILE_TOOLS.find((item) => item.id === "heic-converter") ?? fallback;
  const title = t("tool.heic-converter.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.heic-converter.description"), canonical: "/image/heic-converter", h1: title };
  useSeo(meta);
  const clearResult = (): void => { setResult(null); setError(null); setState("idle"); };
  const process = async (): Promise<void> => {
    if (!files[0]) return;
    setState("processing"); setError(null); setResult(null);
    try {
      setResult(await convertHeic(files[0], { format, quality: quality / 100 }));
      setState("success");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(t("tool.heic-converter.error", { message })); setState("error");
    }
  };
  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} workflow={{ state, error, onRetry: process, onReprocess: process }} children={{
    workspace: <><FileDropzone label={t("label.dropImage")} accept=".heic,.heif,image/heic,image/heif" onFiles={(next) => { setFiles(next.slice(0, 1)); clearResult(); }} multiple={false} compact={files.length > 0} /><FileInfo files={files} mode="single" onClear={() => { setFiles([]); clearResult(); }} compact={files.length > 0} /></>,
    options: <div className="issue23-form"><label>{t("label.outputFormat")}<select value={format} onChange={(event) => { setFormat(event.target.value as "jpeg" | "png"); clearResult(); }}><option value="jpeg">JPG</option><option value="png">PNG</option></select></label><label>{t("label.quality")}: {quality}<input type="range" min={1} max={100} value={quality} disabled={format === "png"} onChange={(event) => { setQuality(Number(event.target.value)); clearResult(); }} /></label><button type="button" className="btn primary" disabled={!files.length || state === "processing"} onClick={process}>{t("tool.heic-converter.convert")}</button></div>,
    result: result ? <><SizeComparison originalSize={files[0]?.size ?? 0} outputSize={result.size} /><img src={previewUrl} alt={t("label.preview")} className="preview-image" /><DownloadButton result={result} /></> : <p>{t("label.noResult")}</p>,
    howItWorks: [0, 1, 2].map((index) => t(`tool.heic-converter.how.${index}`)),
    faq: [0, 1].map((index) => ({ q: t(`tool.heic-converter.faq.${index}.question`), a: t(`tool.heic-converter.faq.${index}.answer`) })),
    relatedTools: getRelatedTools("heic-converter"),
  }} />;
}
