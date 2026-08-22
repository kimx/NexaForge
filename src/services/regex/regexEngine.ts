export interface RegexRunRequest {
  pattern: string;
  flags: string;
  text: string;
  maxMatches?: number;
}

export interface RegexMatchResult {
  value: string;
  index: number;
  groups: Array<string | null>;
  namedGroups: Record<string, string | null>;
}

export interface RegexRunResult {
  matches: RegexMatchResult[];
  truncated: boolean;
}

export function runRegex({
  pattern,
  flags,
  text,
  maxMatches = 500,
}: RegexRunRequest): RegexRunResult {
  const expression = new RegExp(pattern, flags);
  const matches: RegexMatchResult[] = [];
  let truncated = false;

  while (true) {
    const match = expression.exec(text);
    if (!match) {
      break;
    }

    if (matches.length === maxMatches) {
      truncated = true;
      break;
    }

    matches.push({
      value: match[0],
      index: match.index,
      groups: match.slice(1).map((value) => value ?? null),
      namedGroups: Object.fromEntries(
        Object.entries(match.groups ?? {}).map(([name, value]) => [name, value ?? null])
      ),
    });

    if (!expression.global) {
      break;
    }

    if (match[0] === "") {
      expression.lastIndex += 1;
    }
  }

  return { matches, truncated };
}
