import { useEffect, useId, useMemo, useState } from "react";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { CodeEditorToolkit, type CodeEditorError } from "../../components/CodeEditorToolkit";
import { useLanguage, useLocalizedToolMeta } from "../../context/LanguageContext";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useSeoLanding } from "../../hooks/useSeoLanding";
import { jsonToYaml, yamlToJson } from "../../services/yaml/yamlService";

type DeveloperToolKind = "url-encoder" | "unix-timestamp" | "json-yaml" | "json-diff";

interface DeveloperToolsPageProps {
  kind: DeveloperToolKind;
}

const JSON_TOOL_SAMPLE = JSON.stringify({
  name: "NexaForge",
  active: true,
  tags: ["json", "sample"],
}, null, 2);

const YAML_TOOL_SAMPLE = `name: "NexaForge"
active: true
tags:
  - "yaml"
  - "sample"`;

const JSON_DIFF_RIGHT_SAMPLE = JSON.stringify({
  name: "NexaForge",
  active: false,
  tags: ["json", "sample", "diff"],
}, null, 2);

function initialInputFor(kind: DeveloperToolKind): string {
  return kind === "json-yaml" || kind === "json-diff" ? JSON_TOOL_SAMPLE : "";
}

function initialModeFor(kind: DeveloperToolKind): string {
  if (kind === "json-yaml") return "json-to-yaml";
  if (kind === "unix-timestamp") return "timestamp-to-date";
  return "encode";
}

export function jsonDiff(left: unknown, right: unknown): string {
  const leftLines = JSON.stringify(left, null, 2).split("\n");
  const rightLines = JSON.stringify(right, null, 2).split("\n");
  if (leftLines.join("\n") === rightLines.join("\n")) return "No differences.";

  const commonLengths = Array.from({ length: leftLines.length + 1 }, () =>
    Array<number>(rightLines.length + 1).fill(0)
  );
  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightLines.length - 1; rightIndex >= 0; rightIndex -= 1) {
      commonLengths[leftIndex][rightIndex] = leftLines[leftIndex] === rightLines[rightIndex]
        ? commonLengths[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(commonLengths[leftIndex + 1][rightIndex], commonLengths[leftIndex][rightIndex + 1]);
    }
  }

  const diffLines: string[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    if (leftIndex < leftLines.length && rightIndex < rightLines.length && leftLines[leftIndex] === rightLines[rightIndex]) {
      diffLines.push(`  ${leftLines[leftIndex]}`);
      leftIndex += 1;
      rightIndex += 1;
    } else if (
      leftIndex < leftLines.length &&
      (rightIndex === rightLines.length || commonLengths[leftIndex + 1][rightIndex] >= commonLengths[leftIndex][rightIndex + 1])
    ) {
      diffLines.push(`- ${leftLines[leftIndex]}`);
      leftIndex += 1;
    } else {
      diffLines.push(`+ ${rightLines[rightIndex]}`);
      rightIndex += 1;
    }
  }

  return ["--- left", "+++ right", ...diffLines].join("\n");
}

function JsonDiffOutput({ output }: { output: string }): JSX.Element {
  if (!output || output === "No differences.") {
    return <pre className="developer-output">{output}</pre>;
  }

  return (
    <pre className="developer-output developer-output--diff">
      {output.split("\n").map((line, index) => {
        const lineType = line.startsWith("+ ") ? "added" : line.startsWith("- ") ? "removed" : line.startsWith("---") || line.startsWith("+++") ? "header" : "context";
        return (
          <span className={`developer-output__line developer-output__line--${lineType}`} key={`${line}-${index}`}>
            {line}
          </span>
        );
      })}
    </pre>
  );
}

