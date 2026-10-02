import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

type Theme = "system" | "light" | "dark";
const STORAGE_KEY = "nexaforge-theme";

export function ThemeSelect(): JSX.Element {
  const { t } = useLanguage();
  // Keep the first render identical to prerendered HTML.
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // The control remains usable when browser storage is unavailable.
    }
    const initial = saved === "light" || saved === "dark" ? saved : "system";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Keep the selection for this page even if it cannot be persisted.
    }
  };

  const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const labels = { system: t("header.themeSystem"), light: t("header.themeLight"), dark: t("header.themeDark") };
  const label = t("header.themeSwitch", { current: labels[theme], next: labels[next] });

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => changeTheme(next)}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {theme === "system" ? (
          <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>
        ) : theme === "light" ? (
          <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
        ) : (
          <path d="M20.5 13.3A8.5 8.5 0 0 1 10.7 3.5a8.5 8.5 0 1 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  );
}
