import { useEffect, useRef, useState, type RefObject } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { trackEvent } from "../../utils/analytics";
import { downloadBlob } from "../../utils/download";

interface TextResultActionsProps {
  text: string;
  filename: string;
  onClear: () => void;
  onUseAsInput?: (text: string) => void;
  labels?: Partial<{
    copy: string;
    download: string;
    clear: string;
    copySuccess: string;
    selectToCopy: string;
    useAsInput: string;
  }>;
  resultRef?: RefObject<HTMLElement>;
  tool?: string;
  operationId?: string;
}

export function TextResultActions({
  text,
  filename,
  onClear,
  onUseAsInput,
  labels,
  resultRef,
  tool,
  operationId,
}: TextResultActionsProps): JSX.Element {
  const { locale, t } = useLanguage();
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [copyMessage, setCopyMessage] = useState("");
  const copyAttempt = useRef(0);

  useEffect(() => {
    copyAttempt.current += 1;
    setCopyStatus("idle");
    setCopyMessage("");
  }, [text, locale]);

  const handleCopy = async (): Promise<void> => {
    if (!text) return;

    const attempt = ++copyAttempt.current;
    setCopyStatus("idle");
    setCopyMessage("");

    try {
      if (typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") {
        throw new Error(t("textWorkflow.copyUnavailable"));
      }

      await navigator.clipboard.writeText(text);
      if (attempt !== copyAttempt.current) return;
      setCopyStatus("success");
      setCopyMessage(labels?.copySuccess ?? t("textWorkflow.copySuccess"));
      trackEvent("copy_success", { tool, operationId });
    } catch (error) {
      if (attempt !== copyAttempt.current) return;
      const reason = error instanceof Error && error.message === t("textWorkflow.copyUnavailable")
        ? t("textWorkflow.copyUnavailable")
        : error && typeof error === "object" && "name" in error && error.name === "NotAllowedError"
          ? t("textWorkflow.copyDenied")
          : t("textWorkflow.copyUnknown");
      setCopyStatus("error");
      setCopyMessage(t("textWorkflow.copyFailure", { reason }));
      trackEvent("copy_failed", { tool, operationId, errorCategory: "copy" });
    }
  };

  const selectResult = (): void => {
    const element = resultRef?.current;
    if (!element) return;

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      element.focus();
      element.select();
      return;
    }

    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleDownload = (): void => {
    try {
      downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
      trackEvent("download_triggered", { tool, operationId });
    } catch {
      // Downloads are best-effort and the browser owns the actual save prompt.
    }
  };

  return (
    <div className="tool-actions text-result-actions">
      <button type="button" className="btn secondary" onClick={() => void handleCopy()} disabled={!text}>
        {labels?.copy ?? t("textWorkflow.copy")}
      </button>
      <button type="button" className="btn secondary" onClick={handleDownload} disabled={!text}>
        {labels?.download ?? t("textWorkflow.download")}
      </button>
      {onUseAsInput ? (
        <button type="button" className="btn secondary" onClick={() => onUseAsInput(text)} disabled={!text}>
          {labels?.useAsInput ?? t("textWorkflow.useAsInput")}
        </button>
      ) : null}
      <button type="button" className="btn secondary" onClick={onClear}>
        {labels?.clear ?? t("textWorkflow.clear")}
      </button>
      {copyStatus === "error" && resultRef ? (
        <button type="button" className="btn secondary" onClick={selectResult} disabled={!text}>
          {labels?.selectToCopy ?? t("textWorkflow.selectToCopy")}
        </button>
      ) : null}
      {copyStatus !== "idle" ? (
        <p className="text-result-actions__status" role="status" aria-live="polite" aria-atomic="true">
          {copyMessage}
        </p>
      ) : null}
    </div>
  );
}
