import { Link } from "react-router-dom";
import { useLanguage, useLocalizedToolMeta } from "../../context/LanguageContext";
import { useSeo } from "../../hooks/useSeo";
import type { ToolMeta } from "../../types/tool";
import { JSON_TOOLS } from "../../utils/toolPaths";
import { localizePath } from "../../routing/localePaths";

export function JsonHubPage(): JSX.Element {
  const { t, locale } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const title = t("jsonHub.title");
  const description = t("jsonHub.description");
  const meta: ToolMeta = {
    title: `${title} - ${t("header.title")}`,
    description,
    canonical: "/json",
    h1: title,
  };
  useSeo(meta);

  return (
    <div className="json-hub">
      <header className="json-hub__hero">
        <span className="json-hub__eyebrow">{t("jsonHub.eyebrow")}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="json-hub__trust" role="note">
          <strong>{t("jsonHub.localTitle")}</strong>
          <span>{t("jsonHub.localDescription")}</span>
        </div>
      </header>

      <section className="json-hub__tasks" aria-labelledby="json-hub-task-title">
        <div className="json-hub__section-heading">
          <span>{t("jsonHub.taskEyebrow")}</span>
          <h2 id="json-hub-task-title">{t("jsonHub.taskTitle")}</h2>
        </div>
        <div className="json-hub__grid">
          {JSON_TOOLS.map((tool, index) => (
            <Link className="json-hub__card" to={localizePath(tool.path, locale)} key={tool.id}>
              <span className="json-hub__card-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{localToolMeta(tool.id, "title")}</h3>
                <p>{localToolMeta(tool.id, "description")}</p>
              </div>
              <span className="json-hub__card-action">
                {t("jsonHub.open")}
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
