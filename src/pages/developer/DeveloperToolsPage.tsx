import { useMemo, useState } from "react";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage, useLocalizedToolMeta } from "../../context/LanguageContext";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";

type DeveloperToolKind = "url-encoder" | "unix-timestamp" | "json-yaml" | "json-diff";

interface DeveloperToolsPageProps {
  kind: DeveloperToolKind;
}

interface YamlLine {
  indent: number;
  text: string;
}

const JSON_TOOL_SAMPLE = JSON.stringify({
  name: "NexaForge",
  active: true,
  tags: ["json", "sample"],
}, null, 2);

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

function yamlScalar(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  return String(value);
}

function jsonToYaml(value: unknown, indent = 0): string {
  const padding = " ".repeat(indent);
  if (Array.isArray(value)) {
    return value.length === 0
      ? `${padding}[]`
      : value.map((item) => {
          if (item && typeof item === "object") {
            return `${padding}-\n${jsonToYaml(item, indent + 2)}`;
          }
          return `${padding}- ${yamlScalar(item)}`;
        }).join("\n");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, child]) => {
      if (child && typeof child === "object") {
        return `${padding}${key}:\n${jsonToYaml(child, indent + 2)}`;
      }
      return `${padding}${key}: ${yamlScalar(child)}`;
    }).join("\n");
  }
  return `${padding}${yamlScalar(value)}`;
}

function parseYamlScalar(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function yamlToJson(source: string): unknown {
  const lines: YamlLine[] = source
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => ({ indent: line.length - line.trimStart().length, text: line.trim() }));

  const parseBlock = (start: number, indent: number): [unknown, number] => {
    const isArray = lines[start]?.indent === indent && lines[start].text.startsWith("-");
    const result: unknown[] | Record<string, unknown> = isArray ? [] : {};
    let index = start;

    while (index < lines.length && lines[index].indent === indent) {
      const line = lines[index].text;
      if (isArray) {
        if (!line.startsWith("-")) break;
        const content = line.slice(1).trim();
        if (!content) {
          if (lines[index + 1]?.indent > indent) {
            const [child, nextIndex] = parseBlock(index + 1, lines[index + 1].indent);
            (result as unknown[]).push(child);
            index = nextIndex;
          } else {
            (result as unknown[]).push(null);
            index += 1;
          }
        } else {
          (result as unknown[]).push(parseYamlScalar(content));
          index += 1;
        }
      } else {
        const separator = line.indexOf(":");
        if (separator < 1) throw new Error(`Invalid YAML line: ${line}`);
        const key = line.slice(0, separator).trim();
        const content = line.slice(separator + 1).trim();
        if (content) {
          (result as Record<string, unknown>)[key] = parseYamlScalar(content);
          index += 1;
        } else if (lines[index + 1]?.indent > indent) {
          const [child, nextIndex] = parseBlock(index + 1, lines[index + 1].indent);
          (result as Record<string, unknown>)[key] = child;
          index = nextIndex;
        } else {
          (result as Record<string, unknown>)[key] = null;
          index += 1;
        }
      }
    }
    return [result, index];
  };

  if (!lines.length) return null;
  return parseBlock(0, lines[0].indent)[0];
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

export function DeveloperToolsPage({ kind }: DeveloperToolsPageProps): JSX.Element {
  const { t } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const tool = FILE_TOOLS.find((item) => item.id === kind) ?? FILE_TOOLS[0];
  const [input, setInput] = useState(() => initialInputFor(kind));
  const [secondInput, setSecondInput] = useState(() => kind === "json-diff" ? JSON_DIFF_RIGHT_SAMPLE : "");
  const [mode, setMode] = useState(() => initialModeFor(kind));
  const [output, setOutput] = useState("");
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const title = localToolMeta(tool.id, "title");
  const description = localToolMeta(tool.id, "description");
  const toolMeta: ToolMeta = { title: `${title} - ${t("header.title")}`, description, canonical: tool.path, h1: title };
  useSeo(toolMeta);

  const options = useMemo(() => {
    if (kind === "url-encoder") return [["encode", t("developerTools.encode")], ["decode", t("developerTools.decode")]];
    if (kind === "unix-timestamp") return [["timestamp-to-date", t("developerTools.timestampToDate")], ["date-to-timestamp", t("developerTools.dateToTimestamp")]];
    if (kind === "json-yaml") return [["json-to-yaml", t("developerTools.jsonToYaml")], ["yaml-to-json", t("developerTools.yamlToJson")]];
    return [];
  }, [kind, t]);

  const handleProcess = (): void => {
    if (!input.trim() || (kind === "json-diff" && !secondInput.trim())) {
      setError(t("developerTools.empty"));
      setState("error");
      return;
    }
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
          ? jsonToYaml(JSON.parse(input))
          : JSON.stringify(yamlToJson(input), null, 2);
      } else {
        nextOutput = jsonDiff(JSON.parse(input), JSON.parse(secondInput));
      }
      setOutput(nextOutput);
      setState("success");
      trackEvent("process_success", { tool: kind });
    } catch {
      setError(t("developerTools.invalidInput"));
      setState("error");
      trackEvent("process_failed", { tool: kind });
    }
  };

  const copyOutput = async (): Promise<void> => {
    if (!output) return;
    await navigator.clipboard?.writeText(output);
    trackEvent("result_action_used", { tool: kind, action: "copy" });
  };

  const inputLabel = kind === "json-diff" ? t("developerTools.leftInput") : t("developerTools.input");
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
      workflow={{ state, error, onRetry: handleProcess, onReprocess: handleProcess }}
      children={{
        workspace: (
          <div className="tool-form">
            <label htmlFor={`${kind}-input`}>{inputLabel}</label>
            <textarea id={`${kind}-input`} value={input} onChange={(event) => { setInput(event.target.value); setState(event.target.value ? "ready" : "idle"); }} rows={10} />
            {kind === "json-diff" ? (
              <>
                <label htmlFor={`${kind}-second-input`}>{t("developerTools.rightInput")}</label>
                <textarea id={`${kind}-second-input`} value={secondInput} onChange={(event) => { setSecondInput(event.target.value); setState(event.target.value ? "ready" : "idle"); }} rows={10} />
              </>
            ) : null}
          </div>
        ),
        options: (
          <div className="tool-form">
            {kind !== "json-diff" ? (
              <label htmlFor={`${kind}-mode`}>{t("developerTools.mode")}
                <select id={`${kind}-mode`} value={mode} onChange={(event) => setMode(event.target.value)}>
                  {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            ) : <p>{t("developerTools.diffMode")}</p>}
            <button type="button" className="btn primary" onClick={handleProcess} disabled={state === "processing"}>
              {t("button.process")}
            </button>
          </div>
        ),
        result: (
          <>
            {kind === "json-diff" ? <JsonDiffOutput output={output} /> : <pre className="developer-output">{output}</pre>}
            <div className="tool-actions">
              <button type="button" className="btn secondary" onClick={copyOutput} disabled={!output}>
                {t("developerTools.copy")}
              </button>
            </div>
          </>
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools(kind),
      }}
    />
  );
}
