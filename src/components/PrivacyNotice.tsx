import { useLanguage } from "../context/LanguageContext";

export function PrivacyNotice(): JSX.Element {
  const { t } = useLanguage();

  return (
    <section className="privacy-notice" aria-label={t("privacyNotice.aria")}>
      <h2>{t("privacyNotice.title")}</h2>
      <p>{t("privacyNotice.description")}</p>
      <p>{t("privacyNotice.neverUploaded")}</p>
    </section>
  );
}
