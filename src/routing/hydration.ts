import { normalizePathname } from "./localePaths";

interface HydrationRootState {
  hasContent: boolean;
  prerenderPath?: string;
  currentPath: string;
}

export function canHydratePrerenderedRoot({
  hasContent,
  prerenderPath,
  currentPath,
}: HydrationRootState): boolean {
  return Boolean(
    hasContent &&
      prerenderPath &&
      normalizePathname(prerenderPath) === normalizePathname(currentPath)
  );
}
