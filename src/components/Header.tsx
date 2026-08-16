import { Link } from "react-router-dom";
import { useLanguage, type Locale } from "../context/LanguageContext";

export function Header(): JSX.Element {
  const { t, locale, setLocale } = useLanguage();

  const switchLocale = (next: Locale) => {
    if (locale === next) {
      return;
    }
    setLocale(next);
  };

  return (
    <header className="site-header">
      <div className="top-banner">
        <div className="top-banner__copy">
          <span className="top-banner__eyebrow">NEXAFORGE / WORKSPACE</span>
          <p>
            <strong>{t("top.banner")}</strong> {t("top.banner.cta")}
          </p>
        </div>
        <div className="language-switch" role="group" aria-label={t("top.languageSwitcherLabel")}>
          <button
            type="button"
            className={`language-switch__btn ${locale === "zh-TW" ? "is-active" : ""}`}
            onClick={() => switchLocale("zh-TW")}
            disabled={locale === "zh-TW"}
            aria-pressed={locale === "zh-TW"}
          >
            {t("lang.zh")}
          </button>
          <button
            type="button"
            className={`language-switch__btn ${locale === "en" ? "is-active" : ""}`}
            onClick={() => switchLocale("en")}
            disabled={locale === "en"}
            aria-pressed={locale === "en"}
          >
            {t("lang.en")}
          </button>
        </div>
      </div>
      <div className="header-main">
        <Link className="brand" to="/" aria-label={t("header.title")}>
          <img className="brand__mark" src="/nexaforge-mark.png" alt="" />
          <span className="brand__wordmark">{t("header.title")}</span>
        </Link>
        <div className="header-copy">
          <span className="header-copy__label">LOCAL FILE OPS</span>
          <p>{t("header.subtitle")}</p>
        </div>
      </div>
    </header>
  );
}
