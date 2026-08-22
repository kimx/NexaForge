import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FILE_TOOLS } from "../data/tools";
import type { ToolDefinition } from "../types/tool";
import { localizedCategoryLabel, useLanguage, useLocalizedToolMeta } from "../context/LanguageContext";
import { localizePath, stripLocalePrefix } from "../routing/localePaths";

const categoryOrder: ToolDefinition["category"][] = [
  "Data",
  "Developer",
  "Image",
  "PDF",
  "Text",
];

type SidebarIconName =
  | "chevron"
  | "close"
  | "data"
  | "developer"
  | "github"
  | "home"
  | "image"
  | "pdf"
  | "search"
  | "text";

const CATEGORY_ICONS: Record<ToolDefinition["category"], SidebarIconName> = {
  Image: "image",
  PDF: "pdf",
  Data: "data",
  Text: "text",
  Developer: "developer",
};

function getToolIcon(toolId: string): SidebarIconName {
  if (toolId === "home") {
    return "home";
  }

  if (toolId.startsWith("image-")) {
    return "image";
  }

  if (toolId.startsWith("pdf-")) {
    return "pdf";
  }

  if (toolId.startsWith("json") || toolId.startsWith("csv")) {
    return "data";
  }

  if (toolId === "base64" || toolId === "hash" || toolId === "uuid" || toolId === "text-diff" || toolId === "markdown-previewer" || toolId === "word-counter" || toolId === "case-converter" || toolId === "remove-duplicate-lines" || toolId === "sort-lines") {
    return "text";
  }

  if (toolId.startsWith("jwt-") || toolId === "qr-code") {
    return "developer";
  }

  return "data";
}

