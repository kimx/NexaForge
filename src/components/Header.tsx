import { useLanguage, type Locale } from "../context/LanguageContext";
import { Link } from "react-router-dom";

export function Header(): JSX.Element {
  const { t, locale, setLocale } = useLanguage();

  const switchLocale = (next: Locale) => setLocale(next);

  return (
    <header className="site-header">
      <div className="top-banner">
        <Link to="/" className="top-banner__home">
          {t("sidebar.home")}
        </Link>
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
