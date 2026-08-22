import { FILE_TOOLS } from "../data/tools";
import { localizePath } from "./localePaths";

export const BASE_INDEXABLE_ROUTES = Array.from(
  new Set(["/", "/json", ...FILE_TOOLS.map((tool) => tool.path)])
).sort((left, right) => {
  if (left === "/") return -1;
  if (right === "/") return 1;
  return left.localeCompare(right);
});

export const INDEXABLE_ROUTES = [
  ...BASE_INDEXABLE_ROUTES,
  ...BASE_INDEXABLE_ROUTES.map((path) => localizePath(path, "en")),
] as const;

export function isIndexableBaseRoute(path: string): boolean {
  return BASE_INDEXABLE_ROUTES.includes(path);
}
