import { useEffect, useId, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { PrivacyNotice } from "./PrivacyNotice";
import { AdSlot } from "./AdSlot";
import type { ToolMeta, ToolDefinition, ToolWorkflow } from "../types/tool";
import { useLanguage, useLocalizedToolMeta } from "../context/LanguageContext";
import { trackEvent } from "../utils/analytics";
import { ProcessingStatus } from "./ProcessingStatus";
import { JsonWorkspaceNav } from "./JsonWorkspaceNav";
import { localizePath } from "../routing/localePaths";
import { getSeoLandingContent } from "../seo/landingPages";
import { SeoLandingContent } from "./SeoLandingContent";

interface ToolPageTemplateProps {
  tool: ToolDefinition;
  meta: ToolMeta;
  breadcrumb: string[];
  workflow?: ToolWorkflow;
  layout?: "default" | "split";
  showIdleResult?: boolean;
  children: {
    workspace: JSX.Element;
    options: JSX.Element | null;
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
  layout = "default",
  showIdleResult = false,
  children,
}: ToolPageTemplateProps): JSX.Element {
  const { t, locale } = useLanguage();
  const { pathname } = useLocation();
  const localToolMeta = useLocalizedToolMeta();
  const resultRef = useRef<HTMLElement | null>(null);
  const previousWorkflowState = useRef(workflow?.state);
  const resultHeadingId = useId();

  const toolTitle = localToolMeta(tool.id, "title");
  const toolDescription = localToolMeta(tool.id, "description");
  const seoContent = getSeoLandingContent(pathname, locale);
  const displayTitle = seoContent?.h1 ?? toolTitle;
  const displayDescription = seoContent?.description ?? toolDescription;

  const localizedBreadcrumb = breadcrumb.map((item, index) => {
    if (index === 0) {
      return t("sidebar.home");
    }
    if (index === 1) {
      return item === tool.title ? displayTitle : item;
    }
    return item;
  });

  useEffect(() => {
    trackEvent("tool_open", { tool: tool.id });
  }, [tool.id]);

  useEffect(() => {
    const previousState = previousWorkflowState.current;
    const nextState = workflow?.state;
    previousWorkflowState.current = nextState;

    if ((nextState !== "success" && nextState !== "error") || previousState === nextState) {
      return;
    }

    const timer = window.setTimeout(() => {
      const result = resultRef.current;
      if (!result) {
        return;
      }

      const bounds = result.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isOutsideViewport = bounds.top < 0 || bounds.bottom > viewportHeight;
      if (!isOutsideViewport) {
        return;
      }

      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      result.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      result.focus({ preventScroll: true });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [workflow?.state]);

  const showResultContent =
    !workflow || workflow.state === "success" || (showIdleResult && workflow.state === "idle");
  const showResultSection = layout === "split" || !workflow || workflow.state !== "idle";

  return (
    <div className={`tool-page tool-page--${tool.id} tool-page--layout-${layout}`}>
      <div className="tool-container">
        <nav className="breadcrumb tool-page__breadcrumb" aria-label={t("breadcrumb.aria")}>
          <ol>
            {localizedBreadcrumb.map((item, index) => (
              <li key={item}>
                {index === 0 ? (
                  <Link to={localizePath("/", locale)}>{item}</Link>
                ) : (
                  <span aria-current={index === localizedBreadcrumb.length - 1 ? "page" : undefined}>{item}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="tool-page__title-row">
          <h1 className="tool-page__title">{displayTitle}</h1>
          <PrivacyNotice inline />
        </div>
        <p className="short-description tool-page__description">{displayDescription}</p>
        <JsonWorkspaceNav />

        <div className={`tool-page__workbench tool-page__workbench--${layout}`}>
          <div className={`tool-page__duo${children.options ? "" : " tool-page__duo--single"}`}>
            <section className="tool-card tool-page__panel tool-page__panel--workspace">
              <h2>{t("toolPage.workspace")}</h2>
              {children.workspace}
            </section>
            {children.options ? (
              <section className="tool-card tool-page__panel tool-page__panel--options">
                <h2>{t("toolPage.options")}</h2>
                {children.options}
              </section>
            ) : null}
          </div>

          {showResultSection ? (
            <section
              className={`tool-card tool-page__result${workflow ? ` tool-page__result--${workflow.state}` : ""}`}
              ref={resultRef}
              aria-labelledby={resultHeadingId}
              tabIndex={-1}
            >
              <h2 id={resultHeadingId}>{t("toolPage.result")}</h2>
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
        </div>

        {seoContent ? (
          <SeoLandingContent content={seoContent} locale={locale} />
        ) : (
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
        )}

        <AdSlot
          position="tool-result"
          adSlotId={import.meta.env.VITE_ADSENSE_SLOT_TOOL_RESULT}
        />

        {!seoContent ? (
          <>
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
                    <Link to={localizePath(relatedTool.path, locale)}>{localToolMeta(relatedTool.id, "title")}</Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
