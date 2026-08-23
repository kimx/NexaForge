import { describe, expect, it } from "vitest";
import {
  DEFAULT_CRON_STATE,
  buildCronExpression,
  withDayOfMonth,
  withWeekdays,
} from "./cronBuilder";

describe("buildCronExpression", () => {
  it("builds a five-field expression from structured selections", () => {
    expect(
      buildCronExpression({
        minute: { mode: "interval", value: 15 },
        hour: { mode: "specific", value: 9 },
        dayOfMonth: { mode: "every" },
        month: { mode: "specific", value: 8 },
        weekdays: [5, 1, 3, 3],
      })
    ).toBe("*/15 9 * 8 1,3,5");
  });

  it("uses wildcards for the default every-time schedule", () => {
    expect(buildCronExpression(DEFAULT_CRON_STATE)).toBe("* * * * *");
  });

  it.each([
    [{ ...DEFAULT_CRON_STATE, minute: { mode: "specific" as const, value: 60 } }, "minute"],
    [{ ...DEFAULT_CRON_STATE, minute: { mode: "interval" as const, value: 1 } }, "minute"],
    [{ ...DEFAULT_CRON_STATE, hour: { mode: "specific" as const, value: 24 } }, "hour"],
    [{ ...DEFAULT_CRON_STATE, dayOfMonth: { mode: "specific" as const, value: 0 } }, "day-of-month"],
    [{ ...DEFAULT_CRON_STATE, month: { mode: "specific" as const, value: 13 } }, "month"],
    [{ ...DEFAULT_CRON_STATE, weekdays: [7] }, "weekday"],
  ])("rejects values outside supported ranges", (state, code) => {
    expect(() => buildCronExpression(state)).toThrow(expect.objectContaining({ code }));
  });

  it("rejects simultaneous day-of-month and weekday restrictions", () => {
    expect(() =>
      buildCronExpression({
        ...DEFAULT_CRON_STATE,
        dayOfMonth: { mode: "specific", value: 12 },
        weekdays: [1],
      })
    ).toThrow(expect.objectContaining({ code: "ambiguous-days" }));
  });
});

describe("Cron day restriction transitions", () => {
  it("resets weekdays when a specific day of month is chosen", () => {
    const next = withDayOfMonth({ ...DEFAULT_CRON_STATE, weekdays: [1, 3] }, 12);

    expect(next.dayOfMonth).toEqual({ mode: "specific", value: 12 });
    expect(next.weekdays).toEqual([]);
  });

  it("resets day of month when weekdays are chosen", () => {
    const next = withWeekdays(
      { ...DEFAULT_CRON_STATE, dayOfMonth: { mode: "specific", value: 12 } },
      [5, 1, 5]
    );

    expect(next.dayOfMonth).toEqual({ mode: "every" });
    expect(next.weekdays).toEqual([1, 5]);
  });
});
