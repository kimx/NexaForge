import { useEffect, useMemo, useState } from "react";
import { EmojiDetailsDialog } from "../../components/emoji/EmojiDetailsDialog";
import { EmojiGrid } from "../../components/emoji/EmojiGrid";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { EMOJI_DATA, type EmojiGroup, type EmojiRecord } from "../../data/emoji.generated";
import { FILE_TOOLS } from "../../data/tools";
import { useSeo } from "../../hooks/useSeo";
import { filterEmoji } from "../../services/text/emojiService";
import { addRecentEmoji, loadEmojiState, saveEmojiState, toggleFavoriteEmoji } from "../../services/text/emojiStorage";
import type { ToolDefinition, ToolMeta } from "../../types/tool";
import { getRelatedTools } from "../../utils/toolHelpers";

const GROUPS: EmojiGroup[] = [
  "Smileys & Emotion", "People & Body", "Animals & Nature", "Food & Drink", "Activities",
  "Travel & Places", "Objects", "Symbols", "Flags",
];
const DISPLAY_STEP = 240;
type EmojiView = "all" | "recent" | "favorites";

const FALLBACK_TOOL: ToolDefinition = {
  id: "emoji-picker",
  title: "Emoji Picker & Unicode Tool",
  description: "Search and copy emoji with Unicode information.",
  path: "/tools/emoji-picker",
  category: "Text",
};