function jsonEditorError(text: string, error: unknown, prefix: string): CodeEditorError {
  const message = error instanceof Error ? error.message : String(error);
  const positionMatch = /position (\d+)/i.exec(message);
  if (!positionMatch) return { message: `${prefix}: ${message}` };

  const position = Math.max(0, Math.min(Number(positionMatch[1]), text.length));
  const before = text.slice(0, position);
  return {
    message: `${prefix}: ${message}`,
    line: before.split("\n").length,
    column: position - before.lastIndexOf("\n"),
  };
}

function editorError(error: unknown, fallback: string): CodeEditorError {
  if (error && typeof error === "object" && "line" in error && "column" in error) {
    const located = error as { message?: unknown; line?: unknown; column?: unknown };
    return {
      message: located.message instanceof Error ? located.message.message : String(located.message ?? fallback),
      line: typeof located.line === "number" ? located.line : null,
      column: typeof located.column === "number" ? located.column : null,
    };
  }
  return { message: error instanceof Error ? error.message : fallback };
}

export function DeveloperToolsPage({ kind }: DeveloperToolsPageProps): JSX.Element {
  const { t } = useLanguage();
  const landing = useSeoLanding();
  const localToolMeta = useLocalizedToolMeta();
  const tool = FILE_TOOLS.find((item) => item.id === kind) ?? FILE_TOOLS[0];
  const [input, setInput] = useState(() => initialInputFor(kind));
  const [secondInput, setSecondInput] = useState(() => kind === "json-diff" ? JSON_DIFF_RIGHT_SAMPLE : "");
  const presetMode = kind === "url-encoder"
    && (landing?.definition.preset.mode === "encode" || landing?.definition.preset.mode === "decode")
      ? landing.definition.preset.mode
      : initialModeFor(kind);
  const [mode, setMode] = useState(() => presetMode);
  const [output, setOutput] = useState("");
  const [state, setState] = useState<ProcessingState>(() => initialInputFor(kind).trim() ? "ready" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<CodeEditorError | null>(null);
  const [secondInputError, setSecondInputError] = useState<CodeEditorError | null>(null);
  const inputErrorId = useId();
  const secondInputErrorId = useId();
  const title = localToolMeta(tool.id, "title");
  const description = localToolMeta(tool.id, "description");
  const toolMeta: ToolMeta = {
    title: landing?.content.title ?? `${title} - ${t("header.title")}`,
    description: landing?.content.description ?? description,
    canonical: landing?.definition.path ?? tool.path,
    h1: landing?.content.h1 ?? title,
  };
  useSeo(toolMeta);

  useEffect(() => {
    setMode(presetMode);
    setOutput("");
    setError(null);
    setInputError(null);
    setSecondInputError(null);
    setState(input.trim() && (kind !== "json-diff" || secondInput.trim()) ? "ready" : "idle");
  }, [kind, landing?.definition.path, presetMode]);

  const options = useMemo(() => {
    if (kind === "url-encoder") return [["encode", t("developerTools.encode")], ["decode", t("developerTools.decode")]];
    if (kind === "unix-timestamp") return [["timestamp-to-date", t("developerTools.timestampToDate")], ["date-to-timestamp", t("developerTools.dateToTimestamp")]];
    if (kind === "json-yaml") return [["json-to-yaml", t("developerTools.jsonToYaml")], ["yaml-to-json", t("developerTools.yamlToJson")]];
    return [];
  }, [kind, t]);

  const canProcess = Boolean(input.trim()) && (kind !== "json-diff" || Boolean(secondInput.trim()));

  const clearEditor = (): void => {
    setInput("");
    setOutput("");
    setInputError(null);
    setSecondInputError(null);
    setError(null);
    setState("idle");
  };

  const resetEditor = (): void => {
    setInput(mode === "json-to-yaml" ? JSON_TOOL_SAMPLE : YAML_TOOL_SAMPLE);
    setOutput("");
    setInputError(null);
    setSecondInputError(null);
    setError(null);
    setState("ready");
  };

  const handleProcess = (): void => {
    const primaryIsEmpty = !input.trim();
    const secondaryIsEmpty = kind === "json-diff" && !secondInput.trim();
    if (primaryIsEmpty || secondaryIsEmpty) {
      setInputError(primaryIsEmpty ? { message: t("developerTools.empty") } : null);
      setSecondInputError(secondaryIsEmpty ? { message: t("developerTools.empty") } : null);
      setError(null);
      setState("error");
      return;
    }

    let parsedPrimary: unknown;
    let parsedSecondary: unknown;
    let nextInputError: CodeEditorError | null = null;
    let nextSecondInputError: CodeEditorError | null = null;
    if ((kind === "json-yaml" && mode === "json-to-yaml") || kind === "json-diff") {
      try {
        parsedPrimary = JSON.parse(input);
      } catch (parseFailure) {
        nextInputError = jsonEditorError(input, parseFailure, t("developerTools.invalidInput"));
      }
    }
    if (kind === "json-diff") {
      try {
        parsedSecondary = JSON.parse(secondInput);
      } catch (parseFailure) {
        nextSecondInputError = jsonEditorError(secondInput, parseFailure, t("developerTools.invalidInput"));
      }
    }

    const primaryJsonInvalid =
      ((kind === "json-yaml" && mode === "json-to-yaml") || kind === "json-diff") &&
      parsedPrimary === undefined;
    const secondaryJsonInvalid = kind === "json-diff" && parsedSecondary === undefined;
    if (primaryJsonInvalid || secondaryJsonInvalid) {
      setInputError(primaryJsonInvalid ? nextInputError ?? { message: t("developerTools.invalidInput") } : null);
      setSecondInputError(secondaryJsonInvalid ? nextSecondInputError ?? { message: t("developerTools.invalidInput") } : null);
      setError(null);
      setState("error");
      trackEvent("process_failed", { tool: kind });
      return;
    }

    setInputError(null);
    setSecondInputError(null);
    setError(null);
    setState("processing");
    try {
      let nextOutput = "";
      if (kind === "url-encoder") {
        nextOutput = mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input);
      } else if (kind === "unix-timestamp") {
        if (mode === "timestamp-to-date") {
          const numeric = Number(input.trim());
          if (!Number.isFinite(numeric)) throw new Error("Invalid timestamp");
          const milliseconds = Math.abs(numeric) < 100000000000 ? numeric * 1000 : numeric;
          const date = new Date(milliseconds);
          if (Number.isNaN(date.getTime())) throw new Error("Invalid timestamp");
          nextOutput = date.toISOString();
        } else {
          const date = new Date(input.trim());
          if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
          nextOutput = String(Math.floor(date.getTime() / 1000));
        }
      } else if (kind === "json-yaml") {
        nextOutput = mode === "json-to-yaml"
          ? jsonToYaml(parsedPrimary)
          : JSON.stringify(yamlToJson(input), null, 2);
      } else {
        nextOutput = jsonDiff(parsedPrimary, parsedSecondary);
      }
      setOutput(nextOutput);
      setState("success");
      trackEvent("process_success", { tool: kind });
    } catch (conversionFailure) {
      setInputError(editorError(conversionFailure, t("developerTools.invalidInput")));
      setError(null);
      setState("error");
      trackEvent("process_failed", { tool: kind });
    }
  };

  const copyOutput = async (): Promise<void> => {
    if (!output) return;
    await navigator.clipboard?.writeText(output);
    trackEvent("result_action_used", { tool: kind, action: "copy" });
  };

  const inputLabel = kind === "json-diff"
    ? t("developerTools.leftInput")
    : kind === "json-yaml"
      ? t(mode === "json-to-yaml" ? "developerTools.jsonInput" : "developerTools.yamlInput")
      : t("developerTools.input");
  const howItWorks = [t("developerTools.how.0"), t("developerTools.how.1"), t("developerTools.how.2")];
  const faq = [
    { q: t("developerTools.faq.0.question"), a: t("developerTools.faq.0.answer") },
    { q: t("developerTools.faq.1.question"), a: t("developerTools.faq.1.answer") },
  ];

  return (
    <ToolPageTemplate
      tool={tool}
      meta={toolMeta}
      breadcrumb={["Home", title]}
      workflow={{ state, error, onReprocess: handleProcess }}
      children={{
        workspace: (
          <div className="tool-form">
            {kind === "json-yaml" ? (
              <CodeEditorToolkit
                value={input}
                onChange={(nextInput) => {
                  setInput(nextInput);
                  setInputError(null);
                  setError(null);
                  setOutput("");
                  setState(nextInput.trim() ? "ready" : "idle");
                }}
                label={inputLabel}
                language={mode === "json-to-yaml" ? "json" : "yaml"}
                placeholder={mode === "json-to-yaml" ? '{"name":"value"}' : "name: value"}
                error={inputError}
                onClear={clearEditor}
                onReset={resetEditor}
              />
            ) : (
              <>
                <label htmlFor={`${kind}-input`}>{inputLabel}</label>
                <textarea
                  id={`${kind}-input`}
                  value={input}
                  aria-invalid={Boolean(inputError)}
                  aria-describedby={inputError ? inputErrorId : undefined}
                  onChange={(event) => {
                    const nextInput = event.target.value;
                    setInput(nextInput);
                    setInputError(null);
                    setError(null);
                    setOutput("");
                    setState(nextInput.trim() && (kind !== "json-diff" || secondInput.trim()) ? "ready" : "idle");
                  }}
                  rows={10}
                />
                {inputError ? <p id={inputErrorId} role="alert" className="error">{inputError.message}</p> : null}
              </>
            )}
            {kind === "json-diff" ? (
              <>
                <label htmlFor={`${kind}-second-input`}>{t("developerTools.rightInput")}</label>
                <textarea
                  id={`${kind}-second-input`}
                  value={secondInput}
                  aria-invalid={Boolean(secondInputError)}
                  aria-describedby={secondInputError ? secondInputErrorId : undefined}
                  onChange={(event) => {
                    const nextInput = event.target.value;
                    setSecondInput(nextInput);
                    setSecondInputError(null);
                    setError(null);
                    setOutput("");
                    setState(nextInput.trim() && input.trim() ? "ready" : "idle");
                  }}
                  rows={10}
                />
                {secondInputError ? <p id={secondInputErrorId} role="alert" className="error">{secondInputError.message}</p> : null}
              </>
            ) : null}
          </div>
        ),
        options: (
          <div className="tool-form">
            {kind !== "json-diff" ? (
              <label htmlFor={`${kind}-mode`}>{t("developerTools.mode")}
                <select
                  id={`${kind}-mode`}
                  value={mode}
                  onChange={(event) => {
                    setMode(event.target.value);
                    setInputError(null);
                    setError(null);
                    setOutput("");
                    setState(input.trim() ? "ready" : "idle");
                  }}
                >
                  {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            ) : <p>{t("developerTools.diffMode")}</p>}
            <button type="button" className="btn primary" onClick={handleProcess} disabled={!canProcess || state === "processing"}>
              {t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            {kind === "json-yaml" ? (
              <div className="developer-output">
                <CodeEditorToolkit
                  value={output}
                  label={t("developerTools.output")}
                  language={mode === "json-to-yaml" ? "yaml" : "json"}
                  readOnly
                  outputEmptyText={t("developerTools.outputEmpty")}
                  fileName={mode === "json-to-yaml" ? "converted.yaml" : "converted.json"}
                />
              </div>
            ) : (
              <>
                {kind === "json-diff" ? <JsonDiffOutput output={output} /> : <pre className="developer-output">{output}</pre>}
                <div className="tool-actions">
                  <button type="button" className="btn secondary" onClick={copyOutput} disabled={!output}>
                    {t("developerTools.copy")}
                  </button>
                </div>
              </>
            )}
          </>
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools(kind),
      }}
    />
  );
}
