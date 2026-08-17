import { ChangeEvent, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
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

const groupedTools = categoryOrder.reduce(
  (acc, category) => {
    acc[category] = FILE_TOOLS.filter((tool) => tool.category === category);
    return acc;
  },
  {} as Record<ToolDefinition["category"], ToolDefinition[]>
);

const CATEGORY_ICONS: Record<ToolDefinition["category"], string> = {
  Image: "◈",
  PDF: "▭",
  Data: "◈",
  Text: "✎",
  Developer: "⚙",
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

  if (toolId === "base64" || toolId === "hash" || toolId === "uuid" || toolId === "text-diff" || toolId === "markdown-previewer") {
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
      <div className="tool-sidebar__content">
        <div className="tool-sidebar__brand">
          <span className="tool-sidebar__brand-mark" aria-hidden="true">
            NF
          </span>
          <span className="tool-sidebar__brand-copy">
            <strong>工具工作台</strong>
            <small>File Toolkit</small>
          </span>
        </div>

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

        {!keywordNormalized && categoryOrder.map((category) => (
          <section className="tool-sidebar__section" key={category}>
            <h2 className="tool-sidebar__section-title">
              <span className="tool-sidebar__category-icon" aria-hidden="true">
                {CATEGORY_ICONS[category]}
              </span>
              <span className="tool-sidebar__label">{localizedCategoryLabel(category, t)}</span>
            </h2>
            <ul className="tool-sidebar__list">
              {groupedTools[category].map((tool) => (
                <li key={tool.id}>
                  <NavLink to={tool.path} className={({ isActive }) => `tool-sidebar__link ${isActive ? "is-active" : ""}`} title={localToolMeta(tool.id, "title")}>
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
      </div>
    </aside>
  );
}
