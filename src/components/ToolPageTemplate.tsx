import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { PrivacyNotice } from "./PrivacyNotice";
import { AdSlot } from "./AdSlot";
import type { ToolMeta, ToolDefinition, ToolWorkflow } from "../types/tool";
import { useLanguage, useLocalizedToolMeta } from "../context/LanguageContext";
import { trackEvent } from "../utils/analytics";
import { ProcessingStatus } from "./ProcessingStatus";

interface ToolPageTemplateProps {
  tool: ToolDefinition;
  meta: ToolMeta;
  breadcrumb: string[];
  workflow?: ToolWorkflow;
  children: {
    workspace: JSX.Element;
    options: JSX.Element;
    result: JSX.Element;
    nextActions?: JSX.Element;
    howItWorks: string[];
    faq: { q: string; a: string }[];
    relatedTools: ToolDefinition[];
  };
}

export function ToolPageTemplate({
  tool,
  meta,
  breadcrumb,
  workflow,
  children,
}: ToolPageTemplateProps): JSX.Element {
  const { t } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const resultRef = useRef<HTMLElement | null>(null);

  const toolTitle = localToolMeta(tool.id, "title");
  const toolDescription = localToolMeta(tool.id, "description");

  const localizedBreadcrumb = breadcrumb.map((item, index) => {
    if (index === 0) {
      return t("sidebar.home");
    }
    if (index === 1) {
      return item === tool.title ? toolTitle : item;
    }
    return item;
  });

  useEffect(() => {
    trackEvent("tool_open", { tool: tool.id });
  }, [tool.id]);

  useEffect(() => {
    if (workflow?.state !== "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [workflow?.state]);

  const showResultContent = !workflow || workflow.state === "success";
  const showResultSection = !workflow || workflow.state !== "idle";

  return (
    <main className={`tool-page ${tool.id === "json-formatter" ? "tool-page--json-formatter" : ""}`}>
      <div className="tool-container">
        <nav className="breadcrumb tool-page__breadcrumb" aria-label={t("breadcrumb.aria")}>
          {localizedBreadcrumb.map((item, index) => (
            <span key={item}>
              {index > 0 ? " / " : ""}
              {item}
            </span>
          ))}
        </nav>

        <div className="tool-page__title-row">
          <h1 className="tool-page__title">{toolTitle}</h1>
          <PrivacyNotice inline />
        </div>
        <p className="short-description tool-page__description">{toolDescription}</p>

        <div className="tool-page__duo">
          <section className="tool-card tool-page__panel tool-page__panel--workspace">
            <h2>{t("toolPage.workspace")}</h2>
            {children.workspace}
          </section>
          <section className="tool-card tool-page__panel tool-page__panel--options">
            <h2>{t("toolPage.options")}</h2>
            {children.options}
          </section>
        </div>

        {showResultSection ? (
          <section className={`tool-card tool-page__result${workflow ? ` tool-page__result--${workflow.state}` : ""}`} ref={resultRef}>
            <h2>{t("toolPage.result")}</h2>
            {workflow ? <ProcessingStatus {...workflow} /> : null}
            {showResultContent ? children.result : null}
            {workflow?.state === "success" && children.nextActions ? (
              <div className="next-actions">
                <h3>{t("toolPage.nextActions")}</h3>
                <div className="next-actions__row">{children.nextActions}</div>
                {workflow.onReprocess ? (
                  <button type="button" className="btn secondary" onClick={workflow.onReprocess}>
                    {t("toolPage.reprocess")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <AdSlot
          position="tool-result"
          adSlotId={import.meta.env.VITE_ADSENSE_SLOT_TOOL_RESULT}
        />

        <section className="tool-card">
          <h2>{t("toolPage.how")}</h2>
          <ol className="tool-steps">
            {children.howItWorks.map((step, index) => (
              <li key={step} data-index={index + 1}>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="tool-card">
          <h2>{t("toolPage.faq")}</h2>
          <div className="tool-faq">
            {children.faq.map((item) => (
              <details key={item.q} className="tool-faq__item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="tool-card">
          <h2>{t("toolPage.related")}</h2>
          <ul className="related-tools">
            {children.relatedTools.map((relatedTool) => (
              <li key={relatedTool.id}>
                <Link to={relatedTool.path}>{localToolMeta(relatedTool.id, "title")}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
