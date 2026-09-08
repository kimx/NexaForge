import { FILE_TOOLS } from "../data/tools";
import type { ToolDefinition } from "../types/tool";

export const JSON_TOOL_IDS = [
  "json-formatter",
  "jsonpath-tester",
  "json-diff",
  "json-yaml",
  "json-to-csv",
  "csv-to-json",
] as const;

const jsonToolIdSet = new Set<string>(JSON_TOOL_IDS);

export const JSON_TOOLS: ToolDefinition[] = JSON_TOOL_IDS.map((toolId) =>
  FILE_TOOLS.find((tool) => tool.id === toolId)
).filter((tool): tool is ToolDefinition => Boolean(tool));

export function isJsonTool(toolId: string): boolean {
  return jsonToolIdSet.has(toolId);
}
