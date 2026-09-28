import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FILE_TOOLS } from "../data/tools";
import { TOOL_CATEGORY_ORDER, getToolVisual } from "../data/toolVisuals";
import type { ToolDefinition, ToolMeta } from "../types/tool";
import { useSeo } from "../hooks/useSeo";
import {
  localizedCategoryLabel,
  useLanguage,
  useLocalizedToolMeta,
} from "../context/LanguageContext";
import { AdSlot } from "../components/AdSlot";
import { localizePath } from "../routing/localePaths";
import { trackEvent } from "../utils/analytics";
import { usePersonalization } from "../hooks/usePersonalization";
import { clearRecentTools, rememberTool } from "../services/personalization";
import { usePersonalizationCopy } from "../i18n/personalization";
import { PinToolButton } from "../components/PinToolButton";
import { PersonalSettings } from "../components/PersonalSettings";

type HomeFilter = "All" | ToolDefinition["category"];

const TASK_ENTRY_DEFINITIONS = [
  {
    id: "document-delivery",
    toolId: "image-to-pdf",
    titleKey: "home.task.documentDelivery.title",
    descriptionKey: "home.task.documentDelivery.description",
  },
  {
    id: "developer-data",
    toolId: "json-formatter",
    titleKey: "home.task.developerData.title",
    descriptionKey: "home.task.developerData.description",
  },
  {
    id: "image-compression",
    toolId: "image-compress",
    titleKey: "home.task.imageCompression.title",
    descriptionKey: "home.task.imageCompression.description",
  },
  {
    id: "list-cleanup",
    toolId: "list-cleanup",
    titleKey: "home.task.listCleanup.title",
    descriptionKey: "home.task.listCleanup.description",
  },
] as const;

function searchMatchScore(values: string[], query: string): number {
  return values.reduce((best, value) => {
    const normalized = value.trim().toLowerCase();
    if (normalized === query) return Math.max(best, 1_000);
    if (normalized.startsWith(query)) return Math.max(best, 600);
    if (normalized.includes(query)) return Math.max(best, 300);
    return best;
  }, 0);
}

function ToolCard({ tool, onOpen, className = "", showCategory = false }: { tool: ToolDefinition; onOpen?: (toolId: string) => void; className?: string; showCategory?: boolean }): JSX.Element {
  const { t, locale } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const visual = getToolVisual(tool);
  const localizedTitle = localToolMeta(tool.id, "title");

  return (
    <article className={`tool-card home-tool-card ${className}`.trim()}>
      <div className="home-tool-card__identity">
        <span
          className={`home-tool-card__icon home-tool-card__icon--${visual.tone}`}
          aria-hidden="true"
        >
          {visual.label}
        </span>
        <div>
          <h3>{localizedTitle}</h3>
          {showCategory ? <span className="home-tool-card__category">{localizedCategoryLabel(tool.category, t)}</span> : null}
          <p>{localToolMeta(tool.id, "description")}</p>
        </div>
      </div>
      <div className="home-tool-card__actions">
      <Link
        to={localizePath(tool.path, locale)}
        className="btn secondary home-tool-card__action"
        aria-label={t("home.openNamed", { tool: localizedTitle })}
        onClick={() => onOpen?.(tool.id)}
      >
        {t("home.open")}
        <span aria-hidden="true">→</span>
      </Link>
      <PinToolButton toolId={tool.id} />
      </div>
    </article>
  );
}

