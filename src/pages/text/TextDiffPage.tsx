import { useMemo, useState } from "react";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { getRelatedTools } from "../../utils/toolHelpers";
import { trackEvent } from "../../utils/analytics";
import { useSeo } from "../../hooks/useSeo";
import { useLanguage } from "../../context/LanguageContext";

type DiffType = "same" | "add" | "remove" | "modify";

interface DiffLine {
  type: DiffType;
  left: string;
  right: string;
  leftLine: number | null;
  rightLine: number | null;
}

function normalizeText(input: string): string {
  return input.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function toLines(input: string): string[] {
  const normalized = normalizeText(input);
  if (!normalized) {
    return [];
  }
  return normalized.split("\n");
}

function compareText(leftText: string, rightText: string): DiffLine[] {
  const left = toLines(leftText);
  const right = toLines(rightText);
  const output: DiffLine[] = [];

  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      output.push({ type: "same", left: left[i], right: right[j], leftLine: i + 1, rightLine: j + 1 });
      i += 1;
      j += 1;
      continue;
    }

    if (left[i + 1] === right[j]) {
      output.push({ type: "remove", left: left[i], right: "", leftLine: i + 1, rightLine: null });
      i += 1;
      continue;
    }

    if (left[i] === right[j + 1]) {
      output.push({ type: "add", left: "", right: right[j], leftLine: null, rightLine: j + 1 });
      j += 1;
      continue;
    }

    output.push({
      type: "modify",
      left: left[i],
      right: right[j],
      leftLine: i + 1,
      rightLine: j + 1,
    });
    i += 1;
    j += 1;
  }

  while (i < left.length) {
    output.push({ type: "remove", left: left[i], right: "", leftLine: i + 1, rightLine: null });
    i += 1;
  }

  while (j < right.length) {
    output.push({ type: "add", left: "", right: right[j], leftLine: null, rightLine: j + 1 });
    j += 1;
  }

  return output;
}

function formatDiffOutput(lines: DiffLine[]): string {
  return lines
    .map((line) => {
      if (line.type === "same") {
        return ` ${line.left}`;
      }

      if (line.type === "add") {
        return `+${line.right}`;
      }

      if (line.type === "modify") {
        return `-${line.left}\n+${line.right}`;
      }

      return `-${line.left}`;
    })
    .join("\n");
}

function lineBadge(type: DiffType): { label: string; title: string } {
  if (type === "same") {
    return { label: "=", title: "same" };
  }

  if (type === "add") {
    return { label: "+", title: "added" };
  }

  if (type === "modify") {
    return { label: "~", title: "modified" };
  }

  return { label: "-", title: "removed" };
}

