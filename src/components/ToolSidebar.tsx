import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FILE_TOOLS } from "../data/tools";
import type { ToolDefinition } from "../types/tool";
import { localizedCategoryLabel, useLanguage, useLocalizedToolMeta } from "../context/LanguageContext";

const categoryOrder: ToolDefinition["category"][] = [
  "Data",
  "Developer",
  "Image",
  "PDF",
  "Text",
];

const CATEGORY_ICONS: Record<ToolDefinition["category"], string> = {
  Image: "▧",
  PDF: "▤",
  Data: "▤",
  Text: "▤",
  Developer: "</>",
};

function getToolIcon(toolId: string): string {
  if (toolId === "home") {
    return "⌂";
  }

  if (toolId.startsWith("image-")) {
    return "◈";
  }

  if (toolId.startsWith("pdf-")) {
    return "▭";
  }

  if (toolId.startsWith("json") || toolId.startsWith("csv")) {
    return "◊";
  }

  if (toolId === "base64" || toolId === "hash" || toolId === "uuid" || toolId === "text-diff" || toolId === "markdown-previewer" || toolId === "word-counter" || toolId === "case-converter" || toolId === "remove-duplicate-lines" || toolId === "sort-lines") {
    return "✎";
  }

  if (toolId.startsWith("jwt-") || toolId === "qr-code") {
    return "⚙";
  }

  return "•";
}

export function ToolSidebar(): JSX.Element {
  const { t } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const { pathname } = useLocation();
  const activeCategory = FILE_TOOLS.find((tool) => tool.path === pathname)?.category;
  const [keyword, setKeyword] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<ToolDefinition["category"]>>(
    () => new Set(activeCategory ? [activeCategory] : [])
  );

  useEffect(() => {
    if (!activeCategory) {
      return;
    }

    setExpandedCategories((current) => {
      if (current.has(activeCategory)) {
        return current;
      }

      const next = new Set(current);
      next.add(activeCategory);
      return next;
    });
  }, [activeCategory]);

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

  const toggleCategory = (category: ToolDefinition["category"]) => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <aside className="tool-sidebar" aria-label={t("sidebar.aria")}>
      <div className="tool-sidebar__content">
        <Link to="/" className="tool-sidebar__brand">
          <span className="tool-sidebar__brand-mark" aria-hidden="true">
            NF
          </span>
          <span className="tool-sidebar__brand-copy">
            <strong>NexaForge</strong>
            <small>Utility File Workspace</small>
          </span>
        </Link>

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

        <nav className="tool-sidebar__nav" aria-label={t("sidebar.navigation")}>
          <NavLink to="/" className={({ isActive }) => `tool-sidebar__link ${isActive ? "is-active" : ""}`}>
            <span className="tool-sidebar__icon" aria-hidden="true">
              {getToolIcon("home")}
            </span>
            <span className="tool-sidebar__label">{t("sidebar.home")}</span>
          </NavLink>
        </nav>

        {!keywordNormalized && (
          <div className="tool-sidebar__categories">
            <p className="tool-sidebar__section-title">{t("sidebar.categories")}</p>
            {categoryOrder.map((category) => (
              <div className="tool-sidebar__category" key={category}>
                <button
                  type="button"
                  className="tool-sidebar__link tool-sidebar__category-toggle"
                  aria-expanded={expandedCategories.has(category)}
                  aria-controls={`tool-sidebar-category-${category}`}
                  onClick={() => toggleCategory(category)}
                >
                  <span className="tool-sidebar__icon" aria-hidden="true">{CATEGORY_ICONS[category]}</span>
                  <span className="tool-sidebar__label">{localizedCategoryLabel(category, t)} {t("sidebar.toolsSuffix")}</span>
                  <span className="tool-sidebar__category-chevron" aria-hidden="true">
                    {expandedCategories.has(category) ? "⌃" : "⌄"}
                  </span>
                </button>
                {expandedCategories.has(category) && (
                  <ul className="tool-sidebar__list tool-sidebar__nested-list" id={`tool-sidebar-category-${category}`}>
                    {FILE_TOOLS.filter((tool) => tool.category === category).map((tool) => (
                      <li key={tool.id}>
                        <NavLink
                          to={tool.path}
                          title={localToolMeta(tool.id, "title")}
                          className={({ isActive }) => `tool-sidebar__link ${isActive ? "is-active" : ""}`}
                        >
                          <span className="tool-sidebar__icon" aria-hidden="true">{getToolIcon(tool.id)}</span>
                          <span className="tool-sidebar__label">{localToolMeta(tool.id, "title")}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {keywordNormalized &&
          groupedFilteredTools.map(({ category, tools }) => (
            <section className="tool-sidebar__section" key={category}>
              <h2 className="tool-sidebar__section-title">
                <span className="tool-sidebar__category-icon" aria-hidden="true">
                  {CATEGORY_ICONS[category]}
                </span>
                <span className="tool-sidebar__label">{localizedCategoryLabel(category, t)}</span>
              </h2>
              <ul className="tool-sidebar__list">
                {tools.map((tool) => (
                  <li key={tool.id}>
                    <NavLink
                      to={tool.path}
                      title={localToolMeta(tool.id, "title")}
                      className={({ isActive }) => `tool-sidebar__link ${isActive ? "is-active" : ""}`}
                    >
                      <span className="tool-sidebar__icon" aria-hidden="true">
                        {getToolIcon(tool.id)}
                      </span>
                      <span className="tool-sidebar__label">{localToolMeta(tool.id, "title")}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}

        {keywordNormalized && filteredTools.length === 0 && (
          <p className="tool-sidebar__empty">{t("sidebar.empty")}</p>
        )}

        <nav className="tool-sidebar__footer" aria-label={t("sidebar.resources")}>
          <a className="tool-sidebar__link" href="https://github.com/kimx/NexaForge" target="_blank" rel="noreferrer">
            <span className="tool-sidebar__icon" aria-hidden="true">⌘</span>
            <span className="tool-sidebar__label">GitHub</span>
          </a>
        </nav>
        <a className="tool-sidebar__request" href="https://github.com/kimx/NexaForge/issues/new" target="_blank" rel="noreferrer">
          {t("sidebar.submitRequest")}
        </a>
      </div>
    </aside>
  );
}
