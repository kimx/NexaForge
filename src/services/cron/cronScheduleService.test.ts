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
});
