import type { ToolWorkflow } from "../types/tool";
import { useLanguage } from "../context/LanguageContext";

interface ProcessingStatusProps extends ToolWorkflow {
  className?: string;
}

export function ProcessingStatus({
  state,
  error,
  progress,
  onRetry,
  className = "",
}: ProcessingStatusProps): JSX.Element {
  const { t } = useLanguage();
  const isActive = state === "processing";

  return (
    <div className={`processing-status processing-status--${state} ${className}`.trim()} role="status" aria-live="polite">
      <div className="processing-status__phase">
        <span
          className={`processing-status__indicator${isActive ? " processing-status__indicator--spinning" : ""}`}
          aria-hidden="true"
        />
        <span>{t(`toolPage.workflow.${state}`)}</span>
      </div>
      {isActive ? (
        <progress
          className="processing-status__progress"
          value={typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : undefined}
          max={100}
          aria-label={t("toolPage.workflow.progress")}
        />
      ) : null}
      {state === "error" && error ? <p className="tool-page__error" role="alert">{error}</p> : null}
      {state === "error" && onRetry ? (
        <button type="button" className="btn secondary" onClick={onRetry}>
          {t("toolPage.retry")}
        </button>
      ) : null}
    </div>
  );
}
