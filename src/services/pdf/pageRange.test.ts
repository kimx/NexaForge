import { assertValidPageRanges, parsePageRanges } from "./pageRange";

describe("parsePageRanges", () => {
  it("parses single and range expressions", () => {
    expect(parsePageRanges("1")).toEqual([0]);
    expect(parsePageRanges("1-3")).toEqual([0, 1, 2]);
    expect(parsePageRanges("1,3,5")).toEqual([0, 2, 4]);
    expect(parsePageRanges("1-3,5,8-10")).toEqual([0, 1, 2, 4, 7, 8, 9]);
  });

  it("throws on invalid ranges", () => {
    expect(() => parsePageRanges("abc")).toThrow();
    expect(() => parsePageRanges("0")).toThrow();
    expect(() => parsePageRanges("3-1")).toThrow();
    expect(() => parsePageRanges("1,,3")).toThrow();
    expect(() => parsePageRanges("1-2-3")).toThrow();
  });

  it("validates against total pages", () => {
    expect(() => assertValidPageRanges([0, 2], 2)).toThrow();
    expect(() => assertValidPageRanges([1], 2)).not.toThrow();
  });
});
