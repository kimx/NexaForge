export interface JsonPathMatch {
  path: string;
  value: unknown;
}

export class JsonPathParseError extends Error {
  readonly column: number;

  constructor(message: string, column: number) {
    super(message);
    this.name = "JsonPathParseError";
    this.column = column;
  }
}

type JsonPathToken =
  | { kind: "child"; key: string }
  | { kind: "recursive"; key: string | "*" }
  | { kind: "wildcard" }
  | { kind: "index"; index: number }
  | { kind: "slice"; start: number | null; end: number | null }
  | { kind: "union"; values: Array<string | number> };

function pathForKey(path: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseQuotedKey(source: string, start: number): { value: string; next: number } {
  const quote = source[start];
  let index = start + 1;
  let value = "";
  while (index < source.length) {
    if (source[index] === "\\") {
      value += source[index + 1] ?? "";
      index += 2;
    } else if (source[index] === quote) {
      return { value, next: index + 1 };
    } else {
      value += source[index];
      index += 1;
    }
  }
  throw new JsonPathParseError("Unterminated quoted property name.", start + 1);
}

function parseBracket(source: string, start: number): { token: JsonPathToken; next: number } {
  const close = source.indexOf("]", start + 1);
  if (close === -1) throw new JsonPathParseError("Missing closing bracket.", start + 1);
  const content = source.slice(start + 1, close).trim();
  if (!content) throw new JsonPathParseError("Empty brackets are not valid JSONPath.", start + 2);
  if (content === "*") return { token: { kind: "wildcard" }, next: close + 1 };

  if (content.includes(":")) {
    const parts = content.split(":");
    if (parts.length !== 2 || parts.some((part) => part.trim() && !/^-?\d+$/.test(part.trim()))) {
      throw new JsonPathParseError("Slices must use [start:end] with integer bounds.", start + 2);
    }
    return {
      token: {
        kind: "slice",
        start: parts[0].trim() ? Number(parts[0]) : null,
        end: parts[1].trim() ? Number(parts[1]) : null,
      },
      next: close + 1,
    };
  }

  const parts = content.split(",").map((part) => part.trim());
  const values = parts.map((part) => {
    if (/^-?\d+$/.test(part)) return Number(part);
    if ((part.startsWith("'") && part.endsWith("'")) || (part.startsWith('"') && part.endsWith('"'))) {
      return part.slice(1, -1);
    }
    throw new JsonPathParseError("Bracket selectors must be indexes or quoted property names.", start + 2);
  });
  if (values.length === 1) {
    return typeof values[0] === "number"
      ? { token: { kind: "index", index: values[0] }, next: close + 1 }
      : { token: { kind: "child", key: values[0] }, next: close + 1 };
  }
  return { token: { kind: "union", values }, next: close + 1 };
}

function parseTokens(expression: string): JsonPathToken[] {
  const source = expression.trim();
  if (!source.startsWith("$")) throw new JsonPathParseError("JSONPath must start with $.", 1);
  const tokens: JsonPathToken[] = [];
  let index = 1;

  while (index < source.length) {
    if (source[index] === "[") {
      const bracket = parseBracket(source, index);
      tokens.push(bracket.token);
      index = bracket.next;
      continue;
    }
    if (source[index] !== ".") {
      throw new JsonPathParseError(`Unexpected character "${source[index]}".`, index + 1);
    }

    const recursive = source[index + 1] === ".";
    index += recursive ? 2 : 1;
    if (source[index] === "*") {
      tokens.push(recursive ? { kind: "recursive", key: "*" } : { kind: "wildcard" });
      index += 1;
      continue;
    }
    if (source[index] === "[") {
      const bracket = parseBracket(source, index);
      tokens.push(recursive ? { kind: "recursive", key: bracket.token.kind === "child" ? bracket.token.key : "*" } : bracket.token);
      index = bracket.next;
      continue;
    }

    const match = /^[A-Za-z_$][\w$-]*/.exec(source.slice(index));
    if (!match) throw new JsonPathParseError("Expected a property name after '.'.", index + 1);
    tokens.push(recursive ? { kind: "recursive", key: match[0] } : { kind: "child", key: match[0] });
    index += match[0].length;
  }

  return tokens;
}

function entries(value: unknown): Array<[string | number, unknown]> {
  if (Array.isArray(value)) return value.map((child, index) => [index, child]);
  if (isObject(value)) return Object.entries(value);
  return [];
}

function descend(value: unknown, path: string, key: string | "*", output: JsonPathMatch[]): void {
  for (const [childKey, childValue] of entries(value)) {
    const childPath = typeof childKey === "number" ? `${path}[${childKey}]` : pathForKey(path, childKey);
    if (key === "*" || String(childKey) === key) output.push({ path: childPath, value: childValue });
    descend(childValue, childPath, key, output);
  }
}

function applyToken(nodes: JsonPathMatch[], token: JsonPathToken): JsonPathMatch[] {
  const next: JsonPathMatch[] = [];
  for (const node of nodes) {
    if (token.kind === "recursive") {
      descend(node.value, node.path, token.key, next);
      continue;
    }
    if (token.kind === "wildcard") {
      for (const [key, value] of entries(node.value)) {
        next.push({ path: typeof key === "number" ? `${node.path}[${key}]` : pathForKey(node.path, key), value });
      }
      continue;
    }
    if (token.kind === "child") {
      if (isObject(node.value) && token.key in node.value) {
        next.push({ path: pathForKey(node.path, token.key), value: node.value[token.key] });
      }
      continue;
    }
    if (token.kind === "index") {
      if (Array.isArray(node.value) && token.index >= 0 && token.index < node.value.length) {
        next.push({ path: `${node.path}[${token.index}]`, value: node.value[token.index] });
      }
      continue;
    }
    if (token.kind === "slice") {
      if (Array.isArray(node.value)) {
        const start = token.start === null ? 0 : Math.max(0, token.start);
        const end = token.end === null ? node.value.length : Math.min(node.value.length, token.end);
        for (let index = start; index < end; index += 1) {
          next.push({ path: `${node.path}[${index}]`, value: node.value[index] });
        }
      }
      continue;
    }
    for (const value of token.values) {
      if (typeof value === "number" && Array.isArray(node.value) && value >= 0 && value < node.value.length) {
        next.push({ path: `${node.path}[${value}]`, value: node.value[value] });
      } else if (typeof value === "string" && isObject(node.value) && value in node.value) {
        next.push({ path: pathForKey(node.path, value), value: node.value[value] });
      }
    }
  }
  return next;
}

export function queryJsonPath(document: unknown, expression: string): JsonPathMatch[] {
  if (!expression.trim()) throw new JsonPathParseError("Enter a JSONPath expression.", 1);
  return parseTokens(expression).reduce(applyToken, [{ path: "$", value: document }]);
}

export function serializeJsonPathMatches(matches: JsonPathMatch[]): string {
  return JSON.stringify(matches, null, 2);
}
