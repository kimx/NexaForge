import {
  cleanText,
  compareText,
  findAndReplace,
} from "./textWorkflowService";

describe("text workflow service", () => {
  it("combines text cleaning options deterministically", () => {
    const result = cleanText("  apple  \r\n\r\n\tbanana   ", {
      trimLines: true,
      removeEmptyLines: true,
      tabsToSpaces: true,
    });

    expect(result.text).toBe("apple\nbanana");
    expect(result.beforeLines).toBe(3);
    expect(result.afterLines).toBe(2);
  });

  it("replaces whole words and reports match counts", () => {
    const result = findAndReplace("Cat cat catalog", {
      find: "cat",
      replace: "dog",
      caseSensitive: false,
      wholeWord: true,
    });

    expect(result).toMatchObject({ text: "dog dog catalog", matches: 2, replacements: 2, error: null });
  });

  it("returns a useful error for an invalid regular expression", () => {
    const result = findAndReplace("value", {
      find: "(",
      replace: "",
      useRegex: true,
    });

    expect(result.error).toMatch(/Invalid regular expression/);
  });

  it("aligns an inserted line while preserving unchanged context", () => {
    const result = compareText("apple\norange", "apple\nbanana\norange", {});

    expect(result.lines.map(({ type, text }) => [type, text])).toEqual([
      ["unchanged", "apple"],
      ["added", "banana"],
      ["unchanged", "orange"],
    ]);
    expect(result.additions).toBe(1);
    expect(result.removals).toBe(0);
  });

  it("ignores whitespace and letter case when requested", () => {
    const result = compareText("Apple  pie", " apple pie ", {
      ignoreCase: true,
      ignoreWhitespace: true,
    });

    expect(result).toMatchObject({ additions: 0, removals: 0, identical: true });
  });
});
