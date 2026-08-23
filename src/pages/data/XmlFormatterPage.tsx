import { useId, useState } from "react";
import { CodeOutputPanel } from "../../components/CodeOutputPanel";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { formatXml } from "../../services/xml/xmlService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

const XML_SAMPLE = '<catalog><item id="1">One</item><item id="2">Two</item></catalog>';

export function XmlFormatterPage(): JSX.Element {
  const { t } = useLanguage();
  const fallback: ToolDefinition = { id: "xml-formatter", title: "XML Formatter", description: "Format XML locally.", path: "/data/xml-formatter", category: "Data" };
  const tool = FILE_TOOLS.find((item) => item.id === "xml-formatter") ?? fallback;
  const title = t("tool.xml-formatter.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.xml-formatter.description"), canonical: "/data/xml-formatter", h1: title };
  useSeo(meta);

  const [source, setSource] = useState(XML_SAMPLE);
  const [mode, setMode] = useState<"pretty" | "minify">("pretty");
  const [indent, setIndent] = useState(2);
  const [output, setOutput] = useState("");
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const clearResult = (): void => { setOutput(""); setError(null); setState("idle"); };
  const process = (): void => {
    try {
      setOutput(formatXml(source, { mode, indent }));
      setError(null);
      setState("success");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setOutput("");
      setError(t("tool.xml-formatter.invalid", { message }));
      setState("error");
    }
  };

  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} layout="split" showIdleResult
    workflow={{ state, error, onRetry: process, onReprocess: process }} children={{
      workspace: <div className="issue23-form code-workspace">
        <div className="code-workspace__controls code-workspace__controls--xml">
          <label>{t("tool.xml-formatter.mode")}<select value={mode} onChange={(event) => { setMode(event.target.value as "pretty" | "minify"); clearResult(); }}><option value="pretty">{t("tool.xml-formatter.pretty")}</option><option value="minify">{t("tool.xml-formatter.compact")}</option></select></label>
          <label>{t("tool.json-xml.indent")}<select value={indent} disabled={mode === "minify"} onChange={(event) => { setIndent(Number(event.target.value)); clearResult(); }}><option value={2}>2</option><option value={4}>4</option></select></label>
          <button type="button" className="btn primary code-workspace__process" onClick={process}>{t("tool.xml-formatter.format")}</button>
        </div>
        <label>{t("tool.xml-formatter.input")}<textarea value={source} rows={16} spellCheck={false} aria-describedby={error ? errorId : undefined} onChange={(event) => { setSource(event.target.value); clearResult(); }} /></label>
        {error ? <span id={errorId} className="sr-only">{error}</span> : null}
      </div>,
      options: null,
      result: <CodeOutputPanel label={t("tool.xml-formatter.output")} value={output} fileName="formatted.xml" language="xml" emptyText={t("tool.xml-formatter.empty")} />,
      howItWorks: [0, 1, 2].map((index) => t(`tool.xml-formatter.how.${index}`)),
      faq: [0, 1].map((index) => ({ q: t(`tool.xml-formatter.faq.${index}.question`), a: t(`tool.xml-formatter.faq.${index}.answer`) })),
      relatedTools: getRelatedTools("xml-formatter"),
    }} />;
}
