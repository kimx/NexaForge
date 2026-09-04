import { dump, JSON_SCHEMA, load, YAMLException } from "js-yaml";

export type YamlJsonDirection = "json-to-yaml" | "yaml-to-json";

export class YamlJsonParseError extends Error {
  readonly format: "JSON" | "YAML";
  readonly line: number | null;
  readonly column: number | null;

  constructor(
    format: "JSON" | "YAML",
    message: string,
    line: number | null = null,
    column: number | null = null
  ) {
    super(message);
    this.name = "YamlJsonParseError";
    this.format = format;
    this.line = line;
    this.column = column;
  }
}

function locationFromOffset(source: string, offset: number): { line: number; column: number } {
  const beforeError = source.slice(0, offset);
  const lines = beforeError.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function getJsonErrorLocation(source: string, message: string): { line: number; column: number } {
  const position = message.match(/position\s+(\d+)/i);
  if (position) {
    return locationFromOffset(source, Number(position[1]));
  }

  const lineAndColumn = message.match(/line\s+(\d+).*column\s+(\d+)/i);
  if (lineAndColumn) {
    return { line: Number(lineAndColumn[1]), column: Number(lineAndColumn[2]) };
  }

  const unexpectedToken = message.match(/Unexpected token ['"](.+?)['"]/i);
  if (unexpectedToken?.[1]) {
    const offset = source.lastIndexOf(unexpectedToken[1]);
    if (offset >= 0) {
      return locationFromOffset(source, offset);
    }
  }

  return locationFromOffset(source, source.length);
}

function getYamlErrorLocation(cause: unknown): { line: number | null; column: number | null } {
  if (cause instanceof YAMLException && cause.mark) {
    return {
      line: cause.mark.line + 1,
      column: cause.mark.column + 1,
    };
  }

  return { line: null, column: null };
}

function toSerializableJson(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  return value;
}

export function parseJson(source: string): unknown {
  try {
    return JSON.parse(source) as unknown;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const location = getJsonErrorLocation(source, message);
    throw new YamlJsonParseError("JSON", message, location.line, location.column);
  }
}

export function parseYaml(source: string): unknown {
  try {
    return toSerializableJson(load(source, { schema: JSON_SCHEMA }));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const location = getYamlErrorLocation(cause);
    throw new YamlJsonParseError("YAML", message, location.line, location.column);
  }
}

export function jsonToYaml(source: string): string {
  return `${dump(parseJson(source), { noRefs: false, lineWidth: -1 })}`.trimEnd();
}

export function yamlToJson(source: string): string {
  return JSON.stringify(parseYaml(source), null, 2);
}

export function convertYamlJson(source: string, direction: YamlJsonDirection): string {
  return direction === "json-to-yaml" ? jsonToYaml(source) : yamlToJson(source);
}

export function formatYamlJsonError(cause: unknown): string {
  if (cause instanceof YamlJsonParseError) {
    const location = cause.line
      ? ` Line ${cause.line}${cause.column ? `, column ${cause.column}` : ""}.`
      : "";
    return `${cause.format} syntax error: ${cause.message}${location}`;
  }

  return cause instanceof Error ? cause.message : String(cause);
}
