export type CronMinuteField =
  | { mode: "every" }
  | { mode: "specific"; value: number }
  | { mode: "interval"; value: number };

export type CronValueField =
  | { mode: "every" }
  | { mode: "specific"; value: number };

export interface CronBuilderState {
  minute: CronMinuteField;
  hour: CronValueField;
  dayOfMonth: CronValueField;
  month: CronValueField;
  weekdays: number[];
}

export type CronBuilderErrorCode =
  | "minute"
  | "hour"
  | "day-of-month"
  | "month"
  | "weekday"
  | "ambiguous-days";

export class CronBuilderError extends Error {
  readonly code: CronBuilderErrorCode;

  constructor(code: CronBuilderErrorCode) {
    super(code);
    this.name = "CronBuilderError";
    this.code = code;
  }
}

export const DEFAULT_CRON_STATE: CronBuilderState = {
  minute: { mode: "every" },
  hour: { mode: "every" },
  dayOfMonth: { mode: "every" },
  month: { mode: "every" },
  weekdays: [],
};

function requireInteger(value: number, minimum: number, maximum: number, code: CronBuilderErrorCode): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new CronBuilderError(code);
  }
  return value;
}

function valueField(field: CronValueField, minimum: number, maximum: number, code: CronBuilderErrorCode): string {
  return field.mode === "every" ? "*" : String(requireInteger(field.value, minimum, maximum, code));
}

export function normalizeWeekdays(values: number[]): number[] {
  const normalized = Array.from(new Set(values)).sort((left, right) => left - right);
  normalized.forEach((value) => requireInteger(value, 0, 6, "weekday"));
  return normalized;
}

export function buildCronExpression(state: CronBuilderState): string {
  const minute = state.minute.mode === "every"
    ? "*"
    : state.minute.mode === "specific"
      ? String(requireInteger(state.minute.value, 0, 59, "minute"))
      : `*/${requireInteger(state.minute.value, 2, 30, "minute")}`;
  const hour = valueField(state.hour, 0, 23, "hour");
  const dayOfMonth = valueField(state.dayOfMonth, 1, 31, "day-of-month");
  const month = valueField(state.month, 1, 12, "month");
  const weekdays = normalizeWeekdays(state.weekdays);

  if (state.dayOfMonth.mode !== "every" && weekdays.length > 0) {
    throw new CronBuilderError("ambiguous-days");
  }

  return [minute, hour, dayOfMonth, month, weekdays.length ? weekdays.join(",") : "*"].join(" ");
}

export function withDayOfMonth(state: CronBuilderState, value: number | null): CronBuilderState {
  return {
    ...state,
    dayOfMonth: value === null ? { mode: "every" } : { mode: "specific", value },
    weekdays: value === null ? [...state.weekdays] : [],
  };
}

export function withWeekdays(state: CronBuilderState, values: number[]): CronBuilderState {
  const weekdays = normalizeWeekdays(values);
  return {
    ...state,
    dayOfMonth: weekdays.length > 0 ? { mode: "every" } : state.dayOfMonth,
    weekdays,
  };
}
