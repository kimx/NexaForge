export type TimestampUnit = "auto" | "seconds" | "milliseconds";
export type DateTimeZone = "local" | "utc";

export type UnixTimestampErrorCode =
  | "empty"
  | "invalid"
  | "ambiguous"
  | "out-of-range";

export class UnixTimestampError extends Error {
  readonly code: UnixTimestampErrorCode;

  constructor(code: UnixTimestampErrorCode) {
    super(code);
    this.name = "UnixTimestampError";
    this.code = code;
  }
}

export interface TimestampToDateConversion {
  direction: "timestamp-to-date";
  milliseconds: number;
  unit: Exclude<TimestampUnit, "auto">;
  date: Date;
}

export interface DateToTimestampConversion {
  direction: "date-to-timestamp";
  milliseconds: number;
  seconds: number;
  timeZone: DateTimeZone;
  date: Date;
}

const NUMERIC_TIMESTAMP_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const DATE_INPUT_PATTERN = /^(\d{4,})-(\d{2})-(\d{2})$/;
const TIME_INPUT_PATTERN = /^(?:([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?)$/;

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function parseDateParts(dateInput: string, timeInput: string): [number, number, number, number, number, number] {
  const dateMatch = DATE_INPUT_PATTERN.exec(dateInput.trim());
  const timeMatch = TIME_INPUT_PATTERN.exec(timeInput.trim());
  if (!dateMatch || !timeMatch) {
    throw new UnixTimestampError("invalid");
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? 0);
  const calendarCheck = new Date(0);
  calendarCheck.setUTCFullYear(year, month - 1, day);
  calendarCheck.setUTCHours(0, 0, 0, 0);

  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    throw new UnixTimestampError("invalid");
  }

  return [year, month, day, hour, minute, second];
}

function dateFromParts(
  parts: [number, number, number, number, number, number],
  timeZone: DateTimeZone
): Date {
  const [year, month, day, hour, minute, second] = parts;
  const date = new Date(0);
  if (timeZone === "utc") {
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, second, 0);
  } else {
    date.setFullYear(year, month - 1, day);
    date.setHours(hour, minute, second, 0);
  }
  if (!isValidDate(date)) {
    throw new UnixTimestampError("out-of-range");
  }
  return date;
}

export function detectTimestampUnit(input: string): Exclude<TimestampUnit, "auto"> | null {
  const value = input.trim();
  if (!NUMERIC_TIMESTAMP_PATTERN.test(value)) {
    return null;
  }

  const unsigned = value.replace(/^[+-]/, "");
  const wholeDigits = unsigned.split(".", 1)[0];
  if (wholeDigits.length === 10) {
    return "seconds";
  }
  if (wholeDigits.length === 13) {
    return "milliseconds";
  }
  return null;
}

export function convertUnixTimestamp(
  input: string,
  requestedUnit: TimestampUnit = "auto"
): TimestampToDateConversion {
  const value = input.trim();
  if (!value) {
    throw new UnixTimestampError("empty");
  }
  if (!NUMERIC_TIMESTAMP_PATTERN.test(value)) {
    throw new UnixTimestampError("invalid");
  }

  const unit = requestedUnit === "auto" ? detectTimestampUnit(value) : requestedUnit;
  if (!unit) {
    throw new UnixTimestampError("ambiguous");
  }

  const numericValue = Number(value);
  const milliseconds = numericValue * (unit === "seconds" ? 1000 : 1);
  if (!Number.isFinite(milliseconds)) {
    throw new UnixTimestampError("out-of-range");
  }

  const date = new Date(milliseconds);
  if (!isValidDate(date)) {
    throw new UnixTimestampError("out-of-range");
  }

  return { direction: "timestamp-to-date", milliseconds, unit, date };
}

export function convertDateTimeToTimestamp(
  dateInput: string,
  timeInput: string,
  timeZone: DateTimeZone
): DateToTimestampConversion {
  if (!dateInput.trim() || !timeInput.trim()) {
    throw new UnixTimestampError("empty");
  }

  const date = dateFromParts(parseDateParts(dateInput, timeInput), timeZone);
  const milliseconds = date.getTime();
  return {
    direction: "date-to-timestamp",
    milliseconds,
    seconds: Math.floor(milliseconds / 1000),
    timeZone,
    date,
  };
}

export function formatDateInput(date: Date, timeZone: DateTimeZone = "local"): string {
  const year = timeZone === "utc" ? date.getUTCFullYear() : date.getFullYear();
  const month = (timeZone === "utc" ? date.getUTCMonth() : date.getMonth()) + 1;
  const day = timeZone === "utc" ? date.getUTCDate() : date.getDate();
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatTimeInput(date: Date, timeZone: DateTimeZone = "local"): string {
  const hour = timeZone === "utc" ? date.getUTCHours() : date.getHours();
  const minute = timeZone === "utc" ? date.getUTCMinutes() : date.getMinutes();
  const second = timeZone === "utc" ? date.getUTCSeconds() : date.getSeconds();
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

export function formatDateTime(
  date: Date,
  locale: string,
  timeZone?: string
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function formatRelativeTime(
  timestampMilliseconds: number,
  locale: string,
  referenceMilliseconds = Date.now()
): string {
  const difference = timestampMilliseconds - referenceMilliseconds;
  const units = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["week", 7 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
    ["second", 1000],
  ] as const;
  const [, unitMilliseconds] = units.find(([, value]) => Math.abs(difference) >= value) ?? units[units.length - 1];
  const unit = units.find(([, value]) => value === unitMilliseconds)?.[0] ?? "second";
  const value = Math.round(difference / unitMilliseconds);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
}
