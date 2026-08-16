import { useLanguage } from "../context/LanguageContext";

export function Footer(): JSX.Element {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <p>{t("footer.text", { year: new Date().getFullYear() })}</p>
    </footer>
  );
}
