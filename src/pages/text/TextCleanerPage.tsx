import { useState } from "react";
import { TextResultActions } from "../../components/text/TextResultActions";
import { TextWorkflowLinks } from "../../components/text/TextWorkflowLinks";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
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
          <div className="tool-form text-cleaner__options">
            {([
              ["trimLines", "Trim each line"], ["removeLeadingWhitespace", "Remove leading whitespace"],
              ["removeTrailingWhitespace", "Remove trailing whitespace"], ["collapseSpaces", "Collapse extra spaces"],
              ["removeEmptyLines", "Remove empty lines"], ["collapseEmptyLines", "Collapse repeated empty lines"],
              ["tabsToSpaces", "Convert tabs to spaces"], ["normalizeLineEndings", "Normalize line endings"], ["trimDocument", "Trim entire document"],
            ] as Array<[keyof TextCleanerOptions, string]>).map(([key, label]) => (
              <label key={key} className="checkbox-option"><input type="checkbox" checked={Boolean(options[key])} onChange={(event) => updateOption(key, event.target.checked)} /> {label}</label>
            ))}
            <button type="button" className="btn primary" onClick={clean}>Clean text</button>
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
