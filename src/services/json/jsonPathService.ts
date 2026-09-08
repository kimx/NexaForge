import { JSONPath } from "jsonpath-plus";

export const JSONPATH_AUTO_RUN_LIMIT = 250_000;

export type JsonPathErrorKind = "invalid-json" | "invalid-jsonpath";

export class JsonPathEvaluationError extends Error {
  readonly kind: JsonPathErrorKind;

  constructor(kind: JsonPathErrorKind, message: string) {
    super(message);
    this.name = "JsonPathEvaluationError";
    this.kind = kind;
  }
}

export interface JsonPathEvaluation {
  values: unknown[];
  formatted: string;
}

function validateJsonPathExpression(expression: string): void {
  if (!expression.startsWith("$")) {
    throw new JsonPathEvaluationError(
      "invalid-jsonpath",
      "A JSONPath expression must start with $."
    );
  }

  const closingPairs: Record<string, string> = { "]": "[", ")": "(" };
  const stack: string[] = [];
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (const character of expression) {
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "[" || character === "(") {
      stack.push(character);
    } else if (character === "]" || character === ")") {
      if (stack.pop() !== closingPairs[character]) {
        throw new JsonPathEvaluationError("invalid-jsonpath", "Unbalanced JSONPath delimiters.");
      }
    }
  }

  if (quote || stack.length > 0 || expression.endsWith(".") || expression.endsWith("..")) {
    throw new JsonPathEvaluationError("invalid-jsonpath", "Invalid JSONPath expression.");
  }
}

export function evaluateJsonPath(
  jsonText: string,
  expression: string
): JsonPathEvaluation {
  let json: unknown;

  try {
    json = JSON.parse(jsonText);
  } catch (error) {
    throw new JsonPathEvaluationError(
      "invalid-json",
      error instanceof Error && error.message ? error.message : "Unable to parse JSON."
    );
  }

  const trimmedExpression = expression.trim();
  if (!trimmedExpression) {
    throw new JsonPathEvaluationError("invalid-jsonpath", "Enter a JSONPath expression.");
  }
  validateJsonPathExpression(trimmedExpression);

  try {
    const values = JSONPath({
      path: trimmedExpression,
      json: json as object,
      resultType: "value",
      wrap: true,
      eval: "safe",
    });
    const normalizedValues = Array.isArray(values) ? values : [values];

    return {
      values: normalizedValues,
      formatted: JSON.stringify(normalizedValues, null, 2) ?? "[]",
    };
  } catch (error) {
    throw new JsonPathEvaluationError(
      "invalid-jsonpath",
      error instanceof Error && error.message
        ? error.message
        : "Unable to evaluate this JSONPath expression."
    );
  }
}

export function formatJsonPathInput(jsonText: string): string {
  try {
    return JSON.stringify(JSON.parse(jsonText), null, 2);
  } catch (error) {
    throw new JsonPathEvaluationError(
      "invalid-json",
      error instanceof Error && error.message ? error.message : "Unable to parse JSON."
    );
  }
}