export function HomePage(): JSX.Element {
  const { t, locale } = useLanguage();
  const toolMeta = useLocalizedToolMeta();
  const location = useLocation();
  const navigate = useNavigate();
  const savedSearch = (location.state as { homeSearch?: { keyword?: unknown; categoryFilter?: unknown } } | null)?.homeSearch;
  const [keyword, setKeyword] = useState(() => typeof savedSearch?.keyword === "string" ? savedSearch.keyword : "");
  const [categoryFilter, setCategoryFilter] = useState<HomeFilter>(() =>
    savedSearch?.categoryFilter === "All" || TOOL_CATEGORY_ORDER.some((category) => category === savedSearch?.categoryFilter)
      ? savedSearch?.categoryFilter as HomeFilter
      : "All"
  );
  const { recent: recentToolIds, pinned: pinnedToolIds } = usePersonalization();
  const personalCopy = usePersonalizationCopy();
  const searchRef = useRef<HTMLInputElement>(null);
  const homeAdSlotId = import.meta.env.VITE_ADSENSE_SLOT_HOME;
  const homeMeta: ToolMeta = {
    title: t("home.title"),
    description: t("home.subtitle"),
    canonical: "/",
    h1: t("home.title"),
  };
  useSeo(homeMeta);

  const updateSearch = (nextKeyword: string, nextCategory: HomeFilter) => {
    setKeyword(nextKeyword);
    setCategoryFilter(nextCategory);
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: { ...(location.state && typeof location.state === "object" ? location.state : {}), homeSearch: { keyword: nextKeyword, categoryFilter: nextCategory } },
    });
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && target?.tagName !== "INPUT" && target?.tagName !== "TEXTAREA" && !target?.isContentEditable) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const launchTaskEntry = (taskId: string, toolId: string) => {
    rememberTool(toolId);
    trackEvent("task_launch", {
      taskId,
      tool: toolId,
      action: "open",
    });
  };

  const filteredTools = useMemo(() => {
    const lowered = keyword.trim().toLowerCase();
    return FILE_TOOLS.map((tool, index) => {
      const titleScore = searchMatchScore(
        [tool.title, toolMeta(tool.id, "title")],
        lowered
      );
      const aliasScore = searchMatchScore(tool.aliases ?? [], lowered);
      const supportingScore = searchMatchScore(
        [
          tool.description,
          tool.category,
          ...(tool.keywords ?? []),
          toolMeta(tool.id, "description"),
        ],
        lowered
      );
      return {
        tool,
        index,
        score: lowered
          ? Math.max(
              titleScore > 0 ? titleScore + 400 : 0,
              aliasScore > 0 ? aliasScore + 200 : 0,
              supportingScore
            )
          : 1,
      };
    })
      .filter(({ tool, score }) =>
        (categoryFilter === "All" || tool.category === categoryFilter) && score > 0
      )
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .map(({ tool }) => tool);
  }, [categoryFilter, keyword, toolMeta]);

  useEffect(() => {
    const queryLength = keyword.trim().length;
    if (queryLength === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      trackEvent("tool_search", {
        category: categoryFilter,
        queryLength,
        resultCount: filteredTools.length,
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [categoryFilter, filteredTools.length, keyword]);

  const pinnedTools = useMemo(
    () => pinnedToolIds
      .map((id) => FILE_TOOLS.find((tool) => tool.id === id))
      .filter((tool): tool is ToolDefinition => Boolean(tool)),
    [pinnedToolIds]
  );
  const pinnedToolIdSet = useMemo(() => new Set(pinnedTools.map((tool) => tool.id)), [pinnedTools]);
  const recentTools = useMemo(
    () => recentToolIds
      .slice(0, 4)
      .map((id) => FILE_TOOLS.find((tool) => tool.id === id))
      .filter((tool): tool is ToolDefinition => tool !== undefined && !pinnedToolIdSet.has(tool.id)),
    [pinnedToolIdSet, recentToolIds]
  );

  const keywordActive = keyword.trim().length > 0;
  const isDefaultView = !keywordActive && categoryFilter === "All";
  const displayedTools = filteredTools;

  return (
    <div className={`home-page${keywordActive ? " home-page--searching" : ""}`}>
          <section className={`home-hero${keywordActive ? " home-hero--searching" : ""}`}>
            <img className="home-hero__visual" src="/nexaforge-hero.png" alt="" aria-hidden="true" />
            <div className="home-hero__content">
              {!keywordActive ? <span className="home-hero__eyebrow">{t("home.eyebrow")}</span> : null}
              <h1>
                <span>Nexa</span>
                <span className="home-hero__title-accent">Forge</span>
              </h1>
              {!keywordActive ? (
                <>
                  <p>{t("home.subtitle")}</p>
                </>
              ) : null}
              <div className="home-hero__search">
                <div className="workspace-search workspace-search--hero">
                  <label htmlFor="search-tools">
                    <span className="workspace-search__icon" aria-hidden="true">⌕</span>
                    <span className="sr-only">{t("home.searchLabel")}</span>
                    <input
                      id="search-tools"
                      ref={searchRef}
                      value={keyword}
                      placeholder={t("home.searchPlaceholder")}
                      onChange={(event) => updateSearch(event.target.value, categoryFilter)}
                      onKeyDown={(event) => { if (event.key === "Escape" && keyword) { event.stopPropagation(); updateSearch("", categoryFilter); } }}
                    />
                  </label>
                  {keyword ? (
                    <button type="button" className="workspace-search__clear" onClick={() => { updateSearch("", categoryFilter); searchRef.current?.focus(); }} aria-label={t("home.clearSearch")}>
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
              {!keywordActive ? (
                <nav className="home-quick-actions" data-testid="task-entries" aria-label={t("home.taskEntries")}>
                  <span>{t("home.taskEntries")}</span>
                  {TASK_ENTRY_DEFINITIONS.map((task) => {
                    const tool = FILE_TOOLS.find((candidate) => candidate.id === task.toolId);
                    return tool ? <Link key={task.id} to={localizePath(tool.path, locale)} aria-label={t("home.openNamed", { tool: toolMeta(tool.id, "title") })} onClick={() => launchTaskEntry(task.id, tool.id)}>{t(task.titleKey)}</Link> : null;
                  })}
                </nav>
              ) : null}
              {!keywordActive ? <p className="home-hero__positioning">{t("home.positioning")}</p> : null}
              {!keywordActive ? (
                <div className="home-hero__proof" aria-label={t("home.proofLabel")}>
                  <span>{t("home.proof.local")}</span>
                  <span>{t("home.proof.formats")}</span>
                  <span>{t("home.proof.noAccount")}</span>
                </div>
              ) : null}
            </div>
          </section>

          {isDefaultView && pinnedTools.length > 0 ? (
            <section className="workspace-section" data-testid="pinned-tools" aria-labelledby="pinned-tools-title">
              <div className="workspace-section__heading"><h2 id="pinned-tools-title">{personalCopy.pinned}</h2></div>
              <div className="tool-grid home-tool-grid">
                {pinnedTools.map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={rememberTool} />)}
              </div>
            </section>
          ) : null}

          {isDefaultView && recentTools.length > 0 ? (
            <div className="workspace-section recent-tools-section" data-testid="recent-tools">
              <div className="workspace-section__heading">
                <h2>{t("home.recentTools")}</h2>
                <div className="recent-tools-section__meta">
                  <span>{t("home.recentToolsCount", { count: recentTools.length })}</span>
                  <button type="button" className="text-button" onClick={clearRecentTools}>
                    {t("home.clearRecentTools")}
                  </button>
                </div>
              </div>
              <div className="tool-grid home-tool-grid home-tool-grid--recent">
                {recentTools.map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={rememberTool} className="home-tool-card--recent" />)}
              </div>
            </div>
          ) : null}

          <div className="finder-filters" aria-label={t("home.categoryFilterLabel")}>
            <span className="finder-filters__label">{t("home.filterBy")}</span>
            {(["All", ...TOOL_CATEGORY_ORDER] as const).map((category) => (
              <button type="button" key={category}
                className={`finder-filter${categoryFilter === category ? " finder-filter--active" : ""}`}
                onClick={() => updateSearch(keyword, category)} aria-pressed={categoryFilter === category}>
                {category === "All" ? t("home.categories.all") : localizedCategoryLabel(category, t)}
              </button>
            ))}
          </div>

          <div
            className="workspace-section"
            id="featured-tools"
            data-testid={isDefaultView ? "featured-tools" : undefined}
          >
            <div className="workspace-section__heading">
              <h2>{t(keywordActive ? "home.searchResults" : "home.allTools")}</h2>
              <span role={!isDefaultView ? "status" : undefined} aria-label={!isDefaultView ? t("home.searchResultCount") : undefined} aria-live={!isDefaultView ? "polite" : undefined} aria-atomic={!isDefaultView ? "true" : undefined}>{t("sidebar.resultCount", { count: displayedTools.length })}</span>
            </div>
            {displayedTools.length > 0 ? (
              <div className="tool-grid home-tool-grid">
                {displayedTools.map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={rememberTool} showCategory={!isDefaultView} />)}
              </div>
            ) : (
              <div className="finder-empty" role="status">
                <strong>{t("home.noResults")}</strong>
                <p>{t("home.noResultsHint")}</p>
                <button type="button" className="btn secondary" onClick={() => { updateSearch("", "All"); searchRef.current?.focus(); }}>
                  {t("home.clearFilters")}
                </button>
              </div>
            )}
          </div>

      <PersonalSettings />
      <AdSlot position="home" adSlotId={homeAdSlotId} />
    </div>
  );
}