export function EmojiPickerPage(): JSX.Element {
  const { locale, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<EmojiGroup | "all">("all");
  const [view, setView] = useState<EmojiView>("all");
  const [visibleLimit, setVisibleLimit] = useState(DISPLAY_STEP);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [persistenceAvailable, setPersistenceAvailable] = useState(true);
  const [selected, setSelected] = useState<EmojiRecord | null>(null);
  const [detailsTrigger, setDetailsTrigger] = useState<HTMLButtonElement | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const tool = FILE_TOOLS.find((candidate) => candidate.id === "emoji-picker") ?? FALLBACK_TOOL;
  const title = t("tool.emoji-picker.title");
  const description = t("tool.emoji-picker.description");
  const meta: ToolMeta = {
    title: locale === "en" ? "Emoji Picker & Unicode Tool | NexaForge" : "Emoji 搜尋與複製工具｜Unicode 編碼查詢 | NexaForge",
    description,
    canonical: "/tools/emoji-picker",
    h1: title,
  };
  useSeo(meta);

  useEffect(() => {
    const stored = loadEmojiState();
    setRecentIds(stored.recentIds);
    setFavoriteIds(stored.favoriteIds);
    setPersistenceAvailable(stored.persistenceAvailable);
  }, []);

  useEffect(() => setVisibleLimit(DISPLAY_STEP), [query, group, view]);

  const recordsById = useMemo(() => new Map(EMOJI_DATA.map((record) => [record.id, record])), []);
  const sourceRecords = useMemo(() => {
    if (view === "recent") return recentIds.map((id) => recordsById.get(id)).filter((record): record is EmojiRecord => Boolean(record));
    if (view === "favorites") return favoriteIds.map((id) => recordsById.get(id)).filter((record): record is EmojiRecord => Boolean(record));
    return EMOJI_DATA;
  }, [favoriteIds, recentIds, recordsById, view]);
  const results = useMemo(() => filterEmoji(sourceRecords, { query, group }), [sourceRecords, query, group]);
  const displayed = results.slice(0, visibleLimit);

  const persist = (nextRecentIds: string[], nextFavoriteIds: string[]): void => {
    if (!saveEmojiState({ recentIds: nextRecentIds, favoriteIds: nextFavoriteIds })) setPersistenceAvailable(false);
  };

  const copyValue = async (value: string, successMessage: string, recentRecord?: EmojiRecord): Promise<void> => {
    setError("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setMessage(successMessage);
      if (recentRecord) {
        const nextRecentIds = addRecentEmoji(recentIds, recentRecord.id);
        setRecentIds(nextRecentIds);
        persist(nextRecentIds, favoriteIds);
      }
    } catch {
      setMessage("");
      setError(t("emoji.clipboardError"));
    }
  };

  const toggleFavorite = (record: EmojiRecord): void => {
    const nextFavoriteIds = toggleFavoriteEmoji(favoriteIds, record.id);
    setFavoriteIds(nextFavoriteIds);
    persist(recentIds, nextFavoriteIds);
  };

  const emptyKey = view === "recent" && sourceRecords.length === 0 ? "emoji.empty.recent"
    : view === "favorites" && sourceRecords.length === 0 ? "emoji.empty.favorites"
      : "emoji.empty.filtered";
  const howItWorks = [0, 1, 2].map((index) => t(`emoji.how.${index}`));
  const faq = [0, 1, 2].map((index) => ({ q: t(`emoji.faq.${index}.question`), a: t(`emoji.faq.${index}.answer`) }));

  return (
    <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", title]} workflow={{ state: "idle" }}>
      {{
        workspace: (
          <>
          <div className="emoji-picker">
            <div className="emoji-picker__search-row">
              <label className="emoji-picker__search-label">
                <span>{t("emoji.search.label")}</span>
                <input
                  type="search"
                  value={query}
                  placeholder={t("emoji.search.placeholder")}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button type="button" className="secondary" disabled={!query} onClick={() => setQuery("")}>{t("emoji.search.clear")}</button>
            </div>

            <div className="emoji-picker__toolbar">
              <div className="emoji-picker__filters" role="group" aria-label={t("emoji.views.label")}>
                {(["all", "recent", "favorites"] as const).map((value) => (
                  <button key={value} type="button" className="secondary" aria-pressed={view === value} onClick={() => setView(value)}>{t(`emoji.view.${value}`)}</button>
                ))}
              </div>
              <p className="emoji-picker__count" aria-live="polite">{t("emoji.results", { count: results.length })}</p>
            </div>

            <div className="emoji-picker__filters" role="group" aria-label={t("emoji.categories.label")}>
              <button type="button" className="secondary" aria-pressed={group === "all"} onClick={() => setGroup("all")}>{t("emoji.category.all")}</button>
              {GROUPS.map((value) => (
                <button key={value} type="button" className="secondary" aria-pressed={group === value} onClick={() => setGroup(value)}>{t(`emoji.category.${value}`)}</button>
              ))}
            </div>

            {!persistenceAvailable ? <p className="warning" role="alert">{t("emoji.storageWarning")}</p> : null}
            {error ? <p className="error" role="alert">{error}</p> : null}
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</p>
            {message ? <p className="emoji-picker__message">{message}</p> : null}

            {results.length > 0 ? (
              <>
                <EmojiGrid
                  records={displayed}
                  favoriteIds={favoriteIds}
                  locale={locale}
                  t={t}
                  onCopy={(record) => void copyValue(record.emoji, t("emoji.copied", { emoji: record.emoji }), record)}
                  onInfo={(record, trigger) => { setDetailsTrigger(trigger); setSelected(record); }}
                  onToggleFavorite={toggleFavorite}
                />
                <div className="emoji-picker__footer-actions">
                  {displayed.length < results.length ? <button type="button" className="secondary" onClick={() => setVisibleLimit((value) => value + DISPLAY_STEP)}>{t("emoji.more")}</button> : null}
                  {view === "recent" && recentIds.length > 0 ? <button type="button" className="secondary" onClick={() => { setRecentIds([]); persist([], favoriteIds); }}>{t("emoji.recent.clear")}</button> : null}
                </div>
              </>
            ) : (
              <div className="emoji-picker__empty">
                <h3>{t(emptyKey)}</h3>
                {emptyKey === "emoji.empty.filtered" ? <p>{t("emoji.empty.filteredHint")}</p> : null}
              </div>
            )}
            <p className="emoji-picker__font-notice">{t("emoji.fontNotice")}</p>
          </div>
          {selected ? (
            <EmojiDetailsDialog
              record={selected}
              locale={locale}
              returnFocus={detailsTrigger}
              t={t}
              onClose={() => setSelected(null)}
              onCopyField={(value, label) => void copyValue(value, t("emoji.copiedField", { name: label }))}
            />
          ) : null}
          </>
        ),
        options: null,
        result: <></>,
        howItWorks,
        faq,
        relatedTools: getRelatedTools("emoji-picker"),
      }}
    </ToolPageTemplate>
  );
}
