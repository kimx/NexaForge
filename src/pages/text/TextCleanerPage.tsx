import { TextResultActions } from "../../components/text/TextResultActions";
import { TextWorkflowLinks } from "../../components/text/TextWorkflowLinks";
import { TextWorkflowActions } from "../../components/text/TextWorkflowActions";
import { TextWorkflowPanel } from "../../components/text/TextWorkflowPanel";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { useTextWorkflow, useTextWorkflowDraft } from "../../context/TextWorkflowContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { cleanText, type TextCleanerOptions } from "../../services/text/textWorkflowService";
import { countTextStats } from "../../services/text/textService";
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
  { label: "Compare Text", path: "/text/diff" },
];

export function TextCleanerPage(): JSX.Element {
  const { t } = useLanguage();
  const [draft, setDraft] = useTextWorkflowDraft("text-cleaner");
  const { clear } = useTextWorkflow();
  const { input } = draft;
  const output = draft.output ?? "";
  const options = draft.options.cleaner ?? DEFAULT_OPTIONS;
  const processing: ProcessingState = draft.output !== null ? "success" : "idle";
  const setInput = (value: string): void => setDraft((current) => ({ ...current, input: value, output: null }));
  const tool = FILE_TOOLS.find((item) => item.id === "text-cleaner") ?? FILE_TOOLS[0];
  const meta: ToolMeta = {
    title: "Text Cleaner Online – Remove Spaces & Blank Lines | NexaForge",
    description: "Clean whitespace, tabs, and blank lines locally in your browser for free.",
    canonical: "/text/text-cleaner",
    h1: "Text Cleaner Online",
  };
  useSeo(meta);

  const updateOption = (key: keyof TextCleanerOptions, checked: boolean): void => {
    setDraft((current) => ({ ...current, output: null, options: { ...current.options, cleaner: { ...options, [key]: checked } } }));
  };
  const clean = (): void => {
    const result = cleanText(input, options);
    setDraft((current) => ({ ...current, output: result.text }));
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", "Text Cleaner Online"]}
      workflow={{ state: processing }}
      children={{
        workspace: (
          <>
          <TextWorkflowPanel currentTool="text-cleaner" />
          <label htmlFor="text-cleaner-input">{t("textWorkflow.input")}
            <textarea id="text-cleaner-input" value={input} onChange={(event) => setInput(event.target.value)} rows={10} spellCheck={false} />
          </label>
          </>
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
            <button type="button" className="btn primary text-tool-options__primary-action" onClick={clean} disabled={!input}>{t("tool.text-cleaner.button.clean")}</button>
          </div>
        ),
        result: (
          <div className="tool-form">
            <p role="status">{t("textWorkflow.counts", { before: countTextStats(input).lines, after: countTextStats(output).lines })}</p>
            <label htmlFor="text-cleaner-output">{t("textWorkflow.output")}
              <textarea id="text-cleaner-output" value={output} readOnly rows={10} spellCheck={false} />
            </label>
            <TextResultActions text={output} filename="cleaned-text.txt" onClear={clear} onUseAsInput={setInput} labels={{ copy: t("textWorkflow.copy"), download: t("textWorkflow.download"), clear: t("textWorkflow.clear"), useAsInput: t("textWorkflow.useAsInput") }} />
          </div>
        ),
        nextActions: <><TextWorkflowActions source="text-cleaner" targets={["remove-duplicate-lines", "sort-lines"]} /><TextWorkflowLinks tools={NEXT_TOOLS} /></>,
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
