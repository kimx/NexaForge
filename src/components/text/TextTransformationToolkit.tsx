import { useEffect, useId, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

export interface TextTransformationMode {
  value: string;
  label: string;
}

export interface TextTransformationToolkitParts {
  workspace: JSX.Element;
  options: JSX.Element;
  result: JSX.Element;
}

interface TextTransformationToolkitProps {
  input: string;
  output: string;
  mode: string;
  modes: readonly TextTransformationMode[];
  inputLabel: string;
  outputLabel?: string;
  modeLabel?: string;
  processLabel?: string;
  processingLabel?: string;
  copyLabel?: string;
  clearLabel?: string;
  resetLabel?: string;
  copyErrorLabel?: string;
  emptyOutputText?: string;
  error?: string | null;
  processing?: boolean;
  processDisabled?: boolean;
  onInputChange: (value: string) => void;
  onModeChange: (value: string) => void;
  onTransform: () => void;
  onClear: () => void;
  onReset: () => void;
  onCopied?: () => void;
  children: (parts: TextTransformationToolkitParts) => JSX.Element;
}

export function TextTransformationToolkit({
  input,
  output,
  mode,
  modes,
  inputLabel,
  outputLabel,
  modeLabel,
  processLabel,
  processingLabel,
  copyLabel,
  clearLabel,
  resetLabel,
  copyErrorLabel,
  emptyOutputText,
  error = null,
  processing = false,
  processDisabled = false,
  onInputChange,
  onModeChange,
  onTransform,
  onClear,
  onReset,
  onCopied,
  children,
}: TextTransformationToolkitProps): JSX.Element {
  const { t } = useLanguage();
  const inputId = useId();
  const modeId = useId();
  const errorId = useId();
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    setCopyError(null);
  }, [output]);

  const handleCopy = async (): Promise<void> => {
    try {
      if (!output || !navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(output);
      setCopyError(null);
      onCopied?.();
    } catch {
      setCopyError(copyErrorLabel ?? t("error.copyFailed"));
    }
  };

  const handleClear = (): void => {
    setCopyError(null);
    onClear();
  };

  const handleReset = (): void => {
    setCopyError(null);
    onReset();
  };

  const workspace = (
    <div className="tool-form text-transformation-toolkit">
      <label htmlFor={inputId}>{inputLabel}</label>
      <textarea
        id={inputId}
        value={input}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onInputChange(event.target.value)}
        rows={10}
      />
      {error ? <p id={errorId} role="alert" className="error">{error}</p> : null}
    </div>
  );

  const options = (
    <div className="tool-form text-transformation-toolkit">
      <label htmlFor={modeId}>
        {modeLabel ?? t("developerTools.mode")}
        <select id={modeId} value={mode} onChange={(event) => onModeChange(event.target.value)}>
          {modes.map((transformationMode) => (
            <option key={transformationMode.value} value={transformationMode.value}>
              {transformationMode.label}
            </option>
          ))}
        </select>
      </label>
      <div className="tool-actions">
        <button
          type="button"
          className="btn primary"
          onClick={onTransform}
          disabled={processDisabled || processing}
          aria-busy={processing}
        >
          {processing ? (processingLabel ?? t("button.processing")) : (processLabel ?? t("button.process"))}
        </button>
      </div>
    </div>
  );

  const result = (
    <>
      <pre className="developer-output" aria-label={outputLabel ?? t("developerTools.output")} tabIndex={0}>
        {output || (emptyOutputText ?? t("developerTools.outputEmpty"))}
      </pre>
      {copyError ? <p role="alert" className="error">{copyError}</p> : null}
      <div className="tool-actions">
        <button type="button" className="btn secondary" onClick={() => void handleCopy()} disabled={!output || processing}>
          {copyLabel ?? t("developerTools.copy")}
        </button>
        <button type="button" className="btn secondary" onClick={handleClear}>
          {clearLabel ?? t("developerTools.clear")}
        </button>
        <button type="button" className="btn secondary" onClick={handleReset}>
          {resetLabel ?? t("developerTools.reset")}
        </button>
      </div>
    </>
  );

  return children({ workspace, options, result });
}
