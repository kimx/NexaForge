import { useId, useState } from "react";
import { CodeOutputPanel } from "../../components/CodeOutputPanel";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { generateCSharp } from "../../services/codegen/csharpGenerator";
import { generateTypeScript } from "../../services/codegen/typescriptGenerator";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

interface JsonCodeGeneratorPageProps {
  kind: "csharp" | "typescript";
}

const SAMPLE = `{
  "id": 42,
  "name": "Ada",
  "roles": ["admin", "editor"]
}`;

export function JsonCodeGeneratorPage({ kind }: JsonCodeGeneratorPageProps): JSX.Element {
  const { t } = useLanguage();
  const id = kind === "csharp" ? "json-to-csharp" : "json-to-typescript";
  const canonical = kind === "csharp" ? "/developer/json-to-csharp" : "/developer/json-to-typescript";
  const fallback: ToolDefinition = { id, title: id, description: id, path: canonical, category: "Developer" };
  const tool = FILE_TOOLS.find((item) => item.id === id) ?? fallback;
  const title = t(`tool.${id}.title`);
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description: t(`tool.${id}.description`), canonical, h1: title };
  useSeo(meta);

  const [source, setSource] = useState(SAMPLE);
  const [rootName, setRootName] = useState(kind === "csharp" ? "Root" : "RootObject");
  const [namespace, setNamespace] = useState("");
  const [output, setOutput] = useState("");
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const clearResult = (): void => {
    setOutput("");
    setError(null);
    setState("idle");
  };
  const generate = (): void => {
    try {
      const parsed = JSON.parse(source);
      const next = kind === "csharp"
        ? generateCSharp(parsed, { rootName, namespace })
        : generateTypeScript(parsed, { rootName });
      setOutput(next);
      setError(null);
      setState("success");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setOutput("");
      setError(t("tool.codegen.invalidJson", { message }));
      setState("error");
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      layout="split"
      workflow={{ state, error, onRetry: generate, onReprocess: generate }}
      children={{
        workspace: (
          <div className="issue23-form">
            <label>
              {t("tool.codegen.jsonInput")}
              <textarea value={source} rows={16} spellCheck={false} aria-describedby={error ? errorId : undefined} onChange={(event) => { setSource(event.target.value); clearResult(); }} />
            </label>
            {error ? <span id={errorId} className="sr-only">{error}</span> : null}
          </div>
        ),
        options: (
          <div className="issue23-form">
            <label>{t("tool.codegen.rootName")}<input value={rootName} onChange={(event) => { setRootName(event.target.value); clearResult(); }} /></label>
            {kind === "csharp" ? <label>{t("tool.codegen.namespace")}<input value={namespace} onChange={(event) => { setNamespace(event.target.value); clearResult(); }} /></label> : null}
            <button type="button" className="btn primary" onClick={generate}>{t(`tool.${id}.generate`)}</button>
          </div>
        ),
        result: <CodeOutputPanel label={t(`tool.${id}.output`)} value={output} fileName={kind === "csharp" ? "models.cs" : "models.ts"} language={kind} emptyText={t("tool.codegen.empty")} />,
        howItWorks: [0, 1, 2].map((index) => t(`tool.codegen.how.${index}`)),
        faq: [0, 1].map((index) => ({ q: t(`tool.codegen.faq.${index}.question`), a: t(`tool.codegen.faq.${index}.answer`) })),
        relatedTools: getRelatedTools(id),
      }}
    />
  );
}
