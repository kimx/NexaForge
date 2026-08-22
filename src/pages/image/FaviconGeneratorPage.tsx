import { useRef, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { DownloadCollectionButton } from "../../components/DownloadCollectionButton";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { generateFaviconSet, readImageDimensions } from "../../services/image/faviconService";
import type { FileProcessResult, ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

export function FaviconGeneratorPage(): JSX.Element {
  const { t } = useLanguage();
  const fallback: ToolDefinition = { id: "favicon-generator", title: "Favicon Generator", description: "Generate a favicon set locally.", path: "/image/favicon-generator", category: "Image" };
  const tool = FILE_TOOLS.find((item) => item.id === "favicon-generator") ?? fallback;
  const title = t("tool.favicon-generator.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.favicon-generator.description"), canonical: "/image/favicon-generator", h1: title };
  useSeo(meta);
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [appName, setAppName] = useState("");
  const [results, setResults] = useState<FileProcessResult[]>([]);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const operation = useRef(0);
  const clearResult = (): void => { operation.current += 1; setResults([]); setError(null); setState("idle"); };
  const selectFile = (next: File): void => {
    clearResult(); setFile(next); setDimensions(null);
    const current = operation.current;
    void readImageDimensions(next).then((value) => { if (current === operation.current) setDimensions(value); }).catch(() => undefined);
  };
  const process = async (): Promise<void> => {
    if (!file) return;
    const current = ++operation.current;
    setState("processing"); setError(null); setResults([]);
    try {
      const next = await generateFaviconSet(file, { appName });
      if (current !== operation.current) return;
      setResults(next); setState("success");
    } catch (cause) {
      if (current !== operation.current) return;
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(t("tool.favicon-generator.error", { message })); setState("error");
    }
  };
  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} workflow={{ state, error, onRetry: process, onReprocess: process }} children={{
    workspace: <><FileDropzone label={t("label.dropImage")} accept="image/png,image/jpeg,image/webp,image/avif" multiple={false} onFiles={(files) => selectFile(files[0])} /><FileInfo files={file ? [file] : []} onClear={() => { clearResult(); setFile(null); setDimensions(null); }} />{dimensions && dimensions.width !== dimensions.height ? <p role="status">{t("tool.favicon-generator.nonSquare")}</p> : null}</>,
    options: <div className="issue23-form"><label>{t("tool.favicon-generator.appName")}<input value={appName} onChange={(event) => { setAppName(event.target.value); clearResult(); }} /></label><button type="button" className="btn primary" disabled={!file || state === "processing"} onClick={process}>{t("tool.favicon-generator.generate")}</button></div>,
    result: results.length ? <><ul className="batch-file-results">{results.map((result) => <li key={result.fileName}><span>{result.fileName}</span><DownloadButton result={result} label={t("batch.downloadFile", { name: result.fileName })} /></li>)}</ul><DownloadCollectionButton results={results} fileName="favicon-set.zip" /></> : <p>{t("label.noResult")}</p>,
    howItWorks: [0, 1, 2].map((index) => t(`tool.favicon-generator.how.${index}`)), faq: [0, 1].map((index) => ({ q: t(`tool.favicon-generator.faq.${index}.question`), a: t(`tool.favicon-generator.faq.${index}.answer`) })), relatedTools: getRelatedTools("favicon-generator"),
  }} />;
}
