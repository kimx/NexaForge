import { useId, useMemo, useState } from "react";
import { CodeOutputPanel } from "../../components/CodeOutputPanel";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { parseUrl, type ParsedUrl } from "../../services/url/urlParserService";
import type { ToolDefinition, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";

const FALLBACK_TOOL: ToolDefinition = {
  id: "url-parser",
  title: "URL Parser",
  description: "Parse a URL locally.",
  path: "/developer/url-parser",
  category: "Developer",
};

const SCALAR_FIELDS = [
  "href", "origin", "protocol", "host", "hostname", "port", "pathname", "search", "hash",
] as const;

export function UrlParserPage(): JSX.Element {
  const { t } = useLanguage();
  const [source, setSource] = useState("");
  const [parsed, setParsed] = useState<ParsedUrl | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const inputErrorId = useId();
  const tool = FILE_TOOLS.find((item) => item.id === "url-parser") ?? FALLBACK_TOOL;
  const title = t("tool.url-parser.title");
  const description = t("tool.url-parser.description");
  const meta: ToolMeta = { title: `${title} - ${t("header.title")}`, description, canonical: tool.path, h1: title };
  useSeo(meta);

  const output = useMemo(() => parsed ? JSON.stringify(parsed, null, 2) : "", [parsed]);
  const howItWorks = useMemo(() => [0, 1, 2].map((index) => t(`tool.url-parser.how.${index}`)), [t]);
  const faq = useMemo(() => [0, 1].map((index) => ({
    q: t(`tool.url-parser.faq.${index}.question`),
    a: t(`tool.url-parser.faq.${index}.answer`),
  })), [t]);

  const updateSource = (value: string): void => {
    setSource(value);
    setCopyStatus("");
    if (!value.trim()) {
      setParsed(null);
      setInputError(null);
      return;
    }
    try {
      setParsed(parseUrl(value));
      setInputError(null);
    } catch {
      setParsed(null);
      setInputError(t("tool.url-parser.invalid"));
    }
  };

  const copyField = async (field: typeof SCALAR_FIELDS[number], value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(t("tool.url-parser.copied", { field: t(`tool.url-parser.field.${field}`) }));
      trackEvent("result_action_used", { tool: tool.id, action: "copy-field" });
    } catch {
      setCopyStatus(t("tool.url-parser.copyFailed"));
    }
  };

  return (
    <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} layout="split">
      {{
        workspace: (
          <div className="tool-form">
            <label htmlFor="url-parser-input">{t("tool.url-parser.input")}</label>
            <input
              id="url-parser-input"
              type="url"
              value={source}
              onChange={(event) => updateSource(event.target.value)}
              aria-invalid={Boolean(inputError)}
              aria-describedby={inputError ? inputErrorId : undefined}
              spellCheck={false}
              placeholder="https://abc.com/api?id=123&type=A"
            />
            {inputError ? <p className="error" id={inputErrorId}>{inputError}</p> : null}
            {copyStatus ? <p role="status" aria-live="polite">{copyStatus}</p> : null}
          </div>
        ),
        options: null,
        result: parsed ? (
          <div>
            <dl className="issue26-url-fields">
              {SCALAR_FIELDS.map((field) => (
                <div className="issue26-url-fields__row" key={field}>
                  <dt>{t(`tool.url-parser.field.${field}`)}</dt>
                  <dd>
                    <code>{parsed[field] || "—"}</code>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => copyField(field, parsed[field])}
                      disabled={!parsed[field]}
                      aria-label={t("tool.url-parser.copy", { field: t(`tool.url-parser.field.${field}`) })}
                    >
                      {t("button.copy")}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
            <h3>{t("tool.url-parser.queryParameters")}</h3>
            {parsed.queryParameters.length ? (
              <div className="scrollbox">
                <table className="issue26-query-table" aria-label={t("tool.url-parser.queryParameters")}>
                  <thead><tr><th scope="col">{t("tool.url-parser.queryName")}</th><th scope="col">{t("tool.url-parser.queryValue")}</th></tr></thead>
                  <tbody>
                    {parsed.queryParameters.map((parameter, index) => (
                      <tr key={`${parameter.key}-${parameter.value}-${index}`}>
                        <td><code>{parameter.key}</code></td>
                        <td><code>{parameter.value}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>{t("tool.url-parser.noQuery")}</p>}
            <CodeOutputPanel
              label={t("tool.url-parser.json")}
              value={output}
              fileName="parsed-url.json"
              language="json"
              emptyText={t("tool.url-parser.noOutput")}
            />
          </div>
        ) : (
          <CodeOutputPanel
            label={t("tool.url-parser.json")}
            value=""
            fileName="parsed-url.json"
            language="json"
            emptyText={t("tool.url-parser.noOutput")}
          />
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools(tool.id),
      }}
    </ToolPageTemplate>
  );
}
