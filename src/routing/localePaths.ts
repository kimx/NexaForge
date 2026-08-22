import type { Locale } from "../context/LanguageContext";

const ENGLISH_PREFIX = "/en";

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  return pathname.replace(/\/+$/, "") || "/";
}

function splitPathSuffix(path: string): { pathname: string; suffix: string } {
  const suffixIndex = path.search(/[?#]/);
  if (suffixIndex === -1) {
    return { pathname: path || "/", suffix: "" };
  }
  return {
    pathname: path.slice(0, suffixIndex) || "/",
    suffix: path.slice(suffixIndex),
  };
}

export function localeFromPath(pathname: string): Locale {
  return pathname === ENGLISH_PREFIX || pathname.startsWith(`${ENGLISH_PREFIX}/`)
    ? "en"
    : "zh-TW";
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === ENGLISH_PREFIX || pathname === `${ENGLISH_PREFIX}/`) {
    return "/";
  }
  if (pathname.startsWith(`${ENGLISH_PREFIX}/`)) {
    return normalizePathname(pathname.slice(ENGLISH_PREFIX.length));
  }
  return normalizePathname(pathname);
}

export function localizePath(path: string, locale: Locale): string {
  const { pathname, suffix } = splitPathSuffix(path);
  const basePath = stripLocalePrefix(pathname);
  const localizedPath = locale === "en"
    ? basePath === "/" ? ENGLISH_PREFIX : `${ENGLISH_PREFIX}${basePath}`
    : basePath;
  return `${localizedPath}${suffix}`;
}
