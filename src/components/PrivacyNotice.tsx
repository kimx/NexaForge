import { useLanguage } from "../context/LanguageContext";

interface PrivacyNoticeProps {
  inline?: boolean;
  contentOnly?: boolean;
}

export function PrivacyNotice({ inline = false, contentOnly = false }: PrivacyNoticeProps): JSX.Element {
  const { t } = useLanguage();
  const compactText = contentOnly
    ? t("privacyNotice.content")
    : `${t("privacyNotice.title")}：${t("privacyNotice.description")} ${t("privacyNotice.neverUploaded")}`;

  return (
    inline ? (
      <p className="privacy-notice privacy-notice--inline" aria-label={t("privacyNotice.aria")}>
        {compactText}
      </p>
    ) : (
      <section className="privacy-notice" aria-label={t("privacyNotice.aria")}>
        <p className="privacy-notice__title">{t("privacyNotice.title")}</p>
        {contentOnly ? <p>{t("privacyNotice.content")}</p> : <><p>{t("privacyNotice.description")}</p><p>{t("privacyNotice.neverUploaded")}</p></>}
      </section>
    )
  );
}
