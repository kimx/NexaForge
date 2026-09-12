import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FILE_TOOLS } from "../data/tools";
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

const categoryOrder: ToolDefinition["category"][] = [
  "Image",
  "PDF",
  "Data",
  "Developer",
  "Text",
  "QR & Barcode",
];

type HomeFilter = "Featured" | "All" | ToolDefinition["category"];

const FEATURED_TOOL_IDS = [
  "image-resize",
  "image-compress",
  "image-convert",
  "pdf-merge",
  "pdf-split",
  "csv-viewer",
  "word-counter",
  "qr-code",
] as const;

const FEATURED_TOOLS = FEATURED_TOOL_IDS
  .map((id) => FILE_TOOLS.find((tool) => tool.id === id))
  .filter((tool): tool is ToolDefinition => Boolean(tool));

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
    id: "list-cleanup",
    toolId: "list-cleanup",
    titleKey: "home.task.listCleanup.title",
    descriptionKey: "home.task.listCleanup.description",
  },
] as const;

const TOOL_VISUALS: Record<string, { label: string; tone: string }> = {
  "image-resize": { label: "IMG", tone: "blue" },
  "image-compress": { label: "↘", tone: "mint" },
  "image-convert": { label: "IMG", tone: "sky" },
  "image-exif-viewer": { label: "EXIF", tone: "amber" },
  "image-remove-exif": { label: "META", tone: "violet" },
  "pdf-merge": { label: "PDF", tone: "red" },
  "pdf-split": { label: "✂", tone: "violet" },
  "pdf-rotate": { label: "PDF", tone: "red" },
  "json-formatter": { label: "{}", tone: "blue" },
  "csv-viewer": { label: "CSV", tone: "mint" },
  "csv-to-json": { label: "CSV", tone: "mint" },
  "json-to-csv": { label: "{}", tone: "blue" },
  base64: { label: "64", tone: "amber" },
  "word-counter": { label: "TXT", tone: "mint" },
  "case-converter": { label: "Aa", tone: "amber" },
  "remove-duplicate-lines": { label: "≡", tone: "violet" },
  "sort-lines": { label: "AZ", tone: "sky" },
  "markdown-previewer": { label: "MD", tone: "sky" },
  hash: { label: "#", tone: "violet" },
  uuid: { label: "ID", tone: "sky" },
  "jwt-key": { label: "KEY", tone: "violet" },
  "jwt-decoder": { label: "JWT", tone: "blue" },
  "url-encoder": { label: "URL", tone: "sky" },
  "unix-timestamp": { label: "TIME", tone: "mint" },
  "json-yaml": { label: "YAML", tone: "amber" },
  "json-diff": { label: "DIFF", tone: "violet" },
  "qr-code": { label: "QR", tone: "blue" },
};

function searchMatchScore(values: string[], query: string): number {
  return values.reduce((best, value) => {
    const normalized = value.trim().toLowerCase();
    if (normalized === query) return Math.max(best, 1_000);
    if (normalized.startsWith(query)) return Math.max(best, 600);
    if (normalized.includes(query)) return Math.max(best, 300);
    return best;
  }, 0);
}

