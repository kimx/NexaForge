import { useState } from "react";
import { TextResultActions } from "../../components/text/TextResultActions";
import { TextWorkflowLinks } from "../../components/text/TextWorkflowLinks";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { cleanText, type TextCleanerOptions } from "../../services/text/textWorkflowService";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

const DEFAULT_OPTIONS: TextCleanerOptions = {
  trimLines: false,
  removeLeadingWhitespace: false,
  removeTrailingWhitespace: false,
  collapseSpaces: false,
  removeEmptyLines: false,
  collapseEmptyLines: false,
  tabsToSpaces: false,
  normalizeLineEndings: true,
  trimDocument: false,
};

const NEXT_TOOLS = [
  { label: "Find & Replace", path: "/text/find-replace" },
  { label: "Remove Duplicate Lines", path: "/text/remove-duplicate-lines" },
  { label: "Sort Lines", path: "/text/sort-lines" },
  { label: "Compare Text", path: "/text/diff" },
];

export function TextCleanerPage(): JSX.Element {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<TextCleanerOptions>(DEFAULT_OPTIONS);
  const [output, setOutput] = useState("");
  const [beforeLines, setBeforeLines] = useState(0);
  const [afterLines, setAfterLines] = useState(0);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const tool = FILE_TOOLS.find((item) => item.id === "text-cleaner") ?? FILE_TOOLS[0];
  const meta: ToolMeta = {
    title: "Text Cleaner Online – Remove Spaces & Blank Lines | NexaForge",
    description: "Clean whitespace, tabs, and blank lines locally in your browser for free.",
    canonical: "/text/text-cleaner",
    h1: "Text Cleaner Online",
  };
  useSeo(meta);

  const updateOption = (key: keyof TextCleanerOptions, checked: boolean): void => {
    setOptions((current) => ({ ...current, [key]: checked }));
  };
  const clean = (): void => {
    const result = cleanText(input, options);
    setOutput(result.text);
    setBeforeLines(result.beforeLines);
    setAfterLines(result.afterLines);
    setProcessing("success");
  };
  const clear = (): void => {
    setInput("");
    setOutput("");
    setBeforeLines(0);
    setAfterLines(0);
    setProcessing("idle");
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", "Text Cleaner Online"]}
      workflow={{ state: processing }}
      children={{
        workspace: (
          <label htmlFor="text-cleaner-input">Input text
            <textarea id="text-cleaner-input" value={input} onChange={(event) => setInput(event.target.value)} rows={10} spellCheck={false} />
          </label>
        ),
        options: (
          <div className="tool-form text-cleaner__options text-tool-options">
            {([
              ["edgeWhitespace", [["trimLines", "trimLines"], ["removeLeadingWhitespace", "removeLeadingWhitespace"], ["removeTrailingWhitespace", "removeTrailingWhitespace"]]],
              ["spacing", [["collapseSpaces", "collapseSpaces"], ["removeEmptyLines", "removeEmptyLines"], ["collapseEmptyLines", "collapseEmptyLines"]]],
              ["normalization", [["tabsToSpaces", "tabsToSpaces"], ["normalizeLineEndings", "normalizeLineEndings"], ["trimDocument", "trimDocument"]]],
            ] as Array<[string, Array<[keyof TextCleanerOptions, string]>]>).map(([group, items]) => (
              <section key={group} className="text-tool-options__group" aria-labelledby={`text-cleaner-${group}`}>
                <h3 id={`text-cleaner-${group}`}>{t(`tool.text-cleaner.setting.${group}`)}</h3>
                <div className="text-tool-options__choices">
                  {items.map(([key, label]) => (
                    <label key={key} className="checkbox-option"><input type="checkbox" checked={Boolean(options[key])} onChange={(event) => updateOption(key, event.target.checked)} /> {t(`tool.text-cleaner.option.${label}`)}</label>
                  ))}
                </div>
              </section>
            ))}
            <button type="button" className="btn primary text-tool-options__primary-action" onClick={clean}>{t("tool.text-cleaner.button.clean")}</button>
          </div>
        ),
        result: (
          <div className="tool-form">
            <p role="status">Before: {beforeLines} lines. After: {afterLines} lines.</p>
            <label htmlFor="text-cleaner-output">Cleaned text
              <textarea id="text-cleaner-output" value={output} readOnly rows={10} spellCheck={false} />
            </label>
            <TextResultActions text={output} filename="cleaned-text.txt" onClear={clear} onUseAsInput={setInput} />
          </div>
        ),
        nextActions: <TextWorkflowLinks tools={NEXT_TOOLS} />,
        howItWorks: ["Paste text into the input.", "Choose the cleanup rules you need.", "Clean, copy, download, or continue to the next tool."],
        faq: [
          { q: "Is my text uploaded?", a: "No. Text cleaning runs only in this browser." },
          { q: "Can I combine rules?", a: "Yes. Every enabled rule is applied in one deterministic pass." },
        ],
        relatedTools: getRelatedTools("text-cleaner"),
      }}
    />
  );
}