export function TextDiffPage(): JSX.Element {
  const { t } = useLanguage();
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [diffText, setDiffText] = useState("");
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [copyError, setCopyError] = useState<string | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "text-diff");
  const title = t("tool.text-diff.title");
  const description = t("tool.text-diff.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/text/diff",
    h1: title,
  };
  useSeo(toolMeta);

  const relatedTools = getRelatedTools("text-diff");
  const howItWorks = useMemo(
    () => [
      t("tool.text-diff.how.0"),
      t("tool.text-diff.how.1"),
      t("tool.text-diff.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.text-diff.faq.0.question"),
        a: t("tool.text-diff.faq.0.answer"),
      },
      {
        q: t("tool.text-diff.faq.1.question"),
        a: t("tool.text-diff.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleCompare = () => {
    setProcessing("processing");
    setCopyError(null);
    trackEvent("process_start", { tool: "text-diff" });

    try {
      const next = compareText(leftText, rightText);
      setDiffLines(next);
      setDiffText(formatDiffOutput(next));
      setProcessing("success");
      trackEvent("process_success", { tool: "text-diff" });
    } catch (error) {
      console.error(error);
      setDiffLines([]);
      setDiffText("");
      setProcessing("error");
      setCopyError(t("error.processingFailed"));
      trackEvent("process_failed", { tool: "text-diff" });
    }
  };

  const handleClear = () => {
    setLeftText("");
    setRightText("");
    setDiffLines([]);
    setDiffText("");
    setProcessing("idle");
    setCopyError(null);
  };

  const handleCopy = async () => {
    if (!diffText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(diffText);
      setCopyError(null);
    } catch {
      setCopyError(t("error.copyFailed"));
    }
  };

  const summary = useMemo(() => {
    const summaryData = {
      same: 0,
      add: 0,
      remove: 0,
      modify: 0,
    };

    for (const line of diffLines) {
      if (line.type === "same") {
        summaryData.same += 1;
      } else if (line.type === "add") {
        summaryData.add += 1;
      } else if (line.type === "remove") {
        summaryData.remove += 1;
      } else {
        summaryData.modify += 1;
      }
    }

    return summaryData;
  }, [diffLines]);

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", title]}
      children={{
        workspace: (
          <div className="tool-form">
            <label>
              {t("tool.text-diff.label.left")}
              <textarea
                value={leftText}
                onChange={(event) => setLeftText(event.target.value)}
                rows={8}
              />
            </label>
            <label>
              {t("tool.text-diff.label.right")}
              <textarea
                value={rightText}
                onChange={(event) => setRightText(event.target.value)}
                rows={8}
              />
            </label>
          </div>
        ),
        options: (
          <div className="tool-form">
            <div className="tool-actions">
              <button
                type="button"
                className="btn primary"
                onClick={handleCompare}
                disabled={processing === "processing"}
                aria-busy={processing === "processing"}
              >
                {processing === "processing" ? t("button.processing") : t("tool.text-diff.button.compare")}
              </button>
              <button type="button" className="btn secondary" onClick={handleClear}>
                {t("tool.text-diff.button.clear")}
              </button>
            </div>
          </div>
        ),
        result: (
          <>
            {copyError && <p role="alert" className="error">{copyError}</p>}
            <div className="diff-summary">
              <p>{t("tool.text-diff.label.summary", {
                same: summary.same,
                add: summary.add + summary.modify,
                remove: summary.remove + summary.modify,
              })}</p>
              <div className="diff-summary__chips" role="list" aria-label={t("tool.text-diff.label.summary", {
                same: summary.same,
                add: summary.add + summary.modify,
                remove: summary.remove + summary.modify,
              })}>
                <span className="diff-chip diff-chip--same">{t("tool.text-diff.label.unchanged")}: {summary.same}</span>
                <span className="diff-chip diff-chip--add">{t("tool.text-diff.label.added")}: {summary.add + summary.modify}</span>
                <span className="diff-chip diff-chip--remove">{t("tool.text-diff.label.removed")}: {summary.remove + summary.modify}</span>
              </div>
            </div>
            <div>
              {diffLines.length === 0 ? (
                <pre className="diff-empty">{t("tool.text-diff.label.noOutput")}</pre>
              ) : (
                <div className="diff-list">
                  <div className="diff-list__header">
                    <span className="diff-list__header-cell">{t("tool.text-diff.label.status")}</span>
                    <span className="diff-list__header-cell">{t("tool.text-diff.label.leftLine")}</span>
                    <span className="diff-list__header-cell">{t("tool.text-diff.label.textLeft")}</span>
                    <span className="diff-list__header-cell">{t("tool.text-diff.label.rightLine")}</span>
                    <span className="diff-list__header-cell">{t("tool.text-diff.label.textRight")}</span>
                  </div>
                  {diffLines.map((line, index) => {
                    const badge = lineBadge(line.type);
                    return (
                      <div
                        key={`${line.type}-${index}-${line.leftLine ?? ""}-${line.rightLine ?? ""}-${line.left}${line.right}`}
                        className={`diff-row diff-row--${line.type}`}
                        role="row"
                      >
                        <div className="diff-row__badge" title={t(`tool.text-diff.badge.${badge.title}`)} aria-label={t(`tool.text-diff.badge.${badge.title}`)}>
                          {badge.label}
                        </div>
                        <div className="diff-row__col diff-row__line-no">{line.leftLine ? `L${line.leftLine}` : "-"}</div>
                        <pre className="diff-row__col diff-row__text diff-row__text--left">
                          {line.left || ""}
                        </pre>
                        <div className="diff-row__col diff-row__line-no">{line.rightLine ? `R${line.rightLine}` : "-"}</div>
                        <pre className="diff-row__col diff-row__text diff-row__text--right">
                          {line.right || ""}
                        </pre>
                      </div>
                    );
                  })}
                </div>
                )}
            </div>
            <div className="tool-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={handleCopy}
                disabled={!diffText || processing === "processing"}
              >
                {t("tool.text-diff.button.copy")}
              </button>
            </div>
          </>
        ),
        howItWorks,
        faq,
        relatedTools,
      }}
    />
  );
}
