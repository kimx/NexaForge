export interface LocalTimeConversion {
  input: string;
  localTime: string;
  timeZone: string;
}

export type LocalTimeErrorCode = "empty" | "invalid";

export class LocalTimeError extends Error {
  readonly code: LocalTimeErrorCode;

  constructor(code: LocalTimeErrorCode) {
    super(code === "empty" ? "A date and time is required." : "Enter a valid ISO 8601 date and time with a timezone offset.");
    this.name = "LocalTimeError";
    this.code = code;
  }
}

const ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseIsoDateTime(input: string): Date {
  const match = ISO_DATE_TIME_PATTERN.exec(input);
  if (!match) {
    throw new LocalTimeError("invalid");
  }

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    fractionText,
    offsetText,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const fractionMilliseconds = fractionText
    ? Number(fractionText.slice(0, 3).padEnd(3, "0"))
    : 0;

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new LocalTimeError("invalid");
  }

  const date = new Date(Date.UTC(2000, month - 1, day, hour, minute, second, fractionMilliseconds));
  date.setUTCFullYear(year);

  if (Number.isNaN(date.getTime())) {
    throw new LocalTimeError("invalid");
  }

  if (offsetText === "Z") {
    return date;
  }

  const offsetMatch = /^([+-])(\d{2}):?(\d{2})$/.exec(offsetText);
  if (!offsetMatch) {
    throw new LocalTimeError("invalid");
  }
  const offsetHours = Number(offsetMatch[2]);
  const offsetMinutes = Number(offsetMatch[3]);
  if (offsetHours > 23 || offsetMinutes > 59) {
    throw new LocalTimeError("invalid");
  }

  const totalOffsetMinutes = (offsetHours * 60 + offsetMinutes) *
    (offsetMatch[1] === "+" ? 1 : -1);
  return new Date(date.getTime() - totalOffsetMinutes * 60 * 1000);
}

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatLocalDateTime(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ");
}

export function convertLocalTime(input: string): LocalTimeConversion {
  if (!input.trim()) {
    throw new LocalTimeError("empty");
  }

  const date = parseIsoDateTime(input.trim());
  return {
    input,
    localTime: formatLocalDateTime(date),
    timeZone: getBrowserTimeZone(),
  };
}
