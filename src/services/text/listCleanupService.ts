import { cleanText } from "./textWorkflowService";
import { countTextStats, removeDuplicateLines, sortTextLines, type SortDirection } from "./textService";

export interface ListCleanupOptions {
  trimLines: boolean;
  removeEmptyLines: boolean;
  collapseSpaces: boolean;
  ignoreCase: boolean;
  sort: boolean;
  direction: SortDirection;
}

export const DEFAULT_LIST_OPTIONS: ListCleanupOptions = {
  trimLines: true, removeEmptyLines: true, collapseSpaces: false,
  ignoreCase: true, sort: true, direction: "asc",
};
export type ListStep = "clean" | "deduplicate" | "sort";
export interface ListTemplate { name: string; steps: ListStep[]; options: ListCleanupOptions }
export interface ListCleanupResult {
  original: string;
  output: string;
  steps: Array<{ step: ListStep; text: string; beforeLines: number; afterLines: number }>;
}

export function runListCleanup(original: string, options: ListCleanupOptions): ListCleanupResult {
  const cleaned = cleanText(original, { trimLines: options.trimLines, removeEmptyLines: options.removeEmptyLines, collapseSpaces: options.collapseSpaces });
  const steps: ListCleanupResult["steps"] = [{ step: "clean", ...cleaned }];
  let output = removeDuplicateLines(cleaned.text, { ignoreCase: options.ignoreCase });
  steps.push({ step: "deduplicate", text: output, beforeLines: cleaned.afterLines, afterLines: countTextStats(output).lines });
  if (options.sort) {
    const beforeLines = countTextStats(output).lines;
    output = sortTextLines(output, { ignoreCase: options.ignoreCase, direction: options.direction });
    steps.push({ step: "sort", text: output, beforeLines, afterLines: countTextStats(output).lines });
  }
  return { original, output, steps };
}

export const LIST_TEMPLATES_KEY = "nexaforge-list-templates-v1";
type TemplateStorage = Pick<Storage, "getItem" | "setItem">;

function sanitizeTemplate(value: unknown): ListTemplate | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== "string" || !candidate.name.trim() || candidate.name.length > 80) return null;
  if (!Array.isArray(candidate.steps) || !["clean,deduplicate", "clean,deduplicate,sort"].includes(candidate.steps.join(","))) return null;
  const raw = candidate.options && typeof candidate.options === "object" ? candidate.options as Record<string, unknown> : {};
  const options = { ...DEFAULT_LIST_OPTIONS };
  for (const key of ["trimLines", "removeEmptyLines", "collapseSpaces", "ignoreCase"] as const) {
    if (typeof raw[key] === "boolean") options[key] = raw[key];
  }
  options.sort = candidate.steps.length === 3;
  options.direction = raw.direction === "desc" ? "desc" : "asc";
  return { name: candidate.name.trim(), steps: options.sort ? ["clean", "deduplicate", "sort"] : ["clean", "deduplicate"], options };
}

export function readListTemplates(storage?: TemplateStorage): { templates: ListTemplate[]; error: boolean } {
  if (!storage && typeof window === "undefined") return { templates: [], error: false };
  try {
    const raw = (storage ?? window.localStorage).getItem(LIST_TEMPLATES_KEY);
    if (!raw) return { templates: [], error: false };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { templates: [], error: true };
    const names = new Set<string>();
    const templates = parsed.map(sanitizeTemplate).filter((item): item is ListTemplate => {
      if (!item || names.has(item.name)) return false;
      names.add(item.name);
      return true;
    }).slice(0, 30);
    return { templates, error: templates.length !== parsed.length };
  } catch { return { templates: [], error: true }; }
}

export function writeListTemplates(values: unknown[], storage?: TemplateStorage): boolean {
  try {
    const templates = values.map(sanitizeTemplate).filter((item): item is ListTemplate => item !== null).slice(0, 30);
    (storage ?? window.localStorage).setItem(LIST_TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  } catch { return false; }
}
