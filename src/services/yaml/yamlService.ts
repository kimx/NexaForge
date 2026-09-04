export class YamlParseError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(message);
    this.name = "YamlParseError";
    this.line = line;
    this.column = column;
  }
}

interface YamlLine {
  indent: number;
  text: string;
  line: number;
}

function yamlError(message: string, sourceLine: YamlLine, column = sourceLine.indent + 1): YamlParseError {
  return new YamlParseError(message, sourceLine.line, column);
}

function stripComment(line: string): string {
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (character === quote && line[index - 1] !== "\\") quote = null;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "#" && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index).trimEnd();
    }
  }
  return line;
}

function findSeparator(text: string): number {
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === quote && text[index - 1] !== "\\") quote = null;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === ":") {
      return index;
    }
  }
  return -1;
}

function parseFlowValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    const normalized = value
      .replace(/([{,]\s*)'([^']*)'/g, '$1"$2"')
      .replace(/'([^']*)'/g, '"$1"');
    return JSON.parse(normalized);
  }
}

function parseScalar(value: string, sourceLine: YamlLine): unknown {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try {
      return parseFlowValue(trimmed);
    } catch {
      throw yamlError(`Invalid YAML value: ${trimmed}`, sourceLine, sourceLine.text.indexOf(trimmed) + 1);
    }
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw yamlError(`Invalid quoted value: ${trimmed}`, sourceLine, sourceLine.text.indexOf(trimmed) + 1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (/^(?:null|~)$/i.test(trimmed)) return null;
  if (/^(?:true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(trimmed)) {
    const number = Number(trimmed);
    if (Number.isFinite(number)) return number;
  }
  return trimmed;
}

function parseKey(value: string, sourceLine: YamlLine): string {
  const key = value.trim();
  if (!key) throw yamlError("YAML object keys cannot be empty.", sourceLine);
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    return String(parseScalar(key, sourceLine));
  }
  return key;
}

function sourceLines(source: string): YamlLine[] {
  const result: YamlLine[] = [];
  source.split(/\r?\n/).forEach((rawLine, index) => {
    const withoutComment = stripComment(rawLine);
    if (!withoutComment.trim()) return;
    if (withoutComment.includes("\t")) {
      throw new YamlParseError("Tabs are not supported for YAML indentation.", index + 1, withoutComment.indexOf("\t") + 1);
    }
    const indent = withoutComment.length - withoutComment.trimStart().length;
    result.push({ indent, text: withoutComment.trim(), line: index + 1 });
  });
  return result;
}

function parseBlock(lines: YamlLine[], start: number, indent: number): [unknown, number] {
  const first = lines[start];
  if (!first || first.indent !== indent) {
    throw first ? yamlError("Unexpected YAML indentation.", first) : new YamlParseError("Unexpected end of YAML.", 1, 1);
  }

  const isArray = first.text === "-" || first.text.startsWith("- ");
  const result: unknown[] | Record<string, unknown> = isArray ? [] : {};
  let index = start;

  while (index < lines.length && lines[index].indent === indent) {
    const current = lines[index];
    if (isArray) {
      if (!(current.text === "-" || current.text.startsWith("- "))) break;
      const content = current.text.slice(1).trim();
      if (!content) {
        if (lines[index + 1]?.indent > indent) {
          const [child, nextIndex] = parseBlock(lines, index + 1, lines[index + 1].indent);
          (result as unknown[]).push(child);
          index = nextIndex;
        } else {
          (result as unknown[]).push(null);
          index += 1;
        }
        continue;
      }

      const separator = findSeparator(content);
      if (separator > 0 && !content.startsWith("[") && !content.startsWith("{")) {
        const object: Record<string, unknown> = {};
        const key = parseKey(content.slice(0, separator), current);
        const value = content.slice(separator + 1).trim();
        if (value) {
          object[key] = parseScalar(value, current);
          index += 1;
        } else if (lines[index + 1]?.indent > indent) {
          const [child, nextIndex] = parseBlock(lines, index + 1, lines[index + 1].indent);
          object[key] = child;
          index = nextIndex;
        } else {
          object[key] = null;
          index += 1;
        }

        while (index < lines.length && lines[index].indent > indent) {
          const childLine = lines[index];
          const childIndent = childLine.indent;
          const childSeparator = findSeparator(childLine.text);
          if (childSeparator < 1) throw yamlError(`Invalid YAML line: ${childLine.text}`, childLine);
          if (childIndent !== lines[index - 1].indent && childIndent < indent + 1) {
            throw yamlError("Unexpected YAML indentation.", childLine);
          }
          const childKey = parseKey(childLine.text.slice(0, childSeparator), childLine);
          const childValue = childLine.text.slice(childSeparator + 1).trim();
          if (childValue) {
            object[childKey] = parseScalar(childValue, childLine);
            index += 1;
          } else if (lines[index + 1]?.indent > childIndent) {
            const [child, nextIndex] = parseBlock(lines, index + 1, lines[index + 1].indent);
            object[childKey] = child;
            index = nextIndex;
          } else {
            object[childKey] = null;
            index += 1;
          }
        }
        (result as unknown[]).push(object);
      } else {
        (result as unknown[]).push(parseScalar(content, current));
        index += 1;
      }
    } else {
      const separator = findSeparator(current.text);
      if (separator < 1) throw yamlError(`Invalid YAML line: ${current.text}`, current);
      const key = parseKey(current.text.slice(0, separator), current);
      const content = current.text.slice(separator + 1).trim();
      if (content === "|" || content === ">") {
        throw yamlError(`Block scalar "${content}" is not supported.`, current, separator + 1);
      }
      if (content) {
        (result as Record<string, unknown>)[key] = parseScalar(content, current);
        index += 1;
      } else if (lines[index + 1]?.indent > indent) {
        const [child, nextIndex] = parseBlock(lines, index + 1, lines[index + 1].indent);
        (result as Record<string, unknown>)[key] = child;
        index = nextIndex;
      } else {
        (result as Record<string, unknown>)[key] = null;
        index += 1;
      }
    }
  }

  return [result, index];
}

export function yamlToJson(source: string): unknown {
  const lines = sourceLines(source);
  if (!lines.length) return null;
  const [result, nextIndex] = parseBlock(lines, 0, lines[0].indent);
  if (nextIndex < lines.length) {
    throw yamlError("Unexpected YAML indentation.", lines[nextIndex]);
  }
  return result;
}

function yamlKey(key: string): string {
  return /^[A-Za-z_][\w-]*$/.test(key) ? key : JSON.stringify(key);
}

function yamlScalar(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "null";
  return String(value);
}

export function jsonToYaml(value: unknown, indent = 0): string {
  const padding = " ".repeat(indent);
  if (Array.isArray(value)) {
    return value.length === 0
      ? `${padding}[]`
      : value.map((item) => {
          if (item && typeof item === "object") {
            return `${padding}-\n${jsonToYaml(item, indent + 2)}`;
          }
          return `${padding}- ${yamlScalar(item)}`;
        }).join("\n");
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return `${padding}{}`;
    return entries.map(([key, child]) => {
      if (child && typeof child === "object") {
        return `${padding}${yamlKey(key)}:\n${jsonToYaml(child, indent + 2)}`;
      }
      return `${padding}${yamlKey(key)}: ${yamlScalar(child)}`;
    }).join("\n");
  }
  return `${padding}${yamlScalar(value)}`;
}
