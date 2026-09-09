import { useEffect, useMemo, useRef, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { TextWorkflowLinks } from "../../components/text/TextWorkflowLinks";
import { TextWorkflowActions } from "../../components/text/TextWorkflowActions";
import { TextWorkflowPanel } from "../../components/text/TextWorkflowPanel";
import { useTextWorkflowDraft } from "../../context/TextWorkflowContext";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  convertTextCase,
  countTextStats,
  removeDuplicateLines,
  sortTextLines,
  type CaseMode,
  type SortDirection,
} from "../../services/text/textService";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { createOperationId, trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";
import { downloadBlob } from "../../utils/download";

export type TextToolKind = "word-counter" | "case-converter" | "remove-duplicate-lines" | "sort-lines";

export function TextToolsPage({ kind }: { kind: TextToolKind }): JSX.Element {
  return <TextToolWorkspace key={kind} kind={kind} />;
}

function TextToolWorkspace({ kind }: { kind: TextToolKind }): JSX.Element {
  const { locale, t } = useLanguage();
  const tool = FILE_TOOLS.find((item) => item.id === kind) ?? FILE_TOOLS[0];
  const title = t(`tool.${kind}.title`);
  const description = t(`tool.${kind}.description`);
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: tool.path,
    h1: title,
  };
  useSeo(toolMeta);

  const workflowTool = kind === "remove-duplicate-lines" || kind === "sort-lines" ? kind : undefined;
  const [draft, setDraft] = useTextWorkflowDraft(workflowTool);
  const { input } = draft;
  const output = draft.output ?? "";
  const setInput = (value: string): void => setDraft((current) => ({ ...current, input: value, output: null }));
  const setOutput = (value: string): void => setDraft((current) => ({ ...current, output: value }));
  const [localProcessing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const processing: ProcessingState = workflowTool
    ? error ? "error" : draft.output !== null ? "success" : input ? "ready" : "idle"
    : localProcessing;
  const [caseMode, setCaseMode] = useState<CaseMode>("upper");
  const sortDirection = draft.options.sortDirection ?? "asc";
  const ignoreCase = draft.options.ignoreCase ?? true;
  const [stats, setStats] = useState<ReturnType<typeof countTextStats> | null>(null);
  const operationRef = useRef<{ id: string; startedAt: number } | null>(null);
  useEffect(() => { setError(null); }, [draft]);

  const relatedTools = getRelatedTools(kind);
  const nextTools = kind === "remove-duplicate-lines"
    ? [{ toolId: "text-diff" }]
    : kind === "sort-lines"
      ? [{ toolId: "text-diff" }]
      : [];
  const howItWorks = useMemo(
    () => [0, 1, 2].map((index) => t(`tool.${kind}.how.${index}`)),
    [kind, t]
  );
  const faq = useMemo(
    () => [0, 1].map((index) => ({ q: t(`tool.${kind}.faq.${index}.question`), a: t(`tool.${kind}.faq.${index}.answer`) })),
    [kind, t]
  );

  const handleProcess = (): void => {
    const operation = { id: createOperationId(kind), startedAt: Date.now() };
    operationRef.current = operation;
    trackEvent("process_start", { tool: kind, operationId: operation.id, language: locale });
    if (!input) {
      setError(t("error.selectText"));
      setProcessing("error");
      trackEvent("process_failed", {
        tool: kind,
        operationId: operation.id,
        durationMs: Date.now() - operation.startedAt,
        errorCategory: "validation",
        language: locale,
      });
      return;
    }

    setError(null);
    setProcessing("processing");
    try {
      if (kind === "word-counter") {
        setStats(countTextStats(input));
        setOutput("");
      } else if (kind === "case-converter") {
        setOutput(convertTextCase(input, caseMode));
        setStats(null);
      } else if (kind === "remove-duplicate-lines") {
        setOutput(removeDuplicateLines(input, { ignoreCase }));
        setStats(null);
      } else {
        setOutput(sortTextLines(input, { direction: sortDirection, ignoreCase }));
        setStats(null);
      }
      setProcessing("success");
      trackEvent("process_success", {
        tool: kind,
        operationId: operation.id,
        durationMs: Date.now() - operation.startedAt,
        language: locale,
      });
    } catch (processError) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", {
        tool: kind,
        operationId: operation.id,
        durationMs: Date.now() - operation.startedAt,
        errorCategory: "processing",
        language: locale,
      });
      console.error(processError);
    }
  };

  const copyResult = async (): Promise<void> => {
    try {
      if (kind === "word-counter") {
        if (!stats) return;
        await navigator.clipboard.writeText(
          [
            `${t("tool.word-counter.label.characters")}: ${stats.characters}`,
            `${t("tool.word-counter.label.charactersNoSpaces")}: ${stats.charactersNoSpaces}`,
            `${t("tool.word-counter.label.words")}: ${stats.words}`,
            `${t("tool.word-counter.label.lines")}: ${stats.lines}`,
            `${t("tool.word-counter.label.nonEmptyLines")}: ${stats.nonEmptyLines}`,
          ].join("\n")
        );
        trackEvent("copy_success", { tool: kind, operationId: operationRef.current?.id, language: locale });
        return;
      }
      if (!output) return;
      await navigator.clipboard.writeText(output);
      trackEvent("copy_success", { tool: kind, operationId: operationRef.current?.id, language: locale });
    } catch {
      setError(t("error.copyFailed"));
      setProcessing("error");
      trackEvent("copy_failed", { tool: kind, operationId: operationRef.current?.id, errorCategory: "copy", language: locale });
    }
  };

  return (
    <ToolPageTemplate
      tool={tool}
      meta={toolMeta}
      breadcrumb={["Home", title]}
      workflow={{ state: processing, error, onRetry: handleProcess, onReprocess: handleProcess }}
      children={{
        workspace: (
          <div className="tool-form">
            {workflowTool ? <TextWorkflowPanel currentTool={workflowTool} /> : null}
            <label htmlFor={`${kind}-input`}>{t(`tool.${kind}.label.input`)}</label>
            <textarea
              id={`${kind}-input`}
              rows={12}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setProcessing(event.target.value ? "ready" : "idle");
              }}
            />
          </div>
        ),
        options: (
          <div className="tool-form">
            {kind === "case-converter" ? (
              <label htmlFor="case-mode">
                {t("label.mode")}
                <select id="case-mode" value={caseMode} onChange={(event) => setCaseMode(event.target.value as CaseMode)}>
                  <option value="upper">{t("tool.case-converter.option.upper")}</option>
                  <option value="lower">{t("tool.case-converter.option.lower")}</option>
                  <option value="title">{t("tool.case-converter.option.title")}</option>
                  <option value="sentence">{t("tool.case-converter.option.sentence")}</option>
                </select>
              </label>
            ) : null}
            {(kind === "remove-duplicate-lines" || kind === "sort-lines") ? (
              <label className="checkbox">
                <input type="checkbox" checked={ignoreCase} onChange={(event) => setDraft((current) => ({ ...current, output: null, options: { ...current.options, ignoreCase: event.target.checked } }))} />
                {t("tool.text-tools.option.ignoreCase")}
              </label>
            ) : null}
            {kind === "sort-lines" ? (
              <label htmlFor="sort-direction">
                {t("tool.sort-lines.label.direction")}
                <select id="sort-direction" value={sortDirection} onChange={(event) => setDraft((current) => ({ ...current, output: null, options: { ...current.options, sortDirection: event.target.value as SortDirection } }))}>
                  <option value="asc">{t("tool.sort-lines.option.asc")}</option>
                  <option value="desc">{t("tool.sort-lines.option.desc")}</option>
                </select>
              </label>
            ) : null}
            <button type="button" className="btn primary" onClick={handleProcess} disabled={processing === "processing" || Boolean(workflowTool && !input)}>
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            {kind === "word-counter" ? (
              stats ? (
                <dl className="tool-form">
                  <div><dt><strong>{t("tool.word-counter.label.characters")}</strong></dt><dd>{stats.characters}</dd></div>
                  <div><dt><strong>{t("tool.word-counter.label.charactersNoSpaces")}</strong></dt><dd>{stats.charactersNoSpaces}</dd></div>
                  <div><dt><strong>{t("tool.word-counter.label.words")}</strong></dt><dd>{stats.words}</dd></div>
                  <div><dt><strong>{t("tool.word-counter.label.lines")}</strong></dt><dd>{stats.lines}</dd></div>
                  <div><dt><strong>{t("tool.word-counter.label.nonEmptyLines")}</strong></dt><dd>{stats.nonEmptyLines}</dd></div>
                </dl>
              ) : (
                <p>{t("tool.word-counter.label.noOutput")}</p>
              )
            ) : (
              <pre>{output || t(`tool.${kind}.label.noOutput`)}</pre>
            )}
            <div className="tool-actions">
              <button type="button" className="btn secondary" onClick={copyResult} disabled={Boolean(workflowTool && !output)}>
                {t("button.copy")}
              </button>
              {workflowTool ? (
                <button type="button" className="btn secondary" disabled={!output} onClick={() => {
                  try {
                    downloadBlob(new Blob([output], { type: "text/plain;charset=utf-8" }), `${kind}.txt`);
                    trackEvent("download_triggered", { tool: kind, operationId: operationRef.current?.id, language: locale });
                  } catch {
                    // The browser owns the save prompt; a failed trigger is not a saved file.
                  }
                }}>
                  {t("textWorkflow.download")}
                </button>
              ) : null}
            </div>
          </>
        ),
        nextActions: workflowTool ? <><TextWorkflowActions source={workflowTool} targets={workflowTool === "remove-duplicate-lines" ? ["sort-lines"] : ["remove-duplicate-lines"]} /><TextWorkflowLinks tools={nextTools} /></> : undefined,
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