function ToolCard({ tool, onOpen, className = "" }: { tool: ToolDefinition; onOpen?: (toolId: string) => void; className?: string }): JSX.Element {
  const { t, locale } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const visual = TOOL_VISUALS[tool.id] ?? { label: "FILE", tone: "blue" };
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
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<HomeFilter>("Featured");
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

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "Escape") {
        setKeyword("");
        setCategoryFilter("Featured");
        return;
      }
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
        (categoryFilter === "Featured" || categoryFilter === "All" || tool.category === categoryFilter) && score > 0
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
      .filter((tool): tool is ToolDefinition => Boolean(tool) && !pinnedToolIdSet.has(tool.id)),
    [pinnedToolIdSet, recentToolIds]
  );

  const keywordActive = keyword.trim().length > 0;
  const isDefaultView = !keywordActive && categoryFilter === "Featured";
  const personalizedToolIdSet = useMemo(
    () => new Set([...pinnedTools, ...recentTools].map((tool) => tool.id)),
    [pinnedTools, recentTools]
  );
  const displayedTools = isDefaultView
    ? FEATURED_TOOLS.filter((tool) => !personalizedToolIdSet.has(tool.id))
    : filteredTools;

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
                  <p className="home-hero__positioning">{t("home.positioning")}</p>
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
                      onChange={(event) => setKeyword(event.target.value)}
                    />
                  </label>
                  {keyword ? (
                    <button type="button" className="workspace-search__clear" onClick={() => setKeyword("")} aria-label={t("home.clearSearch")}>
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
              {!keywordActive ? (
                <div className="home-hero__proof" aria-label={t("home.proofLabel")}>
                  <span>{t("home.proof.local")}</span>
                  <span>{t("home.proof.formats")}</span>
                  <span>{t("home.proof.noAccount")}</span>
                </div>
              ) : null}
            </div>
          </section>

          {!keywordActive ? (
            <nav className="home-discovery" aria-label={t("home.discoveryLabel")}>
              <span className="home-discovery__label">{t("home.discoveryLabel")}</span>
              <div className="home-discovery__links">
                <Link to={localizePath("/image/resize", locale)}>{t("home.imagePdfTools")}</Link>
                <Link to={localizePath("/data/json-formatter", locale)}>{t("home.dataTools")}</Link>
                <Link to={localizePath("/developer/regex-tester", locale)}>{t("home.developerTools")}</Link>
              </div>
            </nav>
          ) : null}

          {!keywordActive ? (
            <section className="home-task-entries" data-testid="task-entries" aria-labelledby="home-task-entries-title">
              <div className="home-task-entries__heading">
                <h2 id="home-task-entries-title">{t("home.taskEntries")}</h2>
                <p>{t("home.taskEntriesSubtitle")}</p>
              </div>
              <div className="home-task-entries__grid">
                {TASK_ENTRY_DEFINITIONS.map((task) => {
                  const tool = FILE_TOOLS.find((candidate) => candidate.id === task.toolId);
                  if (!tool) {
                    return null;
                  }

                  const localizedTitle = toolMeta(tool.id, "title");
                  return (
                    <article className="home-task-entry" key={task.id}>
                      <div>
                        <h3>{t(task.titleKey)}</h3>
                        <p>{t(task.descriptionKey)}</p>
                      </div>
                      <Link
                        to={localizePath(tool.path, locale)}
                        className="home-task-entry__link"
                        aria-label={t("home.openNamed", { tool: localizedTitle })}
                        onClick={() => launchTaskEntry(task.id, tool.id)}
                      >
                        {t("home.open")}
                        <span aria-hidden="true">→</span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="finder-filters" aria-label={t("home.categoryFilterLabel")}>
            <span className="finder-filters__label">{t("home.filterBy")}</span>
            {(["Featured", "All", ...categoryOrder] as const).map((category) => (
              <button
                type="button"
                key={category}
                className={`finder-filter${categoryFilter === category ? " finder-filter--active" : ""}`}
                onClick={() => setCategoryFilter(category)}
                aria-pressed={categoryFilter === category}
              >
                {category === "Featured"
                  ? t("home.categories.featured")
                  : category === "All"
                    ? t("home.categories.all")
                    : localizedCategoryLabel(category, t)}
              </button>
            ))}
          </div>

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

          <div
            className="workspace-section"
            id="featured-tools"
            data-testid={isDefaultView ? "featured-tools" : undefined}
          >
            <div className="workspace-section__heading">
              <h2>{t(keywordActive ? "home.searchResults" : isDefaultView ? "home.featured" : "home.allTools")}</h2>
              <span>{t("sidebar.resultCount", { count: displayedTools.length })}</span>
            </div>
            {displayedTools.length > 0 ? (
              <div className="tool-grid home-tool-grid">
                {displayedTools.map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={rememberTool} />)}
              </div>
            ) : (
              <div className="finder-empty" role="status">
                <strong>{t("home.noResults")}</strong>
                <p>{t("home.noResultsHint")}</p>
                <button type="button" className="btn secondary" onClick={() => { setKeyword(""); setCategoryFilter("Featured"); }}>
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
