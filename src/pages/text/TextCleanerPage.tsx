import { useRef, useState } from "react";
import { TextResultActions } from "../../components/text/TextResultActions";
import { TextWorkflowLinks } from "../../components/text/TextWorkflowLinks";
import { TextWorkflowActions } from "../../components/text/TextWorkflowActions";
import { TextWorkflowPanel } from "../../components/text/TextWorkflowPanel";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { useTextWorkflow, useTextWorkflowDraft } from "../../context/TextWorkflowContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { cleanText } from "../../services/text/textWorkflowService";
import { countTextStats } from "../../services/text/textService";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";
import { createOperationId, trackEvent } from "../../utils/analytics";
import { usePersonalization } from "../../hooks/usePersonalization";
import { usePersonalizationCopy } from "../../i18n/personalization";
import { DEFAULT_CLEANER_OPTIONS, saveToolPreferences, type CleanerPreferences } from "../../services/personalization";

const NEXT_TOOLS = [
  { toolId: "find-replace" },
  { toolId: "text-diff" },
];

export function TextCleanerPage(): JSX.Element {
  const { locale, t } = useLanguage();
  const [draft, setDraft] = useTextWorkflowDraft("text-cleaner");
  const { clear } = useTextWorkflow();
  const { input } = draft;
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const operationRef = useRef<{ id: string; startedAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { preferences } = usePersonalization();
  const personalCopy = usePersonalizationCopy();
  const options = preferences.cleaner;
  const resultOptions = draft.options.cleaner ?? DEFAULT_CLEANER_OPTIONS;
  const resultMatchesOptions = (Object.keys(options) as Array<keyof CleanerPreferences>).every((key) => options[key] === resultOptions[key]);
  const output = resultMatchesOptions ? draft.output ?? "" : "";
  const processing: ProcessingState = error ? "error" : draft.output !== null && resultMatchesOptions ? "success" : "idle";
  const setInput = (value: string): void => {
    setError(null);
    setDraft((current) => ({ ...current, input: value, output: null }));
  };
  const tool = FILE_TOOLS.find((item) => item.id === "text-cleaner") ?? FILE_TOOLS[0];
  const title = t("tool.text-cleaner.title");
  const meta: ToolMeta = {
    title: `${title} | ${t("header.title")}`,
    description: t("tool.text-cleaner.description"),
    canonical: "/text/text-cleaner",
    h1: title,
  };
  useSeo(meta);

  const updateOption = (key: keyof CleanerPreferences, checked: boolean): void => {
    setError(null);
    saveToolPreferences({ ...preferences, cleaner: { ...options, [key]: checked } });
    setDraft((current) => ({ ...current, output: null, options: { ...current.options, cleaner: { ...options, [key]: checked } } }));
  };
  const clean = (): void => {
    const operation = { id: createOperationId("text-cleaner"), startedAt: Date.now() };
    operationRef.current = operation;
    setError(null);
    trackEvent("process_start", { tool: "text-cleaner", operationId: operation.id, language: locale });
    try {
      const result = cleanText(input, options);
      setDraft((current) => ({ ...current, output: result.text, options: { ...current.options, cleaner: { ...options } } }));
      trackEvent("process_success", {
        tool: "text-cleaner",
        operationId: operation.id,
        durationMs: Date.now() - operation.startedAt,
        language: locale,
      });
    } catch {
      setError(t("error.processingFailed"));
      trackEvent("process_failed", {
        tool: "text-cleaner",
        operationId: operation.id,
        durationMs: Date.now() - operation.startedAt,
        errorCategory: "processing",
        language: locale,
      });
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
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
            <p className="personalization-hint">{personalCopy.saved}</p>
            <button type="button" className="btn secondary" onClick={() => {
              saveToolPreferences({ ...preferences, cleaner: { ...DEFAULT_CLEANER_OPTIONS } });
              setError(null);
              setDraft((current) => ({ ...current, output: null, options: { ...current.options, cleaner: { ...DEFAULT_CLEANER_OPTIONS } } }));
            }}>{personalCopy.reset}</button>
            {([
              ["edgeWhitespace", [["trimLines", "trimLines"], ["removeLeadingWhitespace", "removeLeadingWhitespace"], ["removeTrailingWhitespace", "removeTrailingWhitespace"]]],
              ["spacing", [["collapseSpaces", "collapseSpaces"], ["removeEmptyLines", "removeEmptyLines"], ["collapseEmptyLines", "collapseEmptyLines"]]],
              ["normalization", [["tabsToSpaces", "tabsToSpaces"], ["normalizeLineEndings", "normalizeLineEndings"], ["trimDocument", "trimDocument"]]],
            ] as Array<[string, Array<[keyof CleanerPreferences, string]>]>).map(([group, items]) => (
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
              <textarea id="text-cleaner-output" ref={outputRef} value={output} readOnly rows={10} spellCheck={false} />
            </label>
            <TextResultActions text={output} filename="cleaned-text.txt" onClear={clear} onUseAsInput={setInput} resultRef={outputRef} tool="text-cleaner" operationId={operationRef.current?.id} labels={{ copy: t("textWorkflow.copy"), download: t("textWorkflow.download"), clear: t("textWorkflow.clear"), useAsInput: t("textWorkflow.useAsInput") }} />
          </div>
        ),
        nextActions: <><TextWorkflowActions source="text-cleaner" targets={["remove-duplicate-lines", "sort-lines"]} /><TextWorkflowLinks tools={NEXT_TOOLS} /></>,
        howItWorks: [0, 1, 2].map((index) => t(`tool.text-cleaner.how.${index}`)),
        faq: [
          { q: t("tool.text-cleaner.faq.0.question"), a: t("tool.text-cleaner.faq.0.answer") },
          { q: t("tool.text-cleaner.faq.1.question"), a: t("tool.text-cleaner.faq.1.answer") },
        ],
        relatedTools: getRelatedTools("text-cleaner"),
      }}
    />
  );
}
