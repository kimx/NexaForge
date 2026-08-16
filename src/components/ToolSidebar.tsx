import { ChangeEvent, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { FILE_TOOLS } from "../data/tools";
import type { ToolDefinition } from "../types/tool";
import { localizedCategoryLabel, useLanguage, useLocalizedToolMeta } from "../context/LanguageContext";

const categoryOrder: ToolDefinition["category"][] = [
  "Image",
  "PDF",
  "Data",
  "Text",
  "Developer",
];

const groupedTools = categoryOrder.reduce(
  (acc, category) => {
    acc[category] = FILE_TOOLS.filter((tool) => tool.category === category);
    return acc;
  },
  {} as Record<ToolDefinition["category"], ToolDefinition[]>
);

export function ToolSidebar(): JSX.Element {
  const { t } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const [keyword, setKeyword] = useState("");

  const keywordNormalized = keyword.trim().toLowerCase();

  const filteredTools = useMemo(() => {
    if (!keywordNormalized) {
      return FILE_TOOLS;
    }

    return FILE_TOOLS.filter(
      (tool) =>
        tool.title.toLowerCase().includes(keywordNormalized) ||
        tool.description.toLowerCase().includes(keywordNormalized) ||
        tool.category.toLowerCase().includes(keywordNormalized) ||
        localToolMeta(tool.id, "title").toLowerCase().includes(keywordNormalized) ||
        localToolMeta(tool.id, "description").toLowerCase().includes(keywordNormalized)
    );
  }, [keywordNormalized, localToolMeta]);

  const groupedFilteredTools = useMemo(() => {
    return categoryOrder.reduce(
      (acc, category) => {
        const tools = filteredTools.filter((tool) => tool.category === category);
        if (tools.length > 0) {
          acc.push({ category, tools });
        }
        return acc;
      },
      [] as Array<{ category: ToolDefinition["category"]; tools: ToolDefinition[] }>
    );
  }, [filteredTools]);

  const handleKeywordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setKeyword(event.target.value);
  };

  return (
    <aside className="tool-sidebar" aria-label={t("sidebar.aria")}>
      <header className="tool-sidebar__brand">
        <NavLink to="/" className="tool-sidebar__home-link">
          {t("header.title")}
        </NavLink>
        <p className="tool-sidebar__sub">{t("header.subtitle")}</p>
      </header>

      <div className="tool-sidebar__search-wrap">
        <label htmlFor="tool-search" className="tool-sidebar__search-label">
          {t("sidebar.searchLabel")}
        </label>
        <input
          id="tool-search"
          value={keyword}
          onChange={handleKeywordChange}
          placeholder={t("sidebar.searchPlaceholder")}
          className="tool-sidebar__search-input"
        />
      </div>

      <nav className="tool-sidebar__nav">
        <NavLink to="/" className={({ isActive }) => `tool-sidebar__link ${isActive ? "is-active" : ""}`}>
          {t("sidebar.home")}
        </NavLink>
      </nav>

      <p className="tool-sidebar__meta">
        {keywordNormalized ? t("sidebar.resultCount", { count: filteredTools.length }) : t("sidebar.sectionTitle")}
      </p>

      {!keywordNormalized && categoryOrder.map((category) => (
        <section className="tool-sidebar__section" key={category}>
            <h2>
            {localizedCategoryLabel(category, t)}
            <span className="tool-sidebar__count">{(groupedTools[category] ?? []).length}</span>
          </h2>
          <ul className="tool-sidebar__list">
            {groupedTools[category].map((tool) => (
              <li key={tool.id}>
                <NavLink
                  to={tool.path}
                  className={({ isActive }) => `tool-sidebar__link ${isActive ? "is-active" : ""}`}
                >
                  {localToolMeta(tool.id, "title")}
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {keywordNormalized &&
        groupedFilteredTools.map(({ category, tools }) => (
          <section className="tool-sidebar__section" key={category}>
              <h2>
              {localizedCategoryLabel(category, t)}
                <span className="tool-sidebar__count">{tools.length}</span>
              </h2>
              <ul className="tool-sidebar__list">
                {tools.map((tool) => (
                  <li key={tool.id}>
                    <NavLink
                      to={tool.path}
                      className={({ isActive }) => `tool-sidebar__link ${isActive ? "is-active" : ""}`}
                    >
                      {localToolMeta(tool.id, "title")}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
        ))}

      {keywordNormalized && filteredTools.length === 0 && (
        <p className="tool-sidebar__empty">{t("sidebar.empty")}</p>
      )}
    </aside>
  );
}
