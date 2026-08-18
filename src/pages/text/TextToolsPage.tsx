import { useMemo, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
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
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";

export type TextToolKind = "word-counter" | "case-converter" | "remove-duplicate-lines" | "sort-lines";

export function TextToolsPage({ kind }: { kind: TextToolKind }): JSX.Element {
  const { t } = useLanguage();
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

  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [caseMode, setCaseMode] = useState<CaseMode>("upper");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [stats, setStats] = useState<ReturnType<typeof countTextStats> | null>(null);

  const relatedTools = getRelatedTools(kind);
  const howItWorks = useMemo(
    () => [0, 1, 2].map((index) => t(`tool.${kind}.how.${index}`)),
    [kind, t]
  );
  const faq = useMemo(
    () => [0, 1].map((index) => ({ q: t(`tool.${kind}.faq.${index}.question`), a: t(`tool.${kind}.faq.${index}.answer`) })),
    [kind, t]
  );

  const handleProcess = (): void => {
    if (!input) {
      setError(t("error.selectText"));
      setProcessing("error");
      return;
    }

    setError(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: kind });

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
      trackEvent("process_success", { tool: kind });
    } catch (processError) {
      setError(t("error.processingFailed"));
      setProcessing("error");
      trackEvent("process_failed", { tool: kind });
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
        return;
      }
      if (!output) return;
      await navigator.clipboard.writeText(output);
    } catch {
      setError(t("error.copyFailed"));
      setProcessing("error");
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
                <input type="checkbox" checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)} />
                {t("tool.text-tools.option.ignoreCase")}
              </label>
            ) : null}
            {kind === "sort-lines" ? (
              <label htmlFor="sort-direction">
                {t("tool.sort-lines.label.direction")}
                <select id="sort-direction" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
                  <option value="asc">{t("tool.sort-lines.option.asc")}</option>
                  <option value="desc">{t("tool.sort-lines.option.desc")}</option>
                </select>
              </label>
            ) : null}
            <button type="button" className="btn primary" onClick={handleProcess} disabled={processing === "processing"}>
              {processing === "processing" ? t("button.processing") : t("button.process")}
            </button>
          </div>
        ),
        result: kind === "word-counter" ? (
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
        ),
        nextActions: (
          <button type="button" className="btn primary" onClick={copyResult}>
            {t("button.copy")}
          </button>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
