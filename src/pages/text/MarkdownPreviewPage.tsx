import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ToolMeta } from "../../types/tool";
import { FILE_TOOLS } from "../../data/tools";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { getRelatedTools } from "../../utils/toolHelpers";
import { useSeo } from "../../hooks/useSeo";
import { useLanguage } from "../../context/LanguageContext";

export function MarkdownPreviewPage(): JSX.Element {
  const { t } = useLanguage();
  const [markdown, setMarkdown] = useState(() => t("tool.markdown-previewer.sample"));
  const [copyError, setCopyError] = useState<string | null>(null);
  const tool = FILE_TOOLS.find((item) => item.id === "markdown-previewer");
  const title = t("tool.markdown-previewer.title");
  const description = t("tool.markdown-previewer.description");
  const toolMeta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/text/markdown",
    h1: title,
  };

  useSeo(toolMeta);
  const relatedTools = getRelatedTools("markdown-previewer");
  const howItWorks = useMemo(
    () => [
      t("tool.markdown-previewer.how.0"),
      t("tool.markdown-previewer.how.1"),
      t("tool.markdown-previewer.how.2"),
    ],
    [t]
  );
  const faq = useMemo(
    () => [
      {
        q: t("tool.markdown-previewer.faq.0.question"),
        a: t("tool.markdown-previewer.faq.0.answer"),
      },
      {
        q: t("tool.markdown-previewer.faq.1.question"),
        a: t("tool.markdown-previewer.faq.1.answer"),
      },
    ],
    [t]
  );

  const handleClear = () => {
    setMarkdown("");
    setCopyError(null);
  };

  const handleCopy = async () => {
    if (!markdown) {
      setCopyError(t("error.selectText"));
      return;
    }

    try {
      await navigator.clipboard.writeText(markdown);
      setCopyError(null);
    } catch {
      setCopyError(t("error.copyFailed"));
    }
  };

  return (
    <ToolPageTemplate
      tool={tool ?? FILE_TOOLS[0]}
      meta={toolMeta}
      breadcrumb={["Home", t("tool.markdown-previewer.title")]}
      children={{
        workspace: (
          <div className="tool-form">
            <label>
              {t("tool.markdown-previewer.label.input")}
              <textarea
                rows={14}
                value={markdown}
                onChange={(event) => {
                  setMarkdown(event.target.value);
                  setCopyError(null);
                }}
              />
            </label>
          </div>
        ),
        options: (
          <div className="tool-form">
            <div className="tool-actions">
              <button type="button" className="btn secondary" onClick={handleClear}>
                {t("tool.markdown-previewer.button.clear")}
              </button>
            </div>
          </div>
        ),
        result: (
          <>
            {copyError && <p role="alert" className="error">{copyError}</p>}
            <h3 className="markdown-preview__title">{t("tool.markdown-previewer.label.preview")}</h3>
            {markdown ? (
              <article className="markdown-preview">
                <ReactMarkdown>{markdown}</ReactMarkdown>
              </article>
            ) : (
              <p>{t("tool.markdown-previewer.label.noOutput")}</p>
            )}
            <div className="tool-actions">
              <button type="button" className="btn secondary" onClick={handleCopy}>
                {t("tool.markdown-previewer.button.copy")}
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
