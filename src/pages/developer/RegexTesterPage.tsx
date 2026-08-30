import { useEffect, useMemo, useRef, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { TextWorkflowLinks } from "../../components/text/TextWorkflowLinks";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  RegexTimeoutError,
  RegexValidationError,
  testRegex,
} from "../../services/regex/regexService";
import type { RegexMatchResult, RegexRunResult } from "../../services/regex/regexEngine";
import type { ProcessingState, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";

const DEFAULT_PATTERN = String.raw`(?<word>[A-Za-z]+)-(\d+)`;
const DEFAULT_TEXT = "alpha-12 beta-34";
const MATCH_LIMIT = 500;
const TIMEOUT_MS = 750;

const FLAG_VALUES = ["g", "i", "m", "s", "u", "y"] as const;
type RegexFlag = (typeof FLAG_VALUES)[number];

function GroupList({
  values,
  emptyLabel,
}: {
  values: Array<[string, string | null]>;
  emptyLabel: string;
}): JSX.Element {
  if (values.length === 0) {
    return <span>{emptyLabel}</span>;
  }

  return (
    <ul className="regex-tester__group-list">
      {values.map(([name, value]) => (
        <li key={name}>
          <code>{name}: {value ?? "null"}</code>
        </li>
      ))}
    </ul>
  );
}

function MatchTable({
  matches,
  labels,
}: {
  matches: RegexMatchResult[];
  labels: {
    table: string;
    match: string;
    index: string;
    groups: string;
    namedGroups: string;
    noGroups: string;
    emptyMatch: string;
  };
}): JSX.Element {
  return (
    <div className="scrollbox regex-tester__table-wrapper">
      <table aria-label={labels.table}>
        <thead>
          <tr>
            <th scope="col">{labels.match}</th>
            <th scope="col">{labels.index}</th>
            <th scope="col">{labels.groups}</th>
            <th scope="col">{labels.namedGroups}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, rowIndex) => (
            <tr key={`${match.index}-${rowIndex}`}>
              <td><code>{match.value || labels.emptyMatch}</code></td>
              <td className="regex-tester__index">{match.index}</td>
              <td>
                <GroupList
                  values={match.groups.map((value, index) => [String(index + 1), value])}
                  emptyLabel={labels.noGroups}
                />
              </td>
              <td>
                <GroupList
                  values={Object.entries(match.namedGroups)}
                  emptyLabel={labels.noGroups}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RegexTesterPage(): JSX.Element {
  const { t } = useLanguage();
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [flags, setFlags] = useState<RegexFlag[]>(["g"]);
  const [processing, setProcessing] = useState<ProcessingState>("idle");
  const [result, setResult] = useState<RegexRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRun = useRef<AbortController | null>(null);

  const tool = FILE_TOOLS.find((item) => item.id === "regex-tester") ?? FILE_TOOLS[0];
  const title = t("tool.regex-tester.title");
  const description = t("tool.regex-tester.description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/developer/regex-tester",
    h1: title,
  };
  useSeo(meta);

  useEffect(() => {
    return () => activeRun.current?.abort();
  }, []);

  const howItWorks = useMemo(
    () => [
      t("tool.regex-tester.how.0"),
      t("tool.regex-tester.how.1"),
      t("tool.regex-tester.how.2"),
    ],
    [t]
  );

  const faq = useMemo(
    () => [
      {
        q: t("tool.regex-tester.faq.0.question"),
        a: t("tool.regex-tester.faq.0.answer"),
      },
      {
        q: t("tool.regex-tester.faq.1.question"),
        a: t("tool.regex-tester.faq.1.answer"),
      },
    ],
    [t]
  );

  const toggleFlag = (flag: RegexFlag): void => {
    setFlags((current) =>
      current.includes(flag)
        ? current.filter((item) => item !== flag)
        : FLAG_VALUES.filter((item) => current.includes(item) || item === flag)
    );
  };

  const handleTest = async (): Promise<void> => {
    activeRun.current?.abort();
    const controller = new AbortController();
    activeRun.current = controller;
    setError(null);
    setResult(null);
    setProcessing("processing");
    trackEvent("process_start", { tool: "regex-tester" });

    try {
      const nextResult = await testRegex(
        {
          pattern,
          flags: FLAG_VALUES.filter((flag) => flags.includes(flag)).join(""),
          text,
          maxMatches: MATCH_LIMIT,
        },
        { signal: controller.signal, timeoutMs: TIMEOUT_MS }
      );

      if (activeRun.current !== controller) {
        return;
      }
      setResult(nextResult);
      setProcessing("success");
      trackEvent("process_success", { tool: "regex-tester" });
    } catch (caught) {
      if (activeRun.current !== controller || (caught instanceof DOMException && caught.name === "AbortError")) {
        return;
      }

      if (caught instanceof RegexValidationError) {
        setError(t("tool.regex-tester.error.invalid", { message: caught.message }));
      } else if (caught instanceof RegexTimeoutError) {
        setError(t("tool.regex-tester.error.timeout"));
      } else {
        setError(t("tool.regex-tester.error.execution"));
      }
      setProcessing("error");
      trackEvent("process_failed", { tool: "regex-tester" });
    } finally {
      if (activeRun.current === controller) {
        activeRun.current = null;
      }
    }
  };

  const matchCount = result?.matches.length ?? 0;
  const matchSummary = matchCount === 1
    ? t("tool.regex-tester.label.matchCount.one")
    : t("tool.regex-tester.label.matchCount.other", { count: matchCount });

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state: processing, error, onRetry: handleTest }}
      children={{
        workspace: (
          <div className="tool-form">
            <label htmlFor="regex-pattern">
              {t("tool.regex-tester.label.pattern")}
              <input
                id="regex-pattern"
                className="regex-tester__pattern-input"
                value={pattern}
                onChange={(event) => setPattern(event.target.value)}
                aria-describedby="regex-pattern-help"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </label>
            <p id="regex-pattern-help" className="regex-tester__help">
              {t("tool.regex-tester.label.patternHelp")}
            </p>
            <label htmlFor="regex-test-text">
              {t("tool.regex-tester.label.testText")}
              <textarea
                id="regex-test-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                spellCheck={false}
              />
            </label>
          </div>
        ),
        options: (
          <div className="tool-form">
            <fieldset className="regex-tester__flags">
              <legend>{t("tool.regex-tester.label.flags")}</legend>
              <div className="regex-tester__flag-grid">
                {FLAG_VALUES.map((flag) => (
                  <label key={flag} className="regex-tester__flag">
                    <input
                      type="checkbox"
                      checked={flags.includes(flag)}
                      onChange={() => toggleFlag(flag)}
                    />
                    <span>{t(`tool.regex-tester.flag.${flag}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              className="btn primary"
              aria-busy={processing === "processing"}
              onClick={handleTest}
            >
              {processing === "processing"
                ? t("tool.regex-tester.button.testing")
                : t("tool.regex-tester.button.test")}
            </button>
          </div>
        ),
        result: result ? (
          <div className="regex-tester__results">
            <p
              className="regex-tester__summary"
              role="status"
              aria-label={t("tool.regex-tester.label.matchSummary")}
            >
              {matchSummary}
            </p>
            {result.truncated ? (
              <p className="regex-tester__notice">
                {t("tool.regex-tester.label.truncated")}
              </p>
            ) : null}
            {result.matches.length > 0 ? (
              <MatchTable
                matches={result.matches}
                labels={{
                  table: t("tool.regex-tester.label.results"),
                  match: t("tool.regex-tester.label.match"),
                  index: t("tool.regex-tester.label.index"),
                  groups: t("tool.regex-tester.label.groups"),
                  namedGroups: t("tool.regex-tester.label.namedGroups"),
                  noGroups: t("tool.regex-tester.label.noGroups"),
                  emptyMatch: t("tool.regex-tester.label.emptyMatch"),
                }}
              />
            ) : (
              <p>{t("tool.regex-tester.label.noMatches")}</p>
            )}
          </div>
        ) : (
          <p>{t("label.noResult")}</p>
        ),
        howItWorks,
        faq,
        nextActions: <TextWorkflowLinks tools={[{ label: "Find & Replace", path: "/text/find-replace" }]} />,
        relatedTools: getRelatedTools("regex-tester"),
      }}
    />
  );
}
