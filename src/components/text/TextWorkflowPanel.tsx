import { Link } from "react-router-dom";
import { useLanguage, useLocalizedToolMeta } from "../../context/LanguageContext";
import { TEXT_WORKFLOW_TOOLS, useTextWorkflow, type TextWorkflowToolId } from "../../context/TextWorkflowContext";
import { localizePath } from "../../routing/localePaths";
import { listCleanupMessages } from "../../pages/text/listCleanupMessages";

export function TextWorkflowPanel({ currentTool }: { currentTool: TextWorkflowToolId }): JSX.Element {
  const { t, locale } = useLanguage();
  const toolMeta = useLocalizedToolMeta();
  const { drafts, originalInput, clear } = useTextWorkflow();
  const hasContent = originalInput !== null || TEXT_WORKFLOW_TOOLS.some((tool) => drafts[tool].input || drafts[tool].output !== null);

  return (
    <div className="text-workflow-panel">
      <p className="text-workflow-panel__notice">{t("textWorkflow.memory")}</p>
      <Link className="btn secondary" to={localizePath("/text/list-cleanup", locale)}>{listCleanupMessages[locale].title}</Link>
      <nav aria-label={t("textWorkflow.steps")} className="tool-actions">
        {TEXT_WORKFLOW_TOOLS.filter((tool) => tool === currentTool || drafts[tool].input || drafts[tool].output !== null).map((tool) => (
          <Link key={tool} to={localizePath(`/text/${tool}`, locale)} aria-current={tool === currentTool ? "step" : undefined}>
            {toolMeta(tool, "title")}
          </Link>
        ))}
      </nav>
      {originalInput !== null ? (
        <details>
          <summary>{t("textWorkflow.original")}</summary>
          <label>{t("textWorkflow.originalInput")}
            <textarea value={originalInput} readOnly rows={4} spellCheck={false} />
          </label>
        </details>
      ) : null}
      <button type="button" className="btn secondary" onClick={clear} disabled={!hasContent}>{t("textWorkflow.clear")}</button>
    </div>
  );
}
