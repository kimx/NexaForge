export interface CronScheduleOptions {
  currentDate: Date;
  timeZone: string;
  count?: number;
}

interface CronDateLike {
  toDate(): Date;
}

interface CronExpressionLike {
  take(count: number): Array<CronDateLike | Date>;
}

export interface CronParserDependencies {
  parse(
    expression: string,
    options: { currentDate: Date; tz: string }
  ): CronExpressionLike;
}

export type CronScheduleErrorCode = "invalid-expression" | "schedule-failed";

export class CronScheduleError extends Error {
  readonly code: CronScheduleErrorCode;

  constructor(code: CronScheduleErrorCode, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "CronScheduleError";
    this.code = code;
  }
}

async function loadCronParser(): Promise<CronParserDependencies> {
  const { CronExpressionParser } = await import("cron-parser");
  return { parse: CronExpressionParser.parse } as CronParserDependencies;
}

export async function getNextExecutions(
  expression: string,
  options: CronScheduleOptions,
  dependencies?: CronParserDependencies
): Promise<Date[]> {
  if (!expression.trim()) {
    throw new CronScheduleError("invalid-expression");
  }

  try {
    const parser = dependencies ?? (await loadCronParser());
    const count = options.count ?? 5;
    const interval = parser.parse(expression, {
      currentDate: options.currentDate,
      tz: options.timeZone,
    });
    return interval.take(count).map((value) => value instanceof Date ? value : value.toDate());
  } catch (error) {
    if (error instanceof CronScheduleError) throw error;
    throw new CronScheduleError("schedule-failed", error);
  }
}
