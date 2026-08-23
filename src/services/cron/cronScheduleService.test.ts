import { describe, expect, it, vi } from "vitest";
import { getNextExecutions } from "./cronScheduleService";

describe("getNextExecutions", () => {
  it("returns exactly five native dates using the selected time zone", async () => {
    const expected = [
      "2026-08-24T09:00:00.000Z",
      "2026-08-25T09:00:00.000Z",
      "2026-08-26T09:00:00.000Z",
      "2026-08-27T09:00:00.000Z",
      "2026-08-28T09:00:00.000Z",
    ].map((value) => new Date(value));
    const parse = vi.fn(() => ({
      take: () => expected.map((date) => ({ toDate: () => date })),
    }));

    const result = await getNextExecutions(
      "0 9 * * 1-5",
      {
        currentDate: new Date("2026-08-23T00:00:00.000Z"),
        timeZone: "Asia/Taipei",
      },
      { parse }
    );

    expect(result).toEqual(expected);
    expect(parse).toHaveBeenCalledWith("0 9 * * 1-5", {
      currentDate: new Date("2026-08-23T00:00:00.000Z"),
      tz: "Asia/Taipei",
    });
  });

  it("rejects a blank expression before loading the parser", async () => {
    const parse = vi.fn();

    await expect(
      getNextExecutions(" ", { currentDate: new Date(), timeZone: "UTC" }, { parse })
    ).rejects.toMatchObject({ code: "invalid-expression" });
    expect(parse).not.toHaveBeenCalled();
  });

  it("normalizes parser failures without exposing the dependency message", async () => {
    const parse = () => {
      throw new Error("source-sensitive parser details");
    };

    await expect(
      getNextExecutions("* * * * *", { currentDate: new Date(), timeZone: "UTC" }, { parse })
    ).rejects.toMatchObject({ code: "schedule-failed", message: "schedule-failed" });
  });

  it("skips months that do not contain the requested day", async () => {
    const result = await getNextExecutions("0 9 31 * *", {
      currentDate: new Date("2026-04-01T00:00:00.000Z"),
      timeZone: "UTC",
    });

    expect(result.map((date) => date.toISOString())).toEqual([
      "2026-05-31T09:00:00.000Z",
      "2026-07-31T09:00:00.000Z",
      "2026-08-31T09:00:00.000Z",
      "2026-10-31T09:00:00.000Z",
      "2026-12-31T09:00:00.000Z",
    ]);
  });

  it("keeps future runs ordered across a daylight-saving transition", async () => {
    const result = await getNextExecutions("30 2 * * *", {
      currentDate: new Date("2026-03-07T12:00:00.000Z"),
      timeZone: "America/New_York",
    });

    expect(result.map((date) => date.toISOString())).toEqual([
      "2026-03-08T07:30:00.000Z",
      "2026-03-09T06:30:00.000Z",
      "2026-03-10T06:30:00.000Z",
      "2026-03-11T06:30:00.000Z",
      "2026-03-12T06:30:00.000Z",
    ]);
  });
});
