import { Link, useLocation } from "react-router-dom";
import { useLanguage, useLocalizedToolMeta } from "../context/LanguageContext";
import { JSON_TOOLS } from "../utils/toolPaths";
import { localizePath, stripLocalePrefix } from "../routing/localePaths";

export function JsonWorkspaceNav(): JSX.Element | null {
  const { pathname } = useLocation();
  const { t, locale } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const strippedPath = stripLocalePrefix(pathname);
  const activePath = strippedPath.length > 1 ? strippedPath.replace(/\/$/, "") : strippedPath;

  if (!JSON_TOOLS.some((tool) => tool.path === activePath)) {
    return null;
  }

  return (
    <nav className="json-workspace-nav" aria-label={t("jsonWorkspace.aria")}>
      <div className="json-workspace-nav__heading">
        <span>{t("jsonWorkspace.kicker")}</span>
      </div>
      <ul>
        {JSON_TOOLS.map((tool) => {
          const isCurrent = tool.path === activePath;
          return (
            <li key={tool.id}>
              <Link
                to={localizePath(tool.path, locale)}
                className={isCurrent ? "json-workspace-nav__link json-workspace-nav__link--current" : "json-workspace-nav__link"}
                aria-current={isCurrent ? "page" : undefined}
              >
                {localToolMeta(tool.id, "title")}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
