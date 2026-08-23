import type { RefObject } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage, type Locale } from "../context/LanguageContext";
import { localizePath } from "../routing/localePaths";

interface HeaderProps {
  showBrand?: boolean;
  showToolsButton?: boolean;
  toolsOpen?: boolean;
  onOpenTools?: () => void;
  toolsButtonRef?: RefObject<HTMLButtonElement>;
}

export function Header({
  showBrand = false,
  showToolsButton = false,
  toolsOpen = false,
  onOpenTools,
  toolsButtonRef,
}: HeaderProps): JSX.Element {
  const { t, locale, setLocale } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const switchLocale = (next: Locale) => {
    if (next === locale) {
      return;
    }
    setLocale(next);
    navigate(
      localizePath(`${location.pathname}${location.search}${location.hash}`, next)
    );
  };

  return (
    <header className="site-header">
      <div className="top-banner">
        {showBrand ? (
          <Link
            to={localizePath("/", locale)}
            className="top-banner__brand"
            aria-label="NexaForge Utility File Workspace"
          >
            <img
              className="top-banner__brand-logo"
              src="/nexaforge-logo.png"
              alt="NexaForge"
              width="168"
              height="45"
            />
          </Link>
        ) : null}
        {showToolsButton ? (
          <button
            ref={toolsButtonRef}
            type="button"
            className="header-tools-button"
            aria-label={t("header.openTools")}
            aria-controls="tool-sidebar"
            aria-expanded={toolsOpen}
            onClick={onOpenTools}
          >
            <span aria-hidden="true">☰</span>
            <span>{t("header.tools")}</span>
          </button>
        ) : null}
        <a
          href="https://github.com/kimx/NexaForge"
          className="top-banner__github"
          aria-label="GitHub repository"
          title="GitHub"
          target="_blank"
          rel="noreferrer"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 0C5.37 0 0 5.37 0 12a12 12 0 0 0 8.207 11.437c.6.11.793-.26.793-.577v-2.243c-3.338.725-4.043-1.61-4.043-1.61-.546-1.385-1.334-1.754-1.334-1.754-1.09-.744.083-.73.083-.73 1.204.086 1.838 1.237 1.838 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.775.418-1.305.762-1.604-2.665-.304-5.467-1.333-5.467-5.935 0-1.311.47-2.383 1.236-3.225-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.552 3.296-1.23 3.296-1.23.654 1.652.243 2.873.12 3.176.77.842 1.233 1.914 1.233 3.225 0 4.614-2.807 5.628-5.48 5.924.43.37.814 1.1.814 2.214v3.293c0 .32.192.694.8.576A12.01 12.01 0 0 0 24 12C24 5.37 18.63 0 12 0Z"
            />
          </svg>
        </a>
        <div className="language-switch" role="group" aria-label={t("top.languageSwitcherLabel")}>
          <button
            type="button"
            className={`language-switch__btn ${locale === "zh-TW" ? "is-active" : ""}`}
            onClick={() => switchLocale("zh-TW")}
            aria-pressed={locale === "zh-TW"}
          >
            {t("lang.zh")}
          </button>
          <button
            type="button"
            className={`language-switch__btn ${locale === "en" ? "is-active" : ""}`}
            onClick={() => switchLocale("en")}
            aria-pressed={locale === "en"}
          >
            {t("lang.en")}
          </button>
        </div>
      </div>
    </header>
  );
}