function SidebarIcon({ name }: { name: SidebarIconName }): JSX.Element {
  const paths: Record<SidebarIconName, JSX.Element> = {
    chevron: <path d="m8.5 10 3.5 3.5 3.5-3.5" />,
    close: (
      <>
        <path d="m8.5 8.5 7 7" />
        <path d="m15.5 8.5-7 7" />
      </>
    ),
    data: (
      <>
        <ellipse cx="12" cy="6" rx="6.5" ry="2.5" />
        <path d="M5.5 6v6c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V6" />
        <path d="M5.5 12v6c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-6" />
      </>
    ),
    developer: (
      <>
        <path d="m8.5 8-4 4 4 4" />
        <path d="m15.5 8 4 4-4 4" />
        <path d="m13.5 5-3 14" />
      </>
    ),
    github: (
      <>
        <path d="M15 21v-3.8c.04-1-.35-1.96-1.1-2.6 3.6-.4 7.4-1.76 7.4-8A6.2 6.2 0 0 0 19.65 2.3 5.7 5.7 0 0 0 19.5-2S18.2-2.4 15 0a15 15 0 0 0-6 0C5.8-2.4 4.5-2 4.5-2a5.7 5.7 0 0 0-.15 4.3A6.2 6.2 0 0 0 2.7 6.6c0 6.23 3.8 7.6 7.4 8-.74.63-1.13 1.58-1.1 2.6V21" transform="translate(0 2) scale(.9)" />
        <path d="M9 19c-3 .9-3-1.5-4.2-2" />
      </>
    ),
    home: (
      <>
        <path d="m4 10 8-6 8 6" />
        <path d="M6.5 9v10h11V9" />
        <path d="M10 19v-5h4v5" />
      </>
    ),
    image: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m5.5 17 4.3-4.2 3.2 3 2.2-2.1 3.3 3.3" />
      </>
    ),
    pdf: (
      <>
        <path d="M6 3.5h8l4 4V20.5H6z" />
        <path d="M14 3.5v4h4" />
        <path d="M8.5 15.5h7" />
        <path d="M8.5 12.5h4.5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m15 15 4.5 4.5" />
      </>
    ),
    text: (
      <>
        <path d="M5 6h14" />
        <path d="M8 10h8" />
        <path d="M7 14h10" />
        <path d="M10 18h4" />
      </>
    ),
  };

  return (
    <svg className="tool-sidebar__svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

interface ToolSidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  closeButtonRef?: RefObject<HTMLButtonElement>;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ToolSidebar({
  isMobile = false,
  isOpen = true,
  onClose,
  closeButtonRef,
}: ToolSidebarProps): JSX.Element | null {
  const { t, locale } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const { pathname } = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeCategory = FILE_TOOLS.find((tool) => tool.path === stripLocalePrefix(pathname))?.category;
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

  const clearKeyword = () => {
    setKeyword("");
    searchInputRef.current?.focus();
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

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isMobile) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
    const first = focusable[0];
    const last = focusable.at(-1);

    if (!first || !last) {
      return;
    }

    if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (isMobile && !isOpen) {
    return null;
  }

  const brandLink = (
    <Link to={localizePath("/", locale)} className="tool-sidebar__brand" onClick={isMobile ? onClose : undefined}>
      <span className="tool-sidebar__brand-mark" aria-hidden="true">
        NF
      </span>
      <span className="tool-sidebar__brand-copy">
        <strong>NexaForge</strong>
        <small>Utility File Workspace</small>
      </span>
    </Link>
  );

  return (
    <aside
      id="tool-sidebar"
      className={`tool-sidebar${isMobile ? " tool-sidebar--drawer tool-sidebar--open" : ""}`}
      role={isMobile ? "dialog" : undefined}
      aria-modal={isMobile ? "true" : undefined}
      aria-label={isMobile ? t("sidebar.navigation") : t("sidebar.aria")}
      onKeyDown={handleKeyDown}
    >
      <div className="tool-sidebar__content">
        {isMobile ? (
          <div className="tool-sidebar__mobile-header">
            {brandLink}
            <button
              ref={closeButtonRef}
              type="button"
              className="tool-sidebar__close"
              aria-label={t("header.closeTools")}
              onClick={onClose}
            >
              <SidebarIcon name="close" />
            </button>
          </div>
        ) : brandLink}

        <div className="tool-sidebar__search-wrap">
          <label htmlFor="tool-search" className="tool-sidebar__search-label sr-only">
            {t("sidebar.searchLabel")}
          </label>
          <span className="tool-sidebar__search-icon" aria-hidden="true">
            <SidebarIcon name="search" />
          </span>
          <input
            ref={searchInputRef}
            id="tool-search"
            value={keyword}
            onChange={handleKeywordChange}
            placeholder={t("sidebar.searchPlaceholder")}
            className="tool-sidebar__search-input"
          />
          {keyword ? (
            <button
              type="button"
              className="tool-sidebar__search-clear"
              aria-label={t("sidebar.clearSearch")}
              onClick={clearKeyword}
            >
              <SidebarIcon name="close" />
            </button>
          ) : null}
        </div>

        {!keywordNormalized && (
          <nav className="tool-sidebar__categories" aria-label={t("sidebar.navigation")}>
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
                  <span className="tool-sidebar__icon" aria-hidden="true"><SidebarIcon name={CATEGORY_ICONS[category]} /></span>
                  <span className="tool-sidebar__label">{localizedCategoryLabel(category, t)} {t("sidebar.toolsSuffix")}</span>
                  <span className="tool-sidebar__category-chevron" aria-hidden="true">
                    <SidebarIcon name="chevron" />
                  </span>
                </button>
                {expandedCategories.has(category) && (
                  <ul className="tool-sidebar__list tool-sidebar__nested-list" id={`tool-sidebar-category-${category}`}>
                    {FILE_TOOLS.filter((tool) => tool.category === category).map((tool) => (
                      <li key={tool.id}>
                        <NavLink
                          to={localizePath(tool.path, locale)}
                          title={localToolMeta(tool.id, "title")}
                          className={({ isActive }) => `tool-sidebar__link ${isActive ? "is-active" : ""}`}
                          onClick={isMobile ? onClose : undefined}
                        >
                          <span className="tool-sidebar__icon" aria-hidden="true"><SidebarIcon name={getToolIcon(tool.id)} /></span>
                          <span className="tool-sidebar__label">{localToolMeta(tool.id, "title")}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
        )}

        {keywordNormalized &&
          groupedFilteredTools.map(({ category, tools }) => (
            <section className="tool-sidebar__section" key={category}>
              <h2 className="tool-sidebar__section-title">
                <span className="tool-sidebar__category-icon" aria-hidden="true">
                  <SidebarIcon name={CATEGORY_ICONS[category]} />
                </span>
                <span className="tool-sidebar__label">{localizedCategoryLabel(category, t)}</span>
              </h2>
              <ul className="tool-sidebar__list">
                {tools.map((tool) => (
                  <li key={tool.id}>
                    <NavLink
                      to={localizePath(tool.path, locale)}
                      title={localToolMeta(tool.id, "title")}
                      className={({ isActive }) => `tool-sidebar__link ${isActive ? "is-active" : ""}`}
                      onClick={isMobile ? onClose : undefined}
                    >
                      <span className="tool-sidebar__icon" aria-hidden="true">
                        <SidebarIcon name={getToolIcon(tool.id)} />
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
            <span className="tool-sidebar__icon" aria-hidden="true"><SidebarIcon name="github" /></span>
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
