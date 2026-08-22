import { useMemo, useState } from "react";
import { CodeOutputPanel } from "../../components/CodeOutputPanel";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { useSeo } from "../../hooks/useSeo";
import { optimizeSvg, type SvgOptimizationResult } from "../../services/svg/svgOptimizerService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

const SVG_SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="48" fill="#6750a4" />
  <path d="M36 62l16 16 34-38" fill="none" stroke="white" stroke-width="10" />
</svg>`;

export function SvgOptimizerPage(): JSX.Element {
  const { t } = useLanguage();
  const fallback: ToolDefinition = { id: "svg-optimizer", title: "SVG Optimizer", description: "Optimize SVG locally.", path: "/image/svg-optimizer", category: "Image" };
  const tool = FILE_TOOLS.find((item) => item.id === "svg-optimizer") ?? fallback;
  const title = t("tool.svg-optimizer.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.svg-optimizer.description"), canonical: "/image/svg-optimizer", h1: title };
  useSeo(meta);

  const [source, setSource] = useState(SVG_SAMPLE);
  const [multipass, setMultipass] = useState(true);
  const [result, setResult] = useState<SvgOptimizationResult | null>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const previewBlob = useMemo(() => result?.previewSafe ? new Blob([result.output], { type: "image/svg+xml" }) : null, [result]);
  const previewUrl = useBlobUrl(previewBlob);
  const clearResult = (): void => { setResult(null); setError(null); setState("idle"); };
  const process = async (): Promise<void> => {
    setState("processing");
    setError(null);
    try {
      setResult(await optimizeSvg(source, { multipass }));
      setState("success");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setResult(null);
      setError(t("tool.svg-optimizer.error", { message }));
      setState("error");
    }
  };

  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} layout="split" workflow={{ state, error, onRetry: process, onReprocess: process }} children={{
    workspace: <div className="issue23-form"><label>{t("tool.svg-optimizer.input")}<textarea value={source} rows={16} spellCheck={false} onChange={(event) => { setSource(event.target.value); clearResult(); }} /></label></div>,
    options: <div className="issue23-form"><label className="checkbox"><input type="checkbox" checked={multipass} onChange={(event) => { setMultipass(event.target.checked); clearResult(); }} />{t("tool.svg-optimizer.multipass")}</label><button type="button" className="btn primary" disabled={!source.trim() || state === "processing"} onClick={process}>{t("tool.svg-optimizer.optimize")}</button></div>,
    result: <div className="issue23-form">{result ? <p role="status">{t("tool.svg-optimizer.savings", { before: result.sourceBytes, after: result.outputBytes })}</p> : null}{result && !result.previewSafe ? <p>{t("tool.svg-optimizer.previewDisabled")}</p> : null}{result?.previewSafe && previewUrl ? <img src={previewUrl} alt={t("tool.svg-optimizer.preview")} className="image-preview" /> : null}<CodeOutputPanel label={t("tool.svg-optimizer.output")} value={result?.output ?? ""} fileName="optimized.svg" language="xml" emptyText={t("label.noResult")} /></div>,
    howItWorks: [0, 1, 2].map((index) => t(`tool.svg-optimizer.how.${index}`)),
    faq: [0, 1].map((index) => ({ q: t(`tool.svg-optimizer.faq.${index}.question`), a: t(`tool.svg-optimizer.faq.${index}.answer`) })),
    relatedTools: getRelatedTools("svg-optimizer"),
  }} />;
}
