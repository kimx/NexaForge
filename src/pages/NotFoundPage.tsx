import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useSeo } from "../hooks/useSeo";
import { localizePath, stripLocalePrefix } from "../routing/localePaths";
import type { ToolMeta } from "../types/tool";

export function NotFoundPage(): JSX.Element {
  const { pathname } = useLocation();
  const { t, locale } = useLanguage();
  const title = t("notFound.title");
  const description = t("notFound.description");
  const meta: ToolMeta = {
    title: `${title} | NexaForge`,
    description,
    canonical: stripLocalePrefix(pathname),
    h1: title,
    noIndex: true,
  };
  useSeo(meta);

  return (
    <section className="not-found-page">
      <span aria-hidden="true">404</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link className="btn" to={localizePath("/", locale)}>
        {t("notFound.returnHome")}
      </Link>
    </section>
  );
}
