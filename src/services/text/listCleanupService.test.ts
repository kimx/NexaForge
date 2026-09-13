import { describe, expect, it } from "vitest";
import { DEFAULT_LIST_OPTIONS, runListCleanup, readListTemplates, writeListTemplates, LIST_TEMPLATES_KEY } from "./listCleanupService";
import { cleanText } from "./textWorkflowService";
import { removeDuplicateLines, sortTextLines } from "./textService";

describe("list cleanup", () => {
  it("cleans before deduplicating and sorting, preserving original and step counts", () => {
    const original = " pear \r\n\r\nApple\r\n pear \r\napple";
    const result = runListCleanup(original, DEFAULT_LIST_OPTIONS);
    expect(result.original).toBe(original);
    expect(result.steps.map(({ text, beforeLines, afterLines }) => ({ text, beforeLines, afterLines }))).toEqual([
      { text: "pear\nApple\npear\napple", beforeLines: 5, afterLines: 4 },
      { text: "pear\nApple", beforeLines: 4, afterLines: 2 },
      { text: "Apple\npear", beforeLines: 2, afterLines: 2 },
    ]);
    expect(result.output).toBe("Apple\npear");
  });

  it("supports case-sensitive deduplication, omitted sorting and descending reruns", () => {
    const original = "b\nA\na\nb";
    expect(runListCleanup(original, { ...DEFAULT_LIST_OPTIONS, ignoreCase: false, sort: false }).output).toBe("b\nA\na");
    expect(runListCleanup(original, { ...DEFAULT_LIST_OPTIONS, direction: "desc" }).output).toBe("b\nA");
    expect(runListCleanup(original, { ...DEFAULT_LIST_OPTIONS, sort: false }).steps).toHaveLength(2);
  });

  it("handles empty input and all-blank lists", () => {
    for (const input of ["", " \n\t\n"]) {
      const result = runListCleanup(input, DEFAULT_LIST_OPTIONS);
      expect(result.output).toBe("");
      expect(result.steps.every((step) => step.afterLines === 0)).toBe(true);
    }
  });

  it.each([
    { ...DEFAULT_LIST_OPTIONS },
    { ...DEFAULT_LIST_OPTIONS, removeEmptyLines: false },
    { ...DEFAULT_LIST_OPTIONS, ignoreCase: false, direction: "desc" as const },
    { ...DEFAULT_LIST_OPTIONS, trimLines: false, collapseSpaces: true, sort: false },
  ])("matches the existing manual workflow with the same options: %j", (options) => {
    const original = " b  item\r\na\r\nA\r\nb  item\r\n\r\n";
    const cleaned = cleanText(original, options).text;
    const deduplicated = removeDuplicateLines(cleaned, { ignoreCase: options.ignoreCase });
    const manual = options.sort ? sortTextLines(deduplicated, { ignoreCase: options.ignoreCase, direction: options.direction }) : deduplicated;
    const result = runListCleanup(original, options);
    expect(result.steps[0].text).toBe(cleaned);
    expect(result.steps[1].text).toBe(deduplicated);
    expect(result.output).toBe(manual);
  });

  it("cleans a five-thousand-line list without truncating unique entries", () => {
    const input = Array.from({ length: 5000 }, (_, index) => ` item${index % 2500} `).join("\n");
    const result = runListCleanup(input, DEFAULT_LIST_OPTIONS);
    expect(result.steps.map((step) => step.afterLines)).toEqual([5000, 2500, 2500]);
    expect(result.output.split("\n")[2499]).toBe("item2499");
  });
});

describe("local list templates", () => {
  it("round trips only names, fixed steps and allowed options, never supplied content", () => {
    localStorage.clear();
    const unsafe = { name: "Weekly list", steps: ["clean", "deduplicate", "sort"], options: { ...DEFAULT_LIST_OPTIONS, input: "private input", token: "secret" }, input: "private input", output: "private result" };
    expect(writeListTemplates([unsafe], localStorage)).toBe(true);
    const raw = localStorage.getItem(LIST_TEMPLATES_KEY)!;
    expect(raw).not.toMatch(/private|secret|token|input|output/);
    expect(readListTemplates(localStorage)).toEqual({ templates: [{ name: "Weekly list", steps: ["clean", "deduplicate", "sort"], options: DEFAULT_LIST_OPTIONS }], error: false });
  });

  it("rejects unknown steps and invalid types from stored data", () => {
    localStorage.setItem(LIST_TEMPLATES_KEY, JSON.stringify([
      { name: "Bad", steps: ["upload"], options: {} },
      { name: "Good", steps: ["clean", "deduplicate"], options: { sort: false, ignoreCase: "false", direction: "invalid", trimLines: false } },
    ]));
    const { templates } = readListTemplates(localStorage);
    expect(templates).toHaveLength(1);
    expect(templates[0].options).toEqual({ ...DEFAULT_LIST_OPTIONS, sort: false, trimLines: false });
  });

  it("recovers from corrupt JSON and inaccessible storage", () => {
    localStorage.setItem(LIST_TEMPLATES_KEY, "{broken");
    expect(readListTemplates(localStorage)).toEqual({ templates: [], error: true });
    const blocked = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); } };
    expect(readListTemplates(blocked)).toEqual({ templates: [], error: true });
    expect(writeListTemplates([], blocked)).toBe(false);
  });
});
