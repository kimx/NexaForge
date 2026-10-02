import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { isAnalyticsEnabled, setAnalyticsEnabled } from "../utils/analytics";

interface PrivacyNoticeProps {
  inline?: boolean;
  contentOnly?: boolean;
}

export function PrivacyNotice({ inline = false, contentOnly = false }: PrivacyNoticeProps): JSX.Element {
  const { t } = useLanguage();
  const [analyticsEnabled, setAnalyticsEnabledState] = useState(isAnalyticsEnabled);

  useEffect(() => {
    const handlePreferenceChange = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail?.enabled === "boolean") {
        setAnalyticsEnabledState(event.detail.enabled);
      }
    };
    window.addEventListener("browser-file-tools:analytics-preference", handlePreferenceChange);
    return () => window.removeEventListener("browser-file-tools:analytics-preference", handlePreferenceChange);
  }, []);

  const analyticsControl = (
    <button
      type="button"
      className="privacy-notice__analytics-control"
      aria-pressed={analyticsEnabled}
      onClick={() => {
        const next = !analyticsEnabled;
        setAnalyticsEnabled(next);
        setAnalyticsEnabledState(next);
      }}
    >
      {analyticsEnabled ? t("analytics.disable") : t("analytics.enable")}
    </button>
  );
  const compactText = contentOnly
    ? t("privacyNotice.content")
    : `${t("privacyNotice.title")}：${t("privacyNotice.description")} ${t("privacyNotice.neverUploaded")}`;

  return (
    inline ? (
      <p className="privacy-notice privacy-notice--inline" aria-label={t("privacyNotice.aria")}>
        {compactText}
        {" "}
        {analyticsControl}
      </p>
    ) : (
      <section className="privacy-notice" aria-label={t("privacyNotice.aria")}>
        <p className="privacy-notice__title">{t("privacyNotice.title")}</p>
        {contentOnly ? <p>{t("privacyNotice.content")}</p> : <><p>{t("privacyNotice.description")}</p><p>{t("privacyNotice.neverUploaded")}</p></>}
        {analyticsControl}
      </section>
    )
  );
}
