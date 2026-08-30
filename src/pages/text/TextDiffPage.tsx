import { useState } from "react";
import { TextResultActions } from "../../components/text/TextResultActions";
import { TextWorkflowLinks } from "../../components/text/TextWorkflowLinks";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { compareText, type TextDiffResult } from "../../services/text/textWorkflowService";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

const NEXT_TOOLS = [
  { label: "Clean Text", path: "/text/text-cleaner" },
  { label: "Sort Lines", path: "/text/sort-lines" },
];

function unifiedOutput(result: TextDiffResult): string {
  return result.lines.map((line) => `${line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}${line.text}`).join("\n");
}

export function TextDiffPage(): JSX.Element {
  const { t } = useLanguage();
  const [original, setOriginal] = useState("");
  const [changed, setChanged] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [mode, setMode] = useState<"side-by-side" | "unified">("side-by-side");
  const [result, setResult] = useState<TextDiffResult | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const tool = FILE_TOOLS.find((item) => item.id === "text-diff") ?? FILE_TOOLS[0];
  const meta: ToolMeta = {
    title: "Compare Text Online – Text Diff Checker | NexaForge",
    description: "Compare two texts with a private browser-only line diff, with no registration required.",
    canonical: "/text/diff",
    h1: "Compare Text Online",
  };
  useSeo(meta);

  const compare = (): void => {
    setResult(compareText(original, changed, { ignoreWhitespace, ignoreCase }));
    setProcessing("success");
  };
  const clear = (): void => {
    setOriginal("");
    setChanged("");
    setResult(null);
    setProcessing("idle");
  };
  const output = result ? unifiedOutput(result) : "";

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", "Compare Text Online"]}
      workflow={{ state: processing }}
      children={{
        workspace: (
          <div className="tool-form text-diff-inputs">
            <label htmlFor="text-diff-original">Original<textarea id="text-diff-original" value={original} onChange={(event) => setOriginal(event.target.value)} rows={10} spellCheck={false} /></label>
            <label htmlFor="text-diff-changed">Changed<textarea id="text-diff-changed" value={changed} onChange={(event) => setChanged(event.target.value)} rows={10} spellCheck={false} /></label>
          </div>
        ),
        options: (
          <div className="tool-form text-diff__options text-tool-options">
            <section className="text-tool-options__group" aria-labelledby="text-diff-comparison-rules">
              <h3 id="text-diff-comparison-rules">{t("tool.text-diff.setting.comparisonRules")}</h3>
              <div className="text-tool-options__choices">
                <label className="checkbox-option"><input type="checkbox" checked={ignoreWhitespace} onChange={(event) => setIgnoreWhitespace(event.target.checked)} /> {t("tool.text-diff.option.ignoreWhitespace")}</label>
                <label className="checkbox-option"><input type="checkbox" checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)} /> {t("tool.text-diff.option.ignoreCase")}</label>
              </div>
            </section>
            <section className="text-tool-options__group" aria-labelledby="text-diff-display-mode">
              <h3 id="text-diff-display-mode">{t("tool.text-diff.setting.displayMode")}</h3>
              <fieldset className="text-diff__modes"><legend>{t("tool.text-diff.setting.outputFormat")}</legend>
                <label><input type="radio" name="diff-mode" checked={mode === "side-by-side"} onChange={() => setMode("side-by-side")} /> {t("tool.text-diff.mode.sideBySide")}</label>
                <label><input type="radio" name="diff-mode" checked={mode === "unified"} onChange={() => setMode("unified")} /> {t("tool.text-diff.mode.unified")}</label>
              </fieldset>
            </section>
            <div className="tool-actions text-tool-options__actions"><button type="button" className="btn primary" onClick={compare}>{t("tool.text-diff.button.startCompare")}</button><button type="button" className="btn secondary" onClick={clear}>{t("tool.text-diff.button.clear")}</button></div>
          </div>
        ),
        result: result ? (
          <div className="text-diff-result">
            {result.identical ? <p role="status">No differences found.</p> : <p role="status">{result.additions} additions, {result.removals} removals.</p>}
            {mode === "unified" ? (
              <pre className="text-diff-unified" aria-label="Unified text differences">{output}</pre>
            ) : (
              <div className="text-diff-table" role="table" aria-label="Side-by-side text differences">
                {result.lines.map((line, index) => (
                  <div className={`text-diff-row text-diff-row--${line.type}`} role="row" key={`${line.type}-${index}-${line.originalLine}-${line.changedLine}`} aria-label={`${line.type === "added" ? "Added" : line.type === "removed" ? "Removed" : "Unchanged"} line`}>
                    <span aria-hidden="true">{line.type === "added" ? "+" : line.type === "removed" ? "-" : "="}</span>
                    <span>{line.originalLine ?? ""}</span><code>{line.type === "removed" || line.type === "unchanged" ? line.text : ""}</code>
                    <span>{line.changedLine ?? ""}</span><code>{line.type === "added" || line.type === "unchanged" ? line.text : ""}</code>
                  </div>
                ))}
              </div>
            )}
            <TextResultActions text={output} filename="text-diff.txt" onClear={clear} />
          </div>
        ) : <p>Enter two texts and select Compare.</p>,
        nextActions: <TextWorkflowLinks tools={NEXT_TOOLS} />,
        howItWorks: ["Paste the original and changed text.", "Select Compare when you are ready to calculate differences.", "Review additions, removals, and unchanged lines."],
        faq: [
          { q: "Does the diff run while I type?", a: "No. It runs only when you select Compare." },
          { q: "Is text uploaded?", a: "No. Both inputs are compared locally in this browser." },
        ],
        relatedTools: getRelatedTools("text-diff"),
      }}
    />
  );
}
