export interface TextCleanerOptions {
  trimLines?: boolean;
  removeLeadingWhitespace?: boolean;
  removeTrailingWhitespace?: boolean;
  collapseSpaces?: boolean;
  removeEmptyLines?: boolean;
  collapseEmptyLines?: boolean;
  tabsToSpaces?: boolean;
  tabSize?: number;
  normalizeLineEndings?: boolean;
  trimDocument?: boolean;
}

export interface TextTransformResult {
  text: string;
  beforeLines: number;
  afterLines: number;
}

export interface FindReplaceOptions {
  find: string;
  replace: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  flags?: string;
}

export interface FindReplaceResult {
  text: string;
  matches: number;
  replacements: number;
  error: string | null;
}

export interface TextDiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

export type TextDiffLineType = "unchanged" | "added" | "removed";

export interface TextDiffLine {
  type: TextDiffLineType;
  text: string;
  originalLine: number | null;
  changedLine: number | null;
}

export interface TextDiffResult {
  lines: TextDiffLine[];
  additions: number;
  removals: number;
  identical: boolean;
}

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n?/g, "\n");
}

function textLines(input: string): string[] {
  const normalized = normalizeLineEndings(input);
  return normalized === "" ? [] : normalized.split("\n");
}

function countLines(input: string): number {
  return textLines(input).length;
}

export function cleanText(input: string, options: TextCleanerOptions): TextTransformResult {
  const beforeLines = countLines(input);
  const tabReplacement = " ".repeat(Math.max(1, options.tabSize ?? 2));
  let lines = textLines(input).map((line) => {
    let next = options.tabsToSpaces ? line.replace(/\t/g, tabReplacement) : line;

    if (options.trimLines) {
      next = next.trim();
    } else {
      if (options.removeLeadingWhitespace) next = next.replace(/^\s+/, "");
      if (options.removeTrailingWhitespace) next = next.replace(/\s+$/, "");
    }

    return options.collapseSpaces ? next.replace(/ {2,}/g, " ") : next;
  });

  if (options.removeEmptyLines) {
    lines = lines.filter((line) => line.trim() !== "");
  } else if (options.collapseEmptyLines) {
    let previousWasEmpty = false;
    lines = lines.filter((line) => {
      const empty = line.trim() === "";
      const keep = !empty || !previousWasEmpty;
      previousWasEmpty = empty;
      return keep;
    });
  }

  let text = lines.join("\n");
  if (options.trimDocument) text = text.trim();

  return { text, beforeLines, afterLines: countLines(text) };
}

function escapeLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createMatcher(options: FindReplaceOptions): RegExp {
  let flags = options.flags ?? "";
  if (!options.caseSensitive && !flags.includes("i")) flags += "i";
  if (!flags.includes("g")) flags += "g";
  const uniqueFlags = [...new Set(flags)].join("");
  const source = options.useRegex ? options.find : escapeLiteral(options.find);
  const pattern = options.wholeWord ? `\\b(?:${source})\\b` : source;
  return new RegExp(pattern, uniqueFlags);
}

export function findAndReplace(input: string, options: FindReplaceOptions): FindReplaceResult {
  if (!options.find) {
    return { text: input, matches: 0, replacements: 0, error: "Enter text to find before replacing." };
  }

  try {
    const matcher = createMatcher(options);
    const matches = [...input.matchAll(matcher)].length;
    const text = input.replace(matcher, options.replace);
    return { text, matches, replacements: matches, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid pattern.";
    return { text: input, matches: 0, replacements: 0, error: `Invalid regular expression: ${message}` };
  }
}

function diffKey(line: string, options: TextDiffOptions): string {
  let key = line;
  if (options.ignoreWhitespace) key = key.replace(/\s+/g, " ").trim();
  if (options.ignoreCase) key = key.toLocaleLowerCase();
  return key;
}

export function compareText(original: string, changed: string, options: TextDiffOptions): TextDiffResult {
  const left = textLines(original);
  const right = textLines(changed);
  const matrix = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      matrix[leftIndex][rightIndex] = diffKey(left[leftIndex], options) === diffKey(right[rightIndex], options)
        ? matrix[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(matrix[leftIndex + 1][rightIndex], matrix[leftIndex][rightIndex + 1]);
    }
  }

  const lines: TextDiffLine[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (diffKey(left[leftIndex], options) === diffKey(right[rightIndex], options)) {
      lines.push({ type: "unchanged", text: left[leftIndex], originalLine: leftIndex + 1, changedLine: rightIndex + 1 });
      leftIndex += 1;
      rightIndex += 1;
    } else if (matrix[leftIndex + 1][rightIndex] >= matrix[leftIndex][rightIndex + 1]) {
      lines.push({ type: "removed", text: left[leftIndex], originalLine: leftIndex + 1, changedLine: null });
      leftIndex += 1;
    } else {
      lines.push({ type: "added", text: right[rightIndex], originalLine: null, changedLine: rightIndex + 1 });
      rightIndex += 1;
    }
  }

  while (leftIndex < left.length) {
    lines.push({ type: "removed", text: left[leftIndex], originalLine: leftIndex + 1, changedLine: null });
    leftIndex += 1;
  }
  while (rightIndex < right.length) {
    lines.push({ type: "added", text: right[rightIndex], originalLine: null, changedLine: rightIndex + 1 });
    rightIndex += 1;
  }

  const additions = lines.filter((line) => line.type === "added").length;
  const removals = lines.filter((line) => line.type === "removed").length;
  return { lines, additions, removals, identical: additions === 0 && removals === 0 };
}
