import { useId, useState } from "react";
import { CodeOutputPanel } from "../../components/CodeOutputPanel";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { jsonToXml, xmlToJson } from "../../services/xml/xmlService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

type ConversionDirection = "json-to-xml" | "xml-to-json";

const JSON_SAMPLE = `{
  "catalog": {
    "@lang": "en",
    "item": ["One", "Two"]
  }
}`;
const XML_SAMPLE = '<catalog lang="en"><item>One</item><item>Two</item></catalog>';

export function JsonXmlPage(): JSX.Element {
  const { t } = useLanguage();
  const fallback: ToolDefinition = { id: "json-xml", title: "JSON ↔ XML", description: "Convert JSON and XML.", path: "/data/json-xml", category: "Data" };
  const tool = FILE_TOOLS.find((item) => item.id === "json-xml") ?? fallback;
  const title = t("tool.json-xml.title");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t("tool.json-xml.description"), canonical: "/data/json-xml", h1: title };
  useSeo(meta);

  const [direction, setDirection] = useState<ConversionDirection>("json-to-xml");
  const [source, setSource] = useState(JSON_SAMPLE);
  const [indent, setIndent] = useState(2);
  const [output, setOutput] = useState("");
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const clearResult = (): void => {
    setOutput("");
    setError(null);
    setState("idle");
  };
  const chooseDirection = (next: ConversionDirection): void => {
    setDirection(next);
    setSource(next === "json-to-xml" ? JSON_SAMPLE : XML_SAMPLE);
    clearResult();
  };
  const convert = (): void => {
    try {
      setOutput(direction === "json-to-xml" ? jsonToXml(source, { indent }) : xmlToJson(source, { indent }));
      setError(null);
      setState("success");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setOutput("");
      setError(t("tool.json-xml.invalid", { message }));
      setState("error");
    }
  };

  const outputIsXml = direction === "json-to-xml";
  return (
    <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} layout="split"
      workflow={{ state, error, onRetry: convert, onReprocess: convert }} children={{
        workspace: <div className="issue23-form">
          <label>{t("tool.json-xml.source")}<textarea value={source} rows={16} spellCheck={false} aria-describedby={error ? errorId : undefined} onChange={(event) => { setSource(event.target.value); clearResult(); }} /></label>
          {error ? <span id={errorId} className="sr-only">{error}</span> : null}
        </div>,
        options: <div className="issue23-form">
          <fieldset><legend>{t("tool.json-xml.title")}</legend>
            <label className="checkbox"><input type="radio" name="direction" checked={direction === "json-to-xml"} onChange={() => chooseDirection("json-to-xml")} />{t("tool.json-xml.jsonToXml")}</label>
            <label className="checkbox"><input type="radio" name="direction" checked={direction === "xml-to-json"} onChange={() => chooseDirection("xml-to-json")} />{t("tool.json-xml.xmlToJson")}</label>
          </fieldset>
          <label>{t("tool.json-xml.indent")}<select value={indent} onChange={(event) => { setIndent(Number(event.target.value)); clearResult(); }}><option value={2}>2</option><option value={4}>4</option></select></label>
          <button type="button" className="btn primary" onClick={convert}>{t(outputIsXml ? "tool.json-xml.convertXml" : "tool.json-xml.convertJson")}</button>
        </div>,
        result: <CodeOutputPanel label={t(outputIsXml ? "tool.json-xml.outputXml" : "tool.json-xml.outputJson")} value={output} fileName={outputIsXml ? "converted.xml" : "converted.json"} language={outputIsXml ? "xml" : "json"} emptyText={t("tool.json-xml.empty")} />,
        howItWorks: [0, 1, 2].map((index) => t(`tool.json-xml.how.${index}`)),
        faq: [0, 1].map((index) => ({ q: t(`tool.json-xml.faq.${index}.question`), a: t(`tool.json-xml.faq.${index}.answer`) })),
        relatedTools: getRelatedTools("json-xml"),
      }} />
  );
}
