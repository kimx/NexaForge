import { useState } from "react";
import { TextResultActions } from "../../components/text/TextResultActions";
import { TextWorkflowLinks } from "../../components/text/TextWorkflowLinks";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { findAndReplace } from "../../services/text/textWorkflowService";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

const NEXT_TOOLS = [
  { label: "Compare Text", path: "/text/diff" },
  { label: "Clean Text", path: "/text/text-cleaner" },
  { label: "Word Counter", path: "/text/word-counter" },
];

export function FindReplacePage(): JSX.Element {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [flags, setFlags] = useState("g");
  const [output, setOutput] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const tool = FILE_TOOLS.find((item) => item.id === "find-replace") ?? FILE_TOOLS[0];
  const meta: ToolMeta = {
    title: "Find and Replace Text Online | NexaForge",
    description: "Find and replace text or regular expressions locally in your browser for free.",
    canonical: "/text/find-replace",
    h1: "Find and Replace Text Online",
  };
  useSeo(meta);

  const runReplace = (): void => {
    const result = findAndReplace(input, { find, replace, caseSensitive, wholeWord, useRegex, flags });
    setError(result.error);
    setOutput(result.text);
    setSummary(`${result.matches} matches, ${result.replacements} replacements.`);
    setProcessing(result.error ? "error" : "success");
  };
  const toggleFlag = (flag: string): void => {
    setFlags((current) => current.includes(flag)
      ? current.replace(flag, "")
      : "gimsuy".split("").filter((item) => current.includes(item) || item === flag).join(""));
  };
  const clear = (): void => {
    setInput("");
    setFind("");
    setReplace("");
    setOutput("");
    setSummary("");
    setError(null);
    setProcessing("idle");
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", "Find and Replace Text Online"]}
      workflow={{ state: processing, error: error ?? undefined }}
      children={{
        workspace: (
          <div className="tool-form">
            <label htmlFor="find-replace-text">Text<textarea id="find-replace-text" value={input} onChange={(event) => setInput(event.target.value)} rows={10} spellCheck={false} /></label>
            <label htmlFor="find-replace-find">Find<input id="find-replace-find" value={find} onChange={(event) => setFind(event.target.value)} spellCheck={false} /></label>
            <label htmlFor="find-replace-replace">Replace with<input id="find-replace-replace" value={replace} onChange={(event) => setReplace(event.target.value)} spellCheck={false} /></label>
          </div>
        ),
        options: (
          <div className="tool-form find-replace__options text-tool-options">
            <section className="text-tool-options__group" aria-labelledby="find-replace-search-options">
              <h3 id="find-replace-search-options">{t("tool.find-replace.setting.searchRules")}</h3>
              <div className="text-tool-options__choices">
                <label className="checkbox-option"><input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} /> {t("tool.find-replace.option.caseSensitive")}</label>
                <label className="checkbox-option"><input type="checkbox" checked={wholeWord} onChange={(event) => setWholeWord(event.target.checked)} /> {t("tool.find-replace.option.wholeWord")}</label>
                <label className="checkbox-option"><input type="checkbox" checked={useRegex} onChange={(event) => setUseRegex(event.target.checked)} /> {t("tool.find-replace.option.useRegex")}</label>
              </div>
            </section>
            {useRegex ? <section className="text-tool-options__group" aria-labelledby="find-replace-regex-options"><h3 id="find-replace-regex-options">{t("tool.find-replace.setting.regex")}</h3><fieldset className="regex-tester__flags"><legend>{t("tool.find-replace.setting.regexFlags")}</legend><div className="regex-tester__flag-grid">{"gimsuy".split("").map((flag) => <label key={flag} className="regex-tester__flag"><input type="checkbox" checked={flags.includes(flag)} onChange={() => toggleFlag(flag)} /> {flag}</label>)}</div></fieldset><TextWorkflowLinks heading={t("tool.find-replace.setting.regexHelp")} tools={[{ label: t("tool.find-replace.button.testRegex"), path: "/developer/regex-tester" }]} /></section> : null}
            <button type="button" className="btn primary text-tool-options__primary-action" onClick={runReplace}>{t("tool.find-replace.button.replaceAll")}</button>
          </div>
        ),
        result: (
          <div className="tool-form">
            <p role="status">{summary}</p>
            <label htmlFor="find-replace-output">Result<textarea id="find-replace-output" value={output} readOnly rows={10} spellCheck={false} /></label>
            <TextResultActions text={output} filename="replaced-text.txt" onClear={clear} onUseAsInput={setInput} />
          </div>
        ),
        nextActions: <TextWorkflowLinks tools={NEXT_TOOLS} />,
        howItWorks: ["Paste the source text.", "Enter a literal or regular expression to find.", "Replace all matches, then copy or continue your workflow."],
        faq: [
          { q: "Does regex mode upload my pattern?", a: "No. Patterns and text stay in your browser." },
          { q: "What happens with an invalid regex?", a: "The tool keeps your input and shows a validation error." },
        ],
        relatedTools: getRelatedTools("find-replace"),
      }}
    />
  );
}
