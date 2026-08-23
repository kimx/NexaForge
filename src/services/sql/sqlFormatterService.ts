export type SqlDialect = "transactsql" | "postgresql" | "mysql";
export type SqlKeywordCase = "preserve" | "upper" | "lower";
export type SqlIndent = 2 | 4 | "tab";
export type SqlOutputMode = "format" | "minify";

export interface SqlFormatOptions {
  dialect: SqlDialect;
  keywordCase: SqlKeywordCase;
  indent: SqlIndent;
  mode: SqlOutputMode;
}

interface SqlFormatterOptions {
  language: SqlDialect;
  keywordCase: SqlKeywordCase;
  tabWidth: number;
  useTabs: boolean;
}

export interface SqlFormatterDependencies {
  format(source: string, options: SqlFormatterOptions): string;
}

export type SqlFormatErrorCode = "empty-input" | "format-failed";

export class SqlFormatError extends Error {
  readonly code: SqlFormatErrorCode;

  constructor(code: SqlFormatErrorCode, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "SqlFormatError";
    this.code = code;
  }
}

function dollarQuoteAt(source: string, index: number): string | null {
  const match = source.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
  return match?.[0] ?? null;
}

export function compactSql(source: string, dialect: SqlDialect = "transactsql"): string {
  type State = "normal" | "single" | "double" | "backtick" | "bracket" | "line-comment" | "block-comment" | "dollar";

  const output: string[] = [];
  let state: State = "normal";
  let dollarDelimiter = "";
  let pendingSpace = false;

  const flushSpace = (): void => {
    if (
      pendingSpace &&
      output.length > 0 &&
      !/[\s]/.test(output[output.length - 1].slice(-1))
    ) {
      output.push(" ");
    }
    pendingSpace = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (state === "normal") {
      if (/\s/.test(character)) {
        pendingSpace = output.length > 0;
        continue;
      }

      if (character === "-" && next === "-") {
        flushSpace();
        output.push("--");
        index += 1;
        state = "line-comment";
        continue;
      }

      if (dialect === "mysql" && character === "#") {
        flushSpace();
        output.push(character);
        state = "line-comment";
        continue;
      }

      if (character === "/" && next === "*") {
        flushSpace();
        output.push("/*");
        index += 1;
        state = "block-comment";
        continue;
      }

      const delimiter = character === "$" ? dollarQuoteAt(source, index) : null;
      if (delimiter) {
        flushSpace();
        output.push(delimiter);
        index += delimiter.length - 1;
        dollarDelimiter = delimiter;
        state = "dollar";
        continue;
      }

      flushSpace();
      output.push(character);
      if (character === "'") state = "single";
      else if (character === '"') state = "double";
      else if (character === "`") state = "backtick";
      else if (character === "[") state = "bracket";
      continue;
    }

    if (state === "line-comment") {
      if (character === "\r" || character === "\n") {
        if (character === "\r" && next === "\n") index += 1;
        output.push("\n");
        state = "normal";
        pendingSpace = false;
      } else {
        output.push(character);
      }
      continue;
    }

    if (state === "block-comment") {
      output.push(character);
      if (character === "*" && next === "/") {
        output.push("/");
        index += 1;
        state = "normal";
      }
      continue;
    }

    if (state === "dollar") {
      if (source.startsWith(dollarDelimiter, index)) {
        output.push(dollarDelimiter);
        index += dollarDelimiter.length - 1;
        dollarDelimiter = "";
        state = "normal";
      } else {
        output.push(character);
      }
      continue;
    }

    output.push(character);

    if (state === "bracket") {
      if (character === "]" && next === "]") {
        output.push(next);
        index += 1;
      } else if (character === "]") {
        state = "normal";
      }
      continue;
    }

    const quote = state === "single" ? "'" : state === "double" ? '"' : "`";
    if (character === "\\" && next !== undefined) {
      output.push(next);
      index += 1;
    } else if (character === quote && next === quote) {
      output.push(next);
      index += 1;
    } else if (character === quote) {
      state = "normal";
    }
  }

  return output.join("");
}

async function loadSqlFormatter(): Promise<SqlFormatterDependencies> {
  const { format } = await import("sql-formatter");
  return { format } as SqlFormatterDependencies;
}

export async function formatSql(
  source: string,
  options: SqlFormatOptions,
  dependencies?: SqlFormatterDependencies
): Promise<string> {
  if (!source.trim()) {
    throw new SqlFormatError("empty-input");
  }

  try {
    const formatter = dependencies ?? (await loadSqlFormatter());
    const formatted = formatter.format(source, {
      language: options.dialect,
      keywordCase: options.keywordCase,
      tabWidth: options.indent === "tab" ? 2 : options.indent,
      useTabs: options.indent === "tab",
    });
    return options.mode === "minify" ? compactSql(formatted, options.dialect) : formatted;
  } catch (error) {
    if (error instanceof SqlFormatError) throw error;
    throw new SqlFormatError("format-failed", error);
  }
}
