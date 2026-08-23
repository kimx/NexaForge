import { useEffect, useMemo, useState } from "react";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import {
  DEFAULT_CRON_STATE,
  buildCronExpression,
  withDayOfMonth,
  withWeekdays,
  type CronBuilderState,
} from "../../services/cron/cronBuilder";
import { getNextExecutions } from "../../services/cron/cronScheduleService";
import type { ToolDefinition, ToolMeta } from "../../types/tool";
import { trackEvent } from "../../utils/analytics";
import { getRelatedTools } from "../../utils/toolHelpers";

const FALLBACK_TOOL: ToolDefinition = {
  id: "cron-builder",
  title: "Cron Expression Builder",
  description: "Build a Cron expression locally.",
  path: "/developer/cron-builder",
  category: "Developer",
};

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function CronBuilderPage(): JSX.Element {
  const { t, locale } = useLanguage();
  const [schedule, setSchedule] = useState<CronBuilderState>(() => ({
    ...DEFAULT_CRON_STATE,
    weekdays: [],
  }));
  const [executions, setExecutions] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const expression = useMemo(() => buildCronExpression(schedule), [schedule]);

  const tool = FILE_TOOLS.find((item) => item.id === "cron-builder") ?? FALLBACK_TOOL;
  const title = t("tool.cron-builder.title");
  const description = t("tool.cron-builder.description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: tool.path,
    h1: title,
  };
  useSeo(meta);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getNextExecutions(expression, { currentDate: new Date(), timeZone })
      .then((next) => {
        if (!active) return;
        setExecutions(next);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setExecutions([]);
        setLoading(false);
        setError(t("tool.cron-builder.failed"));
      });
    return () => {
      active = false;
    };
  }, [expression, refreshKey, t, timeZone]);

  const howItWorks = useMemo(
    () => [0, 1, 2].map((index) => t(`tool.cron-builder.how.${index}`)),
    [t]
  );
  const faq = useMemo(
    () => [0, 1].map((index) => ({
      q: t(`tool.cron-builder.faq.${index}.question`),
      a: t(`tool.cron-builder.faq.${index}.answer`),
    })),
    [t]
  );
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en" : "zh-TW", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone,
    }),
    [locale, timeZone]
  );

  const setMinuteMode = (mode: string): void => {
    setSchedule((current) => ({
      ...current,
      minute: mode === "every"
        ? { mode: "every" }
        : mode === "interval"
          ? { mode: "interval", value: 5 }
          : { mode: "specific", value: 0 },
    }));
  };

  const setValueMode = (field: "hour" | "month", mode: string): void => {
    setSchedule((current) => ({
      ...current,
      [field]: mode === "every"
        ? { mode: "every" }
        : { mode: "specific", value: field === "hour" ? 0 : 1 },
    }));
  };

  const updateWeekday = (weekday: number, selected: boolean): void => {
    setSchedule((current) => {
      const values = selected
        ? [...current.weekdays, weekday]
        : current.weekdays.filter((value) => value !== weekday);
      if (values.length > 0 && current.dayOfMonth.mode !== "every") {
        setAnnouncement(t("tool.cron-builder.resetDayOfMonth"));
      }
      return withWeekdays(current, values);
    });
  };

  return (
    <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]}>
      {{
        workspace: (
          <div className="tool-form">
            <div className="issue26-cron-expression">
              <label htmlFor="cron-expression">{t("tool.cron-builder.expression")}</label>
              <input id="cron-expression" value={expression} readOnly />
              <div className="issue26-inline-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(expression);
                    setAnnouncement(t("status.copied"));
                    trackEvent("result_action_used", { tool: tool.id, action: "copy" });
                  }}
                >
                  {t("tool.cron-builder.copy")}
                </button>
              </div>
            </div>
            <p className="issue26-time-zone">{t("tool.cron-builder.timeZone", { timeZone })}</p>
          </div>
        ),
        options: (
          <div className="tool-form">
            <div className="issue26-control-grid">
              <div className="issue26-field">
                <label htmlFor="cron-minute-mode">{t("tool.cron-builder.minuteSchedule")}</label>
                <select id="cron-minute-mode" value={schedule.minute.mode} onChange={(event) => setMinuteMode(event.target.value)}>
                  <option value="every">{t("tool.cron-builder.every")}</option>
                  <option value="specific">{t("tool.cron-builder.specific")}</option>
                  <option value="interval">{t("tool.cron-builder.interval")}</option>
                </select>
                {schedule.minute.mode !== "every" ? (
                  <label>
                    {t("tool.cron-builder.minuteValue")}
                    <input
                      type="number"
                      min={schedule.minute.mode === "interval" ? 2 : 0}
                      max={schedule.minute.mode === "interval" ? 30 : 59}
                      value={schedule.minute.value}
                      onChange={(event) => setSchedule((current) => ({
                        ...current,
                        minute: { ...current.minute, value: Number(event.target.value) } as typeof current.minute,
                      }))}
                    />
                  </label>
                ) : null}
              </div>
              <div className="issue26-field">
                <label htmlFor="cron-hour-mode">{t("tool.cron-builder.hourSchedule")}</label>
                <select id="cron-hour-mode" value={schedule.hour.mode} onChange={(event) => setValueMode("hour", event.target.value)}>
                  <option value="every">{t("tool.cron-builder.every")}</option>
                  <option value="specific">{t("tool.cron-builder.specific")}</option>
                </select>
                {schedule.hour.mode === "specific" ? (
                  <label>
                    {t("tool.cron-builder.hourValue")}
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={schedule.hour.value}
                      onChange={(event) => setSchedule((current) => ({ ...current, hour: { mode: "specific", value: Number(event.target.value) } }))}
                    />
                  </label>
                ) : null}
              </div>
              <div className="issue26-field">
                <label htmlFor="cron-day-mode">{t("tool.cron-builder.dayOfMonthSchedule")}</label>
                <select
                  id="cron-day-mode"
                  value={schedule.dayOfMonth.mode}
                  onChange={(event) => {
                    const specific = event.target.value === "specific";
                    if (specific && schedule.weekdays.length > 0) setAnnouncement(t("tool.cron-builder.resetWeekdays"));
                    setSchedule((current) => withDayOfMonth(current, specific ? 1 : null));
                  }}
                >
                  <option value="every">{t("tool.cron-builder.every")}</option>
                  <option value="specific">{t("tool.cron-builder.specific")}</option>
                </select>
                {schedule.dayOfMonth.mode === "specific" ? (
                  <label>
                    {t("tool.cron-builder.dayOfMonthValue")}
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={schedule.dayOfMonth.value}
                      onChange={(event) => setSchedule((current) => withDayOfMonth(current, Number(event.target.value)))}
                    />
                  </label>
                ) : null}
              </div>
              <div className="issue26-field">
                <label htmlFor="cron-month-mode">{t("tool.cron-builder.monthSchedule")}</label>
                <select id="cron-month-mode" value={schedule.month.mode} onChange={(event) => setValueMode("month", event.target.value)}>
                  <option value="every">{t("tool.cron-builder.every")}</option>
                  <option value="specific">{t("tool.cron-builder.specific")}</option>
                </select>
                {schedule.month.mode === "specific" ? (
                  <label>
                    {t("tool.cron-builder.monthValue")}
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={schedule.month.value}
                      onChange={(event) => setSchedule((current) => ({ ...current, month: { mode: "specific", value: Number(event.target.value) } }))}
                    />
                  </label>
                ) : null}
              </div>
            </div>
            <fieldset className="issue26-weekdays">
              <legend>{t("tool.cron-builder.weekdays")}</legend>
              {WEEKDAYS.map((weekday) => (
                <label key={weekday}>
                  <input
                    type="checkbox"
                    checked={schedule.weekdays.includes(weekday)}
                    onChange={(event) => updateWeekday(weekday, event.target.checked)}
                  />
                  {t(`tool.cron-builder.weekday.${weekday}`)}
                </label>
              ))}
            </fieldset>
            {announcement ? <p role="status" aria-live="polite">{announcement}</p> : null}
            <button
              type="button"
              className="btn primary"
              onClick={() => setRefreshKey((value) => value + 1)}
              aria-busy={loading}
            >
              {t("tool.cron-builder.refresh")}
            </button>
          </div>
        ),
        result: (
          <div>
            {error ? <p className="error" role="alert">{error}</p> : null}
            {loading ? <p aria-live="polite">{t("toolPage.workflow.processing")}</p> : null}
            {!loading && !error ? (
              <ol className="issue26-run-list" aria-label={t("tool.cron-builder.nextRuns")}>
                {executions.map((date, index) => (
                  <li key={`${date.toISOString()}-${index}`} aria-label={t("tool.cron-builder.execution", { index: index + 1, time: formatter.format(date) })}>
                    <time dateTime={date.toISOString()}>{formatter.format(date)}</time>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ),
        howItWorks,
        faq,
        relatedTools: getRelatedTools(tool.id),
      }}
    </ToolPageTemplate>
  );
}
