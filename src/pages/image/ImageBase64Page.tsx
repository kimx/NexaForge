import { useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { CodeOutputPanel } from "../../components/CodeOutputPanel";
import { FILE_TOOLS } from "../../data/tools";
import { useLanguage } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import { fileToBase64 } from "../../services/text/textService";
import { getRelatedTools } from "../../utils/toolHelpers";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";

export function ImageBase64Page(): JSX.Element {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"raw" | "data-url">("raw");
  const [output, setOutput] = useState("");
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const fallback: ToolDefinition = { id: "image-base64", title: "Image → Base64", description: "Encode images.", path: "/image/base64", category: "Image" };
  const tool = FILE_TOOLS.find((item) => item.id === "image-base64") ?? fallback;
  const title = t("tool.image-base64.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.image-base64.description"), canonical: "/image/base64", h1: title };
  useSeo(meta);
  const clear = (): void => { setOutput(""); setError(null); setState("idle"); };
  const encode = async (): Promise<void> => {
    if (!files[0]) return;
    setState("processing"); setError(null);
    try {
      const raw = await fileToBase64(files[0]);
      setOutput(mode === "data-url" ? `data:${files[0].type || "application/octet-stream"};base64,${raw}` : raw);
      setState("success");
    } catch { setError(t("tool.image-base64.error")); setState("error"); }
  };
  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} layout="split" workflow={{ state, error, onRetry: encode, onReprocess: encode }} children={{
    workspace: <><FileDropzone label={t("label.dropImage")} accept="image/*,.svg,.avif" onFiles={(next) => { setFiles(next.slice(0, 1)); clear(); }} multiple={false} compact={files.length > 0} /><FileInfo files={files} mode="single" onClear={() => { setFiles([]); clear(); }} compact={files.length > 0} /></>,
    options: <div className="issue23-form"><fieldset><legend>{t("tool.image-base64.title")}</legend><label className="checkbox"><input type="radio" name="base64-mode" checked={mode === "raw"} onChange={() => { setMode("raw"); clear(); }} />{t("tool.image-base64.raw")}</label><label className="checkbox"><input type="radio" name="base64-mode" checked={mode === "data-url"} onChange={() => { setMode("data-url"); clear(); }} />{t("tool.image-base64.dataUrl")}</label></fieldset><button type="button" className="btn primary" disabled={!files.length || state === "processing"} onClick={encode}>{t("tool.image-base64.encode")}</button></div>,
    result: <CodeOutputPanel label={t("tool.image-base64.output")} value={output} fileName={`${files[0]?.name || "image"}.base64.txt`} language="text" emptyText={t("label.noResult")} />,
    howItWorks: [0, 1, 2].map((index) => t(`tool.image-base64.how.${index}`)), faq: [0, 1].map((index) => ({ q: t(`tool.image-base64.faq.${index}.question`), a: t(`tool.image-base64.faq.${index}.answer`) })), relatedTools: getRelatedTools("image-base64"),
  }} />;
}
