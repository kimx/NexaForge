import type { EmojiRecord } from "../../data/emoji.generated";

interface EmojiGridProps {
  records: readonly EmojiRecord[];
  favoriteIds: readonly string[];
  locale: "zh-TW" | "en";
  t: (key: string, params?: Record<string, string | number>) => string;
  onCopy: (record: EmojiRecord) => void;
  onInfo: (record: EmojiRecord, trigger: HTMLButtonElement) => void;
  onToggleFavorite: (record: EmojiRecord) => void;
}

export function EmojiGrid({ records, favoriteIds, locale, t, onCopy, onInfo, onToggleFavorite }: EmojiGridProps): JSX.Element {
  return (
    <ul className="emoji-grid" aria-label={t("emoji.results", { count: records.length })}>
      {records.map((record) => {
        const name = locale === "en" ? record.nameEn : record.nameZhHant;
        const favorite = favoriteIds.includes(record.id);
        return (
          <li className="emoji-grid__item" key={record.id}>
            <button
              type="button"
              className="emoji-grid__copy"
              aria-label={t("emoji.copy", { emoji: record.emoji, name })}
              onClick={() => onCopy(record)}
            >
              <span className="emoji-grid__glyph" aria-hidden="true">{record.emoji}</span>
              <span className="emoji-grid__name">{name}</span>
            </button>
            <div className="emoji-grid__actions">
              <button
                type="button"
                className="emoji-grid__icon-button"
                aria-label={t("emoji.info", { emoji: record.emoji })}
                onClick={(event) => onInfo(record, event.currentTarget)}
              >ⓘ</button>
              <button
                type="button"
                className="emoji-grid__icon-button"
                aria-label={t(favorite ? "emoji.favorite.remove" : "emoji.favorite.add", { emoji: record.emoji })}
                aria-pressed={favorite}
                onClick={() => onToggleFavorite(record)}
              >{favorite ? "★" : "☆"}</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
