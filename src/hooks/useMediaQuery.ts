import { useSyncExternalStore } from "react";

function getMediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(query);
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mediaQuery = getMediaQueryList(query);
      mediaQuery?.addEventListener("change", notify);
      return () => mediaQuery?.removeEventListener("change", notify);
    },
    () => getMediaQueryList(query)?.matches ?? false,
    () => false
  );
}
