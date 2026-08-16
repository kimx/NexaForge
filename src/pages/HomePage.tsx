import { useMemo, useState } from "react";
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

const categoryOrder: ToolDefinition["category"][] = [
  "Image",
  "PDF",
  "Data",
  "Text",
  "Developer",
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
  hash: { label: "#", tone: "violet" },
  uuid: { label: "ID", tone: "sky" },
  "qr-code": { label: "QR", tone: "blue" },
};

function ToolCard({ tool }: { tool: ToolDefinition }): JSX.Element {
  const { t } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const visual = TOOL_VISUALS[tool.id] ?? { label: "FILE", tone: "blue" };

  return (
    <article className="tool-card home-tool-card">
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
      <Link to={tool.path} className="btn secondary home-tool-card__action">
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
  const homeMeta: ToolMeta = {
    title: t("home.title"),
    description: t("home.subtitle"),
    canonical: "/",
    h1: t("home.title"),
  };
  useSeo(homeMeta);

  const filteredTools = useMemo(() => {
    const lowered = keyword.trim().toLowerCase();
    if (!lowered) {
      return FILE_TOOLS;
    }

    return FILE_TOOLS.filter(
      (tool) =>
        tool.title.toLowerCase().includes(lowered) ||
        tool.description.toLowerCase().includes(lowered) ||
        tool.category.toLowerCase().includes(lowered) ||
        toolMeta(tool.id, "title").toLowerCase().includes(lowered) ||
        toolMeta(tool.id, "description").toLowerCase().includes(lowered)
    );
  }, [keyword, toolMeta]);

  const categoryCounts = categoryOrder.reduce(
    (counts, category) => {
      counts[category] = FILE_TOOLS.filter((tool) => tool.category === category).length;
      return counts;
    },
    {} as Record<ToolDefinition["category"], number>
  );

  const focusCategory = (category: ToolDefinition["category"]) => {
    setKeyword(category);
    window.setTimeout(() => {
      document.getElementById("popular-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <main className="home-page">
      <section className="home-hero">
        <img className="home-hero__visual" src="/nexaforge-hero.png" alt="" aria-hidden="true" />
        <div className="home-hero__content">
          <div className="home-hero__brandline">
            <img className="home-hero__mark" src="/nexaforge-mark.png" alt="" aria-hidden="true" />
            <span>{t("home.eyebrow")}</span>
          </div>
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
            <label className="workspace-search" htmlFor="search-tools">
              <span className="workspace-search__icon" aria-hidden="true">⌕</span>
              <span className="sr-only">{t("home.searchLabel")}</span>
              <input
                id="search-tools"
                value={keyword}
                placeholder={t("home.searchPlaceholder")}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
          </div>

          <div className="workspace-section" id="popular-tools">
            <div className="workspace-section__heading">
              <h3>{t("home.popular")}</h3>
              <span>{t("sidebar.resultCount", { count: filteredTools.length })}</span>
            </div>
            <div className="tool-grid home-tool-grid">
              {filteredTools.slice(0, 8).map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
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
    </main>
  );
}
