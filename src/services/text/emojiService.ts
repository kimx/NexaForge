import type { EmojiGroup, EmojiRecord } from "../../data/emoji.generated";

export interface EmojiFilter {
  query: string;
  group: EmojiGroup | "all";
}

export interface EmojiDetails {
  codePoints: string;
  utf8: string;
  html: string;
  javascript: string;
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en");
}

export function filterEmoji(records: readonly EmojiRecord[], filter: EmojiFilter): EmojiRecord[] {
  const query = normalizeSearch(filter.query);
  return records.filter((record) => {
    if (filter.group !== "all" && record.group !== filter.group) return false;
    if (!query) return true;
    const searchable = [
      record.emoji,
      record.nameEn,
      record.nameZhHant,
      ...record.keywordsEn,
      ...record.keywordsZhHant,
    ].join(" ");
    return normalizeSearch(searchable).includes(query);
  });
}

export function formatEmojiDetails(emoji: string): EmojiDetails {
  const codePoints = Array.from(emoji, (character) => character.codePointAt(0) as number);
  const hex = codePoints.map((value) => value.toString(16).toUpperCase());
  return {
    codePoints: hex.map((value) => `U+${value.padStart(4, "0")}`).join(" "),
    utf8: Array.from(new TextEncoder().encode(emoji), (value) => value.toString(16).toUpperCase().padStart(2, "0")).join(" "),
    html: hex.map((value) => `&#x${value};`).join(""),
    javascript: hex.map((value) => `\\u{${value}}`).join(""),
  };
}
