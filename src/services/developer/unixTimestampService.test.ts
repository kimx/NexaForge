import {
  convertDateTimeToTimestamp,
  convertUnixTimestamp,
  detectTimestampUnit,
  formatRelativeTime,
} from "./unixTimestampService";

describe("unix timestamp service", () => {
  it("detects ten-digit seconds and thirteen-digit milliseconds", () => {
    expect(detectTimestampUnit("1700000000")).toBe("seconds");
    expect(detectTimestampUnit("1700000000000")).toBe("milliseconds");
    expect(detectTimestampUnit("0")).toBeNull();
  });

  it("converts seconds and milliseconds to the same instant", () => {
    const seconds = convertUnixTimestamp("1700000000");
    const milliseconds = convertUnixTimestamp("1700000000000");

    expect(seconds.milliseconds).toBe(1700000000000);
    expect(milliseconds.milliseconds).toBe(1700000000000);
    expect(seconds.date.toISOString()).toBe("2023-11-14T22:13:20.000Z");
    expect(milliseconds.date.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("requires a manual unit for an ambiguous timestamp", () => {
    expect(() => convertUnixTimestamp("0")).toThrow("ambiguous");
    expect(convertUnixTimestamp("0", "seconds").date.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("converts UTC dates before 1970 to negative timestamps", () => {
    const result = convertDateTimeToTimestamp("1969-12-31", "23:59:59", "utc");

    expect(result.seconds).toBe(-1);
    expect(result.milliseconds).toBe(-1000);
  });

  it("formats relative time using the supplied browser reference time", () => {
    expect(formatRelativeTime(1700000000000 + 90_000, "en-US", 1700000000000)).toBe("in 2 minutes");
    expect(formatRelativeTime(1700000000000 - 3_600_000, "en-US", 1700000000000)).toBe("1 hour ago");
  });
});
