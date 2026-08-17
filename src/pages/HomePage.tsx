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
import { ToolSidebar } from "../components/ToolSidebar";
import { AdSlot } from "../components/AdSlot";

const categoryOrder: ToolDefinition["category"][] = [
  "Image",
  "PDF",
  "Data",
  "Developer",
  "Text",
];

const TOOL_VISUALS: Record<string, { label: string; tone: string }> = {
  "image-resize": { label: "IMG", tone: "blue" },
  "image-compress": { label: "↘", tone: "mint" },
  "image-convert": { label: "IMG", tone: "sky" },
  "pdf-merge": { label: "PDF", tone: "red" },
  "pdf-split": { label: "✂", tone: "violet" },
  "pdf-rotate": { label: "PDF", tone: "red" },
  "json-formatter": { label: "{}", tone: "blue" },
  "csv-viewer": { label: "CSV", tone: "mint" },
  "csv-to-json": { label: "CSV", tone: "mint" },
  "json-to-csv": { label: "{}", tone: "blue" },
  base64: { label: "64", tone: "amber" },
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

function ToolCard({ tool, onOpen, className = "" }: { tool: ToolDefinition; onOpen?: (toolId: string) => void; className?: string }): JSX.Element {
  const { t } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const visual = TOOL_VISUALS[tool.id] ?? { label: "FILE", tone: "blue" };

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
          <h3>{localToolMeta(tool.id, "title")}</h3>
          <p>{localToolMeta(tool.id, "description")}</p>
        </div>
      </div>
      <Link to={tool.path} className="btn secondary home-tool-card__action" onClick={() => onOpen?.(tool.id)}>
        {t("home.open")}
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export function HomePage(): JSX.Element {
  const { t } = useLanguage();
  const toolMeta = useLocalizedToolMeta();
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | ToolDefinition["category"]>("All");
  const [recentToolIds, setRecentToolIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = window.localStorage.getItem("nexaforge-recent-tools");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 6) : [];
    } catch {
      return [];
    }
  });
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
    try {
      window.localStorage.setItem("nexaforge-recent-tools", JSON.stringify(recentToolIds));
    } catch {
      // Recent tools are best-effort when storage is unavailable.
    }
  }, [recentToolIds]);

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

  const rememberTool = (toolId: string) => {
    setRecentToolIds((current) => [toolId, ...current.filter((id) => id !== toolId)].slice(0, 6));
  };

  const filteredTools = useMemo(() => {
    const lowered = keyword.trim().toLowerCase();
    return FILE_TOOLS.filter(
      (tool) =>
        (categoryFilter === "All" || tool.category === categoryFilter) &&
        (!lowered || [
          tool.title,
          tool.description,
          tool.category,
          ...(tool.aliases ?? []),
          ...(tool.keywords ?? []),
          toolMeta(tool.id, "title"),
          toolMeta(tool.id, "description"),
        ].some((value) => value.toLowerCase().includes(lowered)))
    );
  }, [categoryFilter, keyword, toolMeta]);

  const recentTools = useMemo(
    () => recentToolIds.map((id) => FILE_TOOLS.find((tool) => tool.id === id)).filter((tool): tool is ToolDefinition => Boolean(tool)),
    [recentToolIds]
  );

  const categoryCounts = categoryOrder.reduce(
    (counts, category) => {
      counts[category] = FILE_TOOLS.filter((tool) => tool.category === category).length;
      return counts;
    },
    {} as Record<ToolDefinition["category"], number>
  );

  const focusCategory = (category: ToolDefinition["category"]) => {
    setCategoryFilter(category);
    window.setTimeout(() => {
      document.getElementById("popular-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <main className="home-page">
      <section className="home-hero">
        <img className="home-hero__visual" src="/nexaforge-hero.png" alt="" aria-hidden="true" />
        <div className="home-hero__content">
          <h1>
            <span>Nexa</span>
            <span className="home-hero__title-accent">Forge</span>
          </h1>
          <p>{t("home.subtitle")}</p>
          <div className="home-hero__actions">
            <Link to="/image/resize" className="btn">
              {t("home.primaryCta")}
            </Link>
            <a href="#popular-tools" className="btn secondary">
              {t("home.secondaryCta")}
            </a>
          </div>
          <div className="home-hero__proof" aria-label={t("home.proofLabel")}>
            <span>{t("home.proof.local")}</span>
            <span>{t("home.proof.formats")}</span>
            <span>{t("home.proof.noAccount")}</span>
          </div>
        </div>
      </section>

      <div className="home-dashboard">
        <ToolSidebar />

        <section className="home-workspace">
          <div className="workspace-heading">
            <div>
              <span className="workspace-heading__eyebrow">{t("home.workspaceKicker")}</span>
              <h2>{t("home.workspaceTitle")}</h2>
              <p>{t("home.workspaceSubtitle")}</p>
            </div>
            <div className="workspace-search">
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

          <div className="finder-filters" aria-label={t("home.categoryFilterLabel")}>
            <span className="finder-filters__label">{t("home.filterBy")}</span>
            {(["All", ...categoryOrder] as const).map((category) => (
              <button
                type="button"
                key={category}
                className={`finder-filter${categoryFilter === category ? " finder-filter--active" : ""}`}
                onClick={() => setCategoryFilter(category)}
                aria-pressed={categoryFilter === category}
              >
                {category === "All" ? t("home.categories.all") : localizedCategoryLabel(category, t)}
              </button>
            ))}
          </div>

          {recentTools.length > 0 ? (
            <div className="workspace-section recent-tools-section">
              <div className="workspace-section__heading">
                <h3>{t("home.recentTools")}</h3>
                <span>{t("home.recentToolsCount", { count: recentTools.length })}</span>
              </div>
              <div className="tool-grid home-tool-grid home-tool-grid--recent">
                {recentTools.map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={rememberTool} className="home-tool-card--recent" />)}
              </div>
            </div>
          ) : null}

          <div className="workspace-section" id="popular-tools">
            <div className="workspace-section__heading">
              <h3>{t("home.popular")}</h3>
              <span>{t("sidebar.resultCount", { count: filteredTools.length })}</span>
            </div>
            {filteredTools.length > 0 ? (
              <div className="tool-grid home-tool-grid">
                {filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} onOpen={rememberTool} />)}
              </div>
            ) : (
              <div className="finder-empty" role="status">
                <strong>{t("home.noResults")}</strong>
                <p>{t("home.noResultsHint")}</p>
                <button type="button" className="btn secondary" onClick={() => { setKeyword(""); setCategoryFilter("All"); }}>
                  {t("home.clearFilters")}
                </button>
              </div>
            )}
          </div>

          <div className="workspace-section category-section">
            <div className="workspace-section__heading">
              <div>
                <h3>{t("home.browseCategories")}</h3>
                <p>{t("home.browseCategoriesSubtitle")}</p>
              </div>
            </div>
            <div className="category-grid">
              {categoryOrder.map((category) => (
                <button
                  type="button"
                  className="category-card"
                  key={category}
                  onClick={() => focusCategory(category)}
                >
                  <span className={`category-card__icon category-card__icon--${category.toLowerCase()}`} aria-hidden="true">
                    {category === "Image" ? "IMG" : category === "PDF" ? "PDF" : category === "Data" ? "CSV" : category === "Text" ? "TXT" : "</>"}
                  </span>
                  <span className="category-card__copy">
                    <strong>{localizedCategoryLabel(category, t)}</strong>
                    <small>{t("home.categoryCount", { count: categoryCounts[category] })}</small>
                  </span>
                  <span className="category-card__arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <AdSlot position="home" adSlotId={homeAdSlotId} />
    </main>
  );
}
