import { useId, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { useSeoLanding } from "../../hooks/useSeoLanding";
import {
  compareJson,
  hasJsonDifferences,
  summarizeJsonDiff,
  type DiffType,
  type JsonDiffNode,
  type JsonValue,
} from "../../services/json/jsonDiffService";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { localizePath } from "../../routing/localePaths";

const SAMPLE_LEFT = {
  user: {
    name: "Kim",
    profile: { theme: "light" },
  },
  version: 1,
  legacy: true,
  tags: ["json", "api"],
};

const SAMPLE_RIGHT = {
  user: {
    name: "Alex",
    profile: { theme: "dark" },
    status: "active",
  },
  version: 2,
  tags: ["api", "json", "diff"],
};

const MAX_RENDERED_NODES = 500;

interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

interface JsonDiffLocationState {
  leftJson?: unknown;
}

function parseError(text: string, error: unknown): ParseError {
  const message = error instanceof Error ? error.message : String(error);
  const positionMatch = /position (\d+)/i.exec(message);
  if (!positionMatch) return { message };

  const position = Math.min(Number(positionMatch[1]), text.length);
  const before = text.slice(0, position);
  const line = before.split("\n").length;
  const column = position - before.lastIndexOf("\n");
  return { message, line, column };
}

function valueText(value: JsonValue | undefined): string {
  return JSON.stringify(value) ?? "undefined";
}

function nodeHasDifference(node: JsonDiffNode): boolean {
  return node.type !== "unchanged" || Boolean(node.children?.some(nodeHasDifference));
}

function countVisibleNodes(nodes: JsonDiffNode[], differencesOnly: boolean): number {
  return nodes.reduce(
    (count, node) =>
      count + (differencesOnly && !nodeHasDifference(node)
        ? 0
        : 1 + (node.children ? countVisibleNodes(node.children, differencesOnly) : 0)),
    0
  );
}

function DiffTree({
  nodes,
  differencesOnly,
  labels,
}: {
  nodes: JsonDiffNode[];
  differencesOnly: boolean;
  labels: Record<DiffType, string>;
}): JSX.Element {
  let rendered = 0;
  const renderNodes = (items: JsonDiffNode[]): JSX.Element[] =>
    items.flatMap((node) => {
      if (differencesOnly && !nodeHasDifference(node)) return [];
      if (rendered >= MAX_RENDERED_NODES) return [];
      rendered += 1;
      const marker = node.type === "added" ? "+" : node.type === "removed" ? "-" : node.type === "changed" ? "~" : "✓";
      return (
        <li key={node.path} className={`json-diff-node json-diff-node--${node.type}`}>
          <div className="json-diff-node__heading">
            <span className="json-diff-node__marker" aria-hidden="true">{marker}</span>
            <strong>{node.path}</strong>
            <span className="json-diff-node__type">{labels[node.type]}</span>
          </div>
          {!node.children && node.type === "changed" ? (
            <div className="json-diff-node__values">
              <code>{valueText(node.oldValue)}</code>
              <span aria-label="changed to">→</span>
              <code>{valueText(node.newValue)}</code>
            </div>
          ) : null}
          {!node.children && node.type === "added" ? <code>{valueText(node.newValue)}</code> : null}
          {!node.children && node.type === "removed" ? <code>{valueText(node.oldValue)}</code> : null}
          {node.children ? <ul>{renderNodes(node.children)}</ul> : null}
        </li>
      );
    });

  return <ul className="json-diff-tree">{renderNodes(nodes)}</ul>;
}

export function JsonDiffPage(): JSX.Element {
  const { locale } = useLanguage();
  const landing = useSeoLanding();
  const location = useLocation();
  const transferredLeft = (location.state as JsonDiffLocationState | null)?.leftJson;
  const initialLeft = typeof transferredLeft === "string" ? transferredLeft : "";
  const [leftJson, setLeftJson] = useState(initialLeft);
  const [rightJson, setRightJson] = useState("");
  const [leftError, setLeftError] = useState<ParseError | null>(null);
  const [rightError, setRightError] = useState<ParseError | null>(null);
  const [result, setResult] = useState<JsonDiffNode | null>(null);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [state, setState] = useState<ProcessingState>("idle");
  const leftErrorId = useId();
  const rightErrorId = useId();
  const isEnglish = locale === "en";
  const copy = isEnglish
    ? {
        original: "Original JSON",
        modified: "Modified JSON",
        compare: "Compare JSON",
        comparing: "Comparing…",
        sample: "Load Sample",
        clear: "Clear",
        swap: "Swap",
        onlyDifferences: "Show differences only",
        privacy: "Your JSON is processed locally in your browser and is never uploaded to a server.",
        invalidLeft: "Left JSON format error",
        invalidRight: "Right JSON format error",
        result: "Diff result",
        noDifferences: "No differences found",
        summary: (changed: number, added: number, removed: number) =>
          `${changed} changed · ${added} added · ${removed} removed`,
        renderedLimit: `Showing the first ${MAX_RENDERED_NODES} nodes. Refine the input to inspect more results.`,
        labels: { added: "Added", removed: "Removed", changed: "Changed", unchanged: "Unchanged" },
      }
    : {
        original: "原始 JSON",
        modified: "修改後 JSON",
        compare: "比較 JSON",
        comparing: "比較中…",
        sample: "載入範例",
        clear: "清除",
        swap: "交換",
        onlyDifferences: "只顯示差異",
        privacy: "你的 JSON 只會在瀏覽器本機處理，不會傳送至伺服器。",
        invalidLeft: "左側 JSON 格式錯誤",
        invalidRight: "右側 JSON 格式錯誤",
        result: "比較結果",
        noDifferences: "找不到差異",
        summary: (changed: number, added: number, removed: number) =>
          `${changed} 項修改 · ${added} 項新增 · ${removed} 項刪除`,
        renderedLimit: `僅顯示前 ${MAX_RENDERED_NODES} 個節點，請縮小輸入範圍以查看其他結果。`,
        labels: { added: "新增", removed: "刪除", changed: "修改", unchanged: "未變更" },
      };
  const tool = FILE_TOOLS.find((item) => item.id === "json-diff") ?? FILE_TOOLS[0];
  const meta: ToolMeta = {
    title: landing?.content.title ?? "JSON Diff | NexaForge",
    description: landing?.content.description ?? (isEnglish
      ? "Compare two JSON documents locally in your browser."
      : "比較兩份 JSON，快速找出新增、刪除與修改的欄位。所有資料只在瀏覽器本機處理。"),
    canonical: "/data/json-diff",
    h1: landing?.content.h1 ?? "JSON Diff",
  };
  useSeo(meta);

  const summary = useMemo(() => result ? summarizeJsonDiff(result) : null, [result]);
  const visibleNodeCount = useMemo(
    () => result ? countVisibleNodes(result.children ?? [result], differencesOnly) : 0,
    [differencesOnly, result]
  );
  const canCompare = Boolean(leftJson.trim() && rightJson.trim()) && state !== "processing";

  const resetResult = () => {
    setResult(null);
    setState("idle");
  };

  const handleCompare = () => {
    let left: JsonValue | undefined;
    let right: JsonValue | undefined;
    let nextLeftError: ParseError | null = null;
    let nextRightError: ParseError | null = null;

    try {
      left = JSON.parse(leftJson) as JsonValue;
    } catch (error) {
      nextLeftError = parseError(leftJson, error);
    }
    try {
      right = JSON.parse(rightJson) as JsonValue;
    } catch (error) {
      nextRightError = parseError(rightJson, error);
    }
    setLeftError(nextLeftError);
    setRightError(nextRightError);
    if (nextLeftError || nextRightError) {
      setResult(null);
      setState("error");
      return;
    }

    setState("processing");
    window.setTimeout(() => {
      setResult(compareJson(left as JsonValue, right as JsonValue));
      setState("success");
    }, 0);
  };

  const loadSample = () => {
    setLeftJson(JSON.stringify(SAMPLE_LEFT, null, 2));
    setRightJson(JSON.stringify(SAMPLE_RIGHT, null, 2));
    setLeftError(null);
    setRightError(null);
    resetResult();
  };

  const clear = () => {
    setLeftJson("");
    setRightJson("");
    setLeftError(null);
    setRightError(null);
    setDifferencesOnly(false);
    resetResult();
  };

  const swap = () => {
    setLeftJson(rightJson);
    setRightJson(leftJson);
    setLeftError(null);
    setRightError(null);
    resetResult();
  };

  const editor = (
    <div className="json-diff-workspace">
      <p className="json-diff-privacy" role="note">{copy.privacy}</p>
      <div className="json-diff-editors">
        <div>
          <label htmlFor="json-diff-left">{copy.original}</label>
          <textarea
            id="json-diff-left"
            rows={14}
            value={leftJson}
            placeholder='{"name":"NexaForge"}'
            aria-invalid={Boolean(leftError)}
            aria-describedby={leftError ? leftErrorId : undefined}
            onChange={(event) => {
              setLeftJson(event.target.value);
              setLeftError(null);
              resetResult();
            }}
          />
          {leftError ? (
            <p id={leftErrorId} className="error" role="alert">
              {copy.invalidLeft}{leftError.line && leftError.column ? ` (${leftError.line}:${leftError.column})` : ""}: {leftError.message}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="json-diff-right">{copy.modified}</label>
          <textarea
            id="json-diff-right"
            rows={14}
            value={rightJson}
            placeholder='{"name":"NexaForge"}'
            aria-invalid={Boolean(rightError)}
            aria-describedby={rightError ? rightErrorId : undefined}
            onChange={(event) => {
              setRightJson(event.target.value);
              setRightError(null);
              resetResult();
            }}
          />
          {rightError ? (
            <p id={rightErrorId} className="error" role="alert">
              {copy.invalidRight}{rightError.line && rightError.column ? ` (${rightError.line}:${rightError.column})` : ""}: {rightError.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="tool-actions json-diff-actions">
        <button type="button" className="btn secondary" onClick={loadSample}>{copy.sample}</button>
        <button type="button" className="btn secondary" onClick={swap}>{copy.swap}</button>
        <button type="button" className="btn secondary" onClick={clear}>{copy.clear}</button>
        <button type="button" className="btn primary" disabled={!canCompare} onClick={handleCompare}>
          {state === "processing" ? copy.comparing : copy.compare}
        </button>
      </div>
    </div>
  );

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", "JSON Diff"]}
      layout="split"
      showIdleResult
      workflow={{ state }}
      children={{
        workspace: editor,
        options: null,
        result: result && summary ? (
          <div className="json-diff-result">
            <div className="json-diff-result__toolbar">
              <h3>{copy.result}</h3>
              <label>
                <input
                  type="checkbox"
                  checked={differencesOnly}
                  onChange={(event) => setDifferencesOnly(event.target.checked)}
                />
                {copy.onlyDifferences}
              </label>
            </div>
            {hasJsonDifferences(result) ? (
              <p className="json-diff-summary" role="status">{copy.summary(summary.changed, summary.added, summary.removed)}</p>
            ) : (
              <p className="json-diff-summary" role="status">✓ {copy.noDifferences}</p>
            )}
            <DiffTree
              nodes={result.children ?? [result]}
              differencesOnly={differencesOnly}
              labels={copy.labels}
            />
            {visibleNodeCount > MAX_RENDERED_NODES ? (
              <p role="status">{copy.renderedLimit}</p>
            ) : null}
          </div>
        ) : (
          <p>{isEnglish ? "Paste two valid JSON documents, then select Compare JSON." : "貼上兩份有效 JSON 後，選擇「比較 JSON」。"}</p>
        ),
        nextActions: (
          <>
            <Link className="btn secondary" to={localizePath("/data/json-formatter", locale)}>JSON Formatter</Link>
            <Link className="btn secondary" to={localizePath("/developer/json-to-typescript", locale)}>JSON → TypeScript</Link>
            <Link className="btn secondary" to={localizePath("/developer/json-to-csharp", locale)}>JSON → C#</Link>
            <Link className="btn secondary" to={localizePath("/data/json-to-csv", locale)}>JSON → CSV</Link>
          </>
        ),
        howItWorks: [],
        faq: [],
        relatedTools: [],
      }}
    />
  );
}
