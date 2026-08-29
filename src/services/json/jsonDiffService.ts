export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type DiffType = "added" | "removed" | "changed" | "unchanged";

export interface JsonDiffNode {
  path: string;
  type: DiffType;
  oldValue?: JsonValue;
  newValue?: JsonValue;
  children?: JsonDiffNode[];
}

export interface JsonDiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

const MISSING = Symbol("missing");

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return value !== null && !Array.isArray(value) && typeof value === "object";
}

function childPath(parentPath: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${parentPath}.${key}`
    : `${parentPath}[${JSON.stringify(key)}]`;
}

function compareValues(
  oldValue: JsonValue | typeof MISSING,
  newValue: JsonValue | typeof MISSING,
  path: string
): JsonDiffNode {
  if (oldValue === MISSING) {
    return { path, type: "added", newValue: newValue as JsonValue };
  }
  if (newValue === MISSING) {
    return { path, type: "removed", oldValue: oldValue as JsonValue };
  }

  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    const children = Array.from(
      { length: Math.max(oldValue.length, newValue.length) },
      (_, index) =>
        compareValues(
          index < oldValue.length ? oldValue[index] : MISSING,
          index < newValue.length ? newValue[index] : MISSING,
          `${path}[${index}]`
        )
    );
    return { path, type: "unchanged", oldValue, newValue, children };
  }

  if (isObject(oldValue) && isObject(newValue)) {
    const keys = Array.from(new Set([...Object.keys(oldValue), ...Object.keys(newValue)])).sort();
    const children = keys.map((key) =>
      compareValues(
        Object.prototype.hasOwnProperty.call(oldValue, key) ? oldValue[key] : MISSING,
        Object.prototype.hasOwnProperty.call(newValue, key) ? newValue[key] : MISSING,
        childPath(path, key)
      )
    );
    return { path, type: "unchanged", oldValue, newValue, children };
  }

  return Object.is(oldValue, newValue)
    ? { path, type: "unchanged", oldValue, newValue }
    : { path, type: "changed", oldValue, newValue };
}

export function compareJson(left: JsonValue, right: JsonValue): JsonDiffNode {
  return compareValues(left, right, "$");
}

export function summarizeJsonDiff(node: JsonDiffNode): JsonDiffSummary {
  const summary: JsonDiffSummary = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  };

  const visit = (current: JsonDiffNode): void => {
    if (current.children) {
      current.children.forEach(visit);
      return;
    }
    summary[current.type] += 1;
  };

  visit(node);
  return summary;
}

export function hasJsonDifferences(node: JsonDiffNode): boolean {
  const summary = summarizeJsonDiff(node);
  return summary.added + summary.removed + summary.changed > 0;
}
