import { FILE_TOOLS, TOOL_RELATIONSHIPS } from "../data/tools";
import type { ToolDefinition } from "../types/tool";

export function getRelatedTools(toolId: string, limit = 4): ToolDefinition[] {
  const current = FILE_TOOLS.find((item) => item.id === toolId);
  if (!current) {
    return FILE_TOOLS.slice(0, limit);
  }

  const configuredIds = TOOL_RELATIONSHIPS[toolId] ?? [];
  const configured = configuredIds
    .map((id) => FILE_TOOLS.find((item) => item.id === id))
    .filter((item): item is ToolDefinition => Boolean(item));
  if (configured.length > 0) {
    return configured.slice(0, limit);
  }

  return FILE_TOOLS
    .filter((item) => item.id !== toolId && item.category === current.category)
    .slice(0, limit);
}
