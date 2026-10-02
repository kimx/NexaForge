import { describe, expect, it } from "vitest";
import {
  convertLocalTime,
  formatLocalDateTime,
  LocalTimeError,
} from "./localTimeService";

describe("localTimeService", () => {
  it("parses fractional ISO input and preserves the original value", () => {
    const input = "2026-09-08T15:51:28.2433646+00:00";
    const result = convertLocalTime(input);

    expect(result.input).toBe(input);
    expect(result.localTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(result.timeZone).toBeTruthy();
  });

  it("applies a non-UTC offset before formatting local time", () => {
    const result = convertLocalTime("2026-09-08T15:51:28-04:00");

    expect(result.localTime).toBe(formatLocalDateTime(new Date("2026-09-08T19:51:28.000Z")));
  });

  it("rejects timestamps without a timezone or with an invalid calendar date", () => {
    expect(() => convertLocalTime("2026-09-08T15:51:28")).toThrow(LocalTimeError);
    expect(() => convertLocalTime("2026-02-29T15:51:28Z")).toThrow(LocalTimeError);
  });

  it("rejects empty input and invalid offsets", () => {
    expect(() => convertLocalTime("   ")).toThrowError("A date and time is required.");
    expect(() => convertLocalTime("2026-09-08T15:51:28+25:00")).toThrow(LocalTimeError);
  });
});
