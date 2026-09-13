import { FILE_TOOLS } from "../data/tools";
import type { TextCleanerOptions } from "./text/textWorkflowService";

export const PERSONALIZATION_KEYS = {
  recent: "nexaforge-recent-tools",
  pinned: "nexaforge-pinned-tools",
  preferences: "nexaforge-tool-preferences-v1",
} as const;
export const PERSONALIZATION_EVENT = "nexaforge:personalization";
export const DEFAULT_CLEANER_OPTIONS = {
  trimLines: false,
  removeLeadingWhitespace: false,
  removeTrailingWhitespace: false,
  collapseSpaces: false,
  removeEmptyLines: false,
  collapseEmptyLines: false,
  tabsToSpaces: false,
  normalizeLineEndings: true,
  trimDocument: false,
} satisfies TextCleanerOptions;
export type CleanerPreferences = { [K in keyof typeof DEFAULT_CLEANER_OPTIONS]: boolean };
export interface CompressPreferences { format: "jpeg" | "png" | "webp"; quality: number }
export interface ToolPreferences {
  version: 1;
  compress: CompressPreferences;
  cleaner: CleanerPreferences;
}
export interface Personalization {
  recent: string[];
  pinned: string[];
  preferences: ToolPreferences;
}
export function defaultPreferences(): ToolPreferences {
  return { version: 1, compress: { format: "jpeg", quality: 80 }, cleaner: { ...DEFAULT_CLEANER_OPTIONS } };
}
export function defaultPersonalization(): Personalization {
  return { recent: [], pinned: [], preferences: defaultPreferences() };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function validToolIds(value: unknown, limit = FILE_TOOLS.length): string[] {
  if (!Array.isArray(value)) return [];
  const registered = new Set(FILE_TOOLS.map((tool) => tool.id));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && registered.has(id)))].slice(0, limit);
}
// Explicit allowlists keep document content, filenames and future settings out of storage.
export function sanitizePreferences(value: unknown): ToolPreferences {
  const input = record(value);
  const defaults = defaultPreferences();
  if (input.version !== 1) return defaults;
  const compress = record(input.compress);
  if (compress.format === "jpeg" || compress.format === "png" || compress.format === "webp") defaults.compress.format = compress.format;
  if (typeof compress.quality === "number" && Number.isInteger(compress.quality) && compress.quality >= 1 && compress.quality <= 100) defaults.compress.quality = compress.quality;
  const cleaner = record(input.cleaner);
  for (const key of Object.keys(defaults.cleaner) as Array<keyof CleanerPreferences>) {
    if (typeof cleaner[key] === "boolean") defaults.cleaner[key] = cleaner[key] as boolean;
  }
  return defaults;
}
function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch { return null; }
}
export function readPersonalization(): Personalization {
  return {
    recent: validToolIds(read(PERSONALIZATION_KEYS.recent), 4),
    pinned: validToolIds(read(PERSONALIZATION_KEYS.pinned)),
    preferences: sanitizePreferences(read(PERSONALIZATION_KEYS.preferences)),
  };
}
function publish<K extends keyof Personalization>(key: K, value: Personalization[K], remove = false): void {
  if (typeof window === "undefined") return;
  try {
    if (remove) window.localStorage.removeItem(PERSONALIZATION_KEYS[key]);
    else window.localStorage.setItem(PERSONALIZATION_KEYS[key], JSON.stringify(value));
  } catch { /* Keep current controls usable when storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent(PERSONALIZATION_EVENT, { detail: { key, value } }));
}
export function rememberTool(toolId: string): void {
  if (!validToolIds([toolId]).length) return;
  publish("recent", validToolIds([toolId, ...readPersonalization().recent], 4));
}
export function savePinnedTools(ids: string[]): void { publish("pinned", validToolIds(ids)); }
export function saveToolPreferences(preferences: ToolPreferences): void { publish("preferences", sanitizePreferences(preferences)); }
export function clearRecentTools(): void { publish("recent", [], true); }
export function clearPinnedTools(): void { publish("pinned", [], true); }
export function clearToolPreferences(): void { publish("preferences", defaultPreferences(), true); }
export function clearPersonalization(): void {
  clearRecentTools();
  clearPinnedTools();
  clearToolPreferences();
}
