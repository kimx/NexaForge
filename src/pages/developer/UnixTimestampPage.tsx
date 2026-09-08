import { useEffect, useId, useRef, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage, useLocalizedToolMeta } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { useSeoLanding } from "../../hooks/useSeoLanding";
import {
  convertDateTimeToTimestamp,
  convertUnixTimestamp,
  detectTimestampUnit,
  formatDateInput,
  formatDateTime,
  formatRelativeTime,
  formatTimeInput,
  type DateTimeZone,
  type DateToTimestampConversion,
  type TimestampToDateConversion,
  type TimestampUnit,
  UnixTimestampError,
} from "../../services/developer/unixTimestampService";
import type { ProcessingState, ToolDefinition, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";

type UnixTimestampMode = "timestamp-to-date" | "date-to-timestamp";
type ConversionResult = TimestampToDateConversion | DateToTimestampConversion;

const FALLBACK_TOOL: ToolDefinition = {
  id: "unix-timestamp",
  title: "Unix Timestamp",
  description: "Convert Unix timestamps and dates in your browser.",
  path: "/developer/unix-timestamp",
  category: "Developer",
};

function errorMessage(
  error: unknown,
  t: (key: string) => string
): string {
  if (!(error instanceof UnixTimestampError)) {
    return t("unixTimestamp.error.invalid");
  }
  switch (error.code) {
    case "empty":
      return t("unixTimestamp.error.empty");
    case "ambiguous":
      return t("unixTimestamp.error.ambiguous");
    case "out-of-range":
      return t("unixTimestamp.error.outOfRange");
    default:
      return t("unixTimestamp.error.invalid");
  }
}

export function UnixTimestampPage(): JSX.Element {
  const { t, locale } = useLanguage();
  const landing = useSeoLanding();
  const localToolMeta = useLocalizedToolMeta();
  const tool = FILE_TOOLS.find((item) => item.id === "unix-timestamp") ?? FALLBACK_TOOL;
  const title = localToolMeta(tool.id, "title");
  const description = localToolMeta(tool.id, "description");
  const meta: ToolMeta = {
    title: landing?.content.title ?? `${title} - ${t("header.title")}`,
    description: landing?.content.description ?? description,
    canonical: landing?.definition.path ?? tool.path,
    h1: landing?.content.h1 ?? title,
  };
  useSeo(meta);

  const [mode, setMode] = useState<UnixTimestampMode>("timestamp-to-date");
  const [timestampInput, setTimestampInput] = useState("");
  const [timestampUnit, setTimestampUnit] = useState<TimestampUnit>("auto");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [dateTimeZone, setDateTimeZone] = useState<DateTimeZone>("local");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const inputErrorId = useId();
  const dateInputsInitialized = useRef(false);

  useEffect(() => {
    if (dateInputsInitialized.current || dateInput || timeInput) {
      return;
    }
    dateInputsInitialized.current = true;
    const now = new Date();
    setDateInput(formatDateInput(now));
    setTimeInput(formatTimeInput(now));
  }, [dateInput, timeInput]);

  const resetResult = (): void => {
    setResult(null);
    setError(null);
    setState("idle");
  };

  const handleProcess = (): void => {
    setState("processing");
    setError(null);
    try {
      const nextResult = mode === "timestamp-to-date"
        ? convertUnixTimestamp(timestampInput, timestampUnit)
        : convertDateTimeToTimestamp(dateInput, timeInput, dateTimeZone);
      setResult(nextResult);
      setState("success");
      trackEvent("process_success", { tool: tool.id, action: mode });
    } catch (conversionError) {
      setResult(null);
      setError(errorMessage(conversionError, t));
      setState("error");
      trackEvent("process_failed", { tool: tool.id, action: mode });
    }
  };

  const handleCurrentTimestamp = (): void => {
    const currentMilliseconds = Date.now();
    const input = String(currentMilliseconds);
    const nextResult = convertUnixTimestamp(input, "milliseconds");
    setMode("timestamp-to-date");
    setTimestampInput(input);
    setTimestampUnit("milliseconds");
    setResult(nextResult);
    setError(null);
    setState("success");
    trackEvent("result_action_used", { tool: tool.id, action: "current_timestamp" });
  };

  const handleModeChange = (nextMode: UnixTimestampMode): void => {
    setMode(nextMode);
    resetResult();
  };

  const handleClear = (): void => {
    setTimestampInput("");
    setDateInput("");
    setTimeInput("");
    setTimestampUnit("auto");
    resetResult();
  };

  const handleTimestampInputChange = (value: string): void => {
    setTimestampInput(value);
    setError(null);
    setResult(null);
    setState(value.trim() ? "ready" : "idle");
  };

  const handleDateInputChange = (value: string): void => {
    setDateInput(value);
    setError(null);
    setResult(null);
    setState(value && timeInput ? "ready" : "idle");
  };

  const handleTimeInputChange = (value: string): void => {
    setTimeInput(value);
    setError(null);
    setResult(null);
    setState(value && dateInput ? "ready" : "idle");
  };

  const detectedUnit = timestampUnit === "auto" ? detectTimestampUnit(timestampInput) : timestampUnit;
  const canProcess = mode === "timestamp-to-date"
    ? Boolean(timestampInput.trim())
    : Boolean(dateInput && timeInput);
  const inputError = error ? inputErrorId : undefined;
  const isEnglish = locale === "en";
  const displayLocale = isEnglish ? "en-US" : "zh-TW";
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";

  return (
    <ToolPageTemplate
      tool={tool}
      meta={meta}
      breadcrumb={["Home", title]}
      workflow={{ state, error: null }}
      layout="split"
      children={{
        workspace: (
          <div className="tool-form unix-timestamp__workspace">
            {mode === "timestamp-to-date" ? (
              <label htmlFor="unix-timestamp-input">
                {t("unixTimestamp.timestampInput")}
                <input
                  id="unix-timestamp-input"
                  type="text"
                  inputMode="decimal"
                  value={timestampInput}
                  aria-invalid={Boolean(error)}
                  aria-describedby={inputError}
                  onChange={(event) => handleTimestampInputChange(event.target.value)}
                />
              </label>
            ) : (
              <div className="unix-timestamp__date-fields">
                <label htmlFor="unix-timestamp-date">
                  {t("unixTimestamp.date")}
                  <input
                    id="unix-timestamp-date"
                    type="date"
                    value={dateInput}
                    aria-invalid={Boolean(error)}
                    aria-describedby={inputError}
                    onChange={(event) => handleDateInputChange(event.target.value)}
                  />
                </label>
                <label htmlFor="unix-timestamp-time">
                  {t("unixTimestamp.time")}
                  <input
                    id="unix-timestamp-time"
                    type="time"
                    step="1"
                    value={timeInput}
                    aria-invalid={Boolean(error)}
                    aria-describedby={inputError}
                    onChange={(event) => handleTimeInputChange(event.target.value)}
                  />
                </label>
              </div>
            )}
            {error ? <p id={inputErrorId} className="error" role="alert">{error}</p> : null}
            <p className="unix-timestamp__local-note">{t("unixTimestamp.browserOnly")}</p>
          </div>
        ),
        options: (
          <div className="tool-form unix-timestamp__options">
            <label htmlFor="unix-timestamp-mode">
              {t("unixTimestamp.mode")}
              <select
                id="unix-timestamp-mode"
                value={mode}
                onChange={(event) => handleModeChange(event.target.value as UnixTimestampMode)}
              >
                <option value="timestamp-to-date">{t("unixTimestamp.timestampToDate")}</option>
                <option value="date-to-timestamp">{t("unixTimestamp.dateToTimestamp")}</option>
              </select>
            </label>
            {mode === "timestamp-to-date" ? (
              <>
                <label htmlFor="unix-timestamp-unit">
                  {t("unixTimestamp.unit")}
                  <select
                    id="unix-timestamp-unit"
                    value={timestampUnit}
                    onChange={(event) => {
                      setTimestampUnit(event.target.value as TimestampUnit);
                      resetResult();
                    }}
                  >
                    <option value="auto">{t("unixTimestamp.auto")}</option>
                    <option value="seconds">{t("unixTimestamp.seconds")}</option>
                    <option value="milliseconds">{t("unixTimestamp.milliseconds")}</option>
                  </select>
                </label>
                <p className="unix-timestamp__detection">
                  {detectedUnit
                    ? t(`unixTimestamp.detected.${detectedUnit}`)
                    : t("unixTimestamp.detectionHelp")}
                </p>
              </>
            ) : (
              <>
                <label htmlFor="unix-timestamp-timezone">
                  {t("unixTimestamp.timezone")}
                  <select
                    id="unix-timestamp-timezone"
                    value={dateTimeZone}
                    onChange={(event) => {
                      setDateTimeZone(event.target.value as DateTimeZone);
                      resetResult();
                    }}
                  >
                    <option value="local">{t("unixTimestamp.local")}</option>
                    <option value="utc">UTC</option>
                  </select>
                </label>
                <p className="unix-timestamp__detection">{t("unixTimestamp.timezoneHelp", { timeZone: localTimeZone })}</p>
              </>
            )}
            <div className="tool-actions">
              <button type="button" className="btn primary" onClick={handleProcess} disabled={!canProcess || state === "processing"}>
                {t("unixTimestamp.convert")}
              </button>
              <button type="button" className="btn secondary" onClick={handleCurrentTimestamp}>
                {t("unixTimestamp.current")}
              </button>
              <button type="button" className="btn secondary" onClick={handleClear}>
                {t("unixTimestamp.clear")}
              </button>
            </div>
          </div>
        ),
        result: (
          <div className="unix-timestamp__result">
            {result?.direction === "timestamp-to-date" ? (
              <>
                <p className="unix-timestamp__result-meta">
                  {t(`unixTimestamp.detected.${result.unit}`)}
                </p>
                <dl className="unix-timestamp__result-list">
                  <div className="unix-timestamp__result-row">
                    <dt>{t("unixTimestamp.localDatetime")}</dt>
                    <dd>{formatDateTime(result.date, displayLocale)}</dd>
                  </div>
                  <div className="unix-timestamp__result-row">
                    <dt>{t("unixTimestamp.utcDatetime")}</dt>
                    <dd>{formatDateTime(result.date, displayLocale, "UTC")}</dd>
                  </div>
                  <div className="unix-timestamp__result-row">
                    <dt>{t("unixTimestamp.iso")}</dt>
                    <dd>{result.date.toISOString()}</dd>
                  </div>
                  <div className="unix-timestamp__result-row">
                    <dt>{t("unixTimestamp.relative")}</dt>
                    <dd>{formatRelativeTime(result.milliseconds, displayLocale)}</dd>
                  </div>
                </dl>
              </>
            ) : result?.direction === "date-to-timestamp" ? (
              <>
                <p className="unix-timestamp__result-meta">
                  {t("unixTimestamp.interpretedAs", {
                    timeZone: result.timeZone === "utc" ? "UTC" : localTimeZone,
                  })}
                </p>
                <dl className="unix-timestamp__result-list">
                  <div className="unix-timestamp__result-row">
                    <dt>{t("unixTimestamp.seconds")}</dt>
                    <dd data-testid="unix-result-seconds">{result.seconds}</dd>
                  </div>
                  <div className="unix-timestamp__result-row">
                    <dt>{t("unixTimestamp.milliseconds")}</dt>
                    <dd data-testid="unix-result-milliseconds">{result.milliseconds}</dd>
                  </div>
                </dl>
              </>
            ) : null}
          </div>
        ),
        howItWorks: [0, 1, 2].map((index) => t(`unixTimestamp.how.${index}`)),
        faq: [0, 1].map((index) => ({
          q: t(`unixTimestamp.faq.${index}.question`),
          a: t(`unixTimestamp.faq.${index}.answer`),
        })),
        relatedTools: getRelatedTools(tool.id),
      }}
    />
  );
}
