import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, useLocalizedToolMeta } from "../../context/LanguageContext";
import { useTextWorkflow, type TextWorkflowToolId } from "../../context/TextWorkflowContext";
import { localizePath } from "../../routing/localePaths";
import { trackEvent } from "../../utils/analytics";

export function TextWorkflowActions({ source, targets }: { source: TextWorkflowToolId; targets: readonly TextWorkflowToolId[] }): JSX.Element {
  const { t, locale } = useLanguage();
  const toolMeta = useLocalizedToolMeta();
  const { drafts, transfer } = useTextWorkflow();
  const navigate = useNavigate();
  const output = drafts[source].output;
  const [pending, setPending] = useState<TextWorkflowToolId | null>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const promptId = useId();

  useEffect(() => { setPending(null); }, [output]);
  useEffect(() => { if (pending) promptRef.current?.focus(); }, [pending]);

  const go = (target: TextWorkflowToolId, replace: boolean): void => {
    if (!output) return;
    trackEvent("workflow_continue", {
      sourceTool: source,
      targetTool: target,
      action: replace ? "replace" : "keep",
      language: locale,
    });
    if (replace) transfer(source, target);
    navigate(localizePath(`/text/${target}`, locale));
  };
  const cancel = (): void => {
    setPending(null);
    triggerRef.current?.focus();
  };

  return (
    <div className="text-workflow-actions">
      <div className="tool-actions">
        {targets.map((target) => (
          <button key={target} type="button" className="btn secondary" disabled={!output} onClick={(event) => {
            triggerRef.current = event.currentTarget;
            if (drafts[target].input) setPending(target);
            else go(target, true);
          }}>
            {t("textWorkflow.continue", { tool: toolMeta(target, "title") })}
          </button>
        ))}
      </div>
      {pending ? (
        <div className="text-workflow-confirm" role="group" aria-labelledby={promptId} tabIndex={-1} ref={promptRef} onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); cancel(); }
        }}>
          <h4 id={promptId}>{t("textWorkflow.confirm")}</h4>
          <p>{t("textWorkflow.overwrite", { tool: toolMeta(pending, "title") })}</p>
          <div className="tool-actions">
            <button type="button" className="btn primary" onClick={() => go(pending, true)}>{t("textWorkflow.replace")}</button>
            <button type="button" className="btn secondary" onClick={() => go(pending, false)}>{t("textWorkflow.keep")}</button>
            <button type="button" className="btn secondary" onClick={cancel}>{t("textWorkflow.cancel")}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
