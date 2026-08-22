import { describe, expect, it } from "vitest";
import { runRegex } from "./regexEngine";

describe("runRegex", () => {
  it("returns global matches with numbered and named capture groups", () => {
    const result = runRegex({
      pattern: "(?<word>[A-Za-z]+)-(\\d+)",
      flags: "g",
      text: "alpha-12 beta-34",
      maxMatches: 500,
    });

    expect(result).toEqual({
      matches: [
        {
          value: "alpha-12",
          index: 0,
          groups: ["alpha", "12"],
          namedGroups: { word: "alpha" },
        },
        {
          value: "beta-34",
          index: 9,
          groups: ["beta", "34"],
          namedGroups: { word: "beta" },
        },
      ],
      truncated: false,
    });
  });

  it("represents unmatched optional groups as null", () => {
    const result = runRegex({
      pattern: "(a)?b",
      flags: "g",
      text: "b ab",
      maxMatches: 500,
    });

    expect(result.matches.map((match) => match.groups)).toEqual([[null], ["a"]]);
  });

  it("advances past zero-length global matches", () => {
    const result = runRegex({
      pattern: "(?=a)",
      flags: "g",
      text: "aa",
      maxMatches: 500,
    });

    expect(result.matches.map((match) => match.index)).toEqual([0, 1]);
  });

  it("stops at the requested match limit and reports truncation", () => {
    const result = runRegex({
      pattern: ".",
      flags: "g",
      text: "abcd",
      maxMatches: 2,
    });

    expect(result.matches.map((match) => match.value)).toEqual(["a", "b"]);
    expect(result.truncated).toBe(true);
  });

  it("returns only the first match without the global flag", () => {
    const result = runRegex({
      pattern: "a",
      flags: "",
      text: "aaa",
      maxMatches: 500,
    });

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({ value: "a", index: 0 });
    expect(result.truncated).toBe(false);
  });

  it("rejects invalid patterns", () => {
    expect(() =>
      runRegex({ pattern: "(", flags: "g", text: "x", maxMatches: 500 })
    ).toThrow(SyntaxError);
  });
});
