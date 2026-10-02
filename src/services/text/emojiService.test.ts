import { describe, expect, it } from "vitest";
import type { EmojiRecord } from "../../data/emoji.generated";
import { filterEmoji, formatEmojiDetails } from "./emojiService";

const records: EmojiRecord[] = [
  { id: "1F525", emoji: "🔥", group: "Travel & Places", order: 0, nameEn: "fire", nameZhHant: "火焰", keywordsEn: ["flame"], keywordsZhHant: ["火" ] },
  { id: "2764-FE0F", emoji: "❤️", group: "Smileys & Emotion", order: 1, nameEn: "red heart", nameZhHant: "紅心", keywordsEn: ["heart", "love"], keywordsZhHant: ["愛心", "愛"] },
  { id: "1F431", emoji: "🐱", group: "Animals & Nature", order: 2, nameEn: "cat face", nameZhHant: "貓臉", keywordsEn: ["cat"], keywordsZhHant: ["貓"] },
];

describe("emoji search", () => {
  it.each(["fire", "FIRE", "  fire  ", "火"])("finds fire for %s", (query) => {
    expect(filterEmoji(records, { query, group: "all" }).map(({ emoji }) => emoji)).toEqual(["🔥"]);
  });

  it.each(["heart", "愛心"])("finds a heart for %s", (query) => {
    expect(filterEmoji(records, { query, group: "all" }).map(({ emoji }) => emoji)).toEqual(["❤️"]);
  });

  it.each(["cat", "貓"])("finds a cat for %s", (query) => {
    expect(filterEmoji(records, { query, group: "all" }).map(({ emoji }) => emoji)).toEqual(["🐱"]);
  });

  it("intersects query and category filters", () => {
    expect(filterEmoji(records, { query: "heart", group: "Animals & Nature" })).toEqual([]);
    expect(filterEmoji(records, { query: "cat", group: "Animals & Nature" })).toHaveLength(1);
  });
});

describe("emoji encodings", () => {
  it.each([
    ["🚀", "U+1F680", "F0 9F 9A 80", "&#x1F680;", "\\u{1F680}"],
    ["❤️", "U+2764 U+FE0F", "E2 9D A4 EF B8 8F", "&#x2764;&#xFE0F;", "\\u{2764}\\u{FE0F}"],
    ["🇹🇼", "U+1F1F9 U+1F1FC", "F0 9F 87 B9 F0 9F 87 BC", "&#x1F1F9;&#x1F1FC;", "\\u{1F1F9}\\u{1F1FC}"],
    ["👍🏽", "U+1F44D U+1F3FD", "F0 9F 91 8D F0 9F 8F BD", "&#x1F44D;&#x1F3FD;", "\\u{1F44D}\\u{1F3FD}"],
    ["👩‍💻", "U+1F469 U+200D U+1F4BB", "F0 9F 91 A9 E2 80 8D F0 9F 92 BB", "&#x1F469;&#x200D;&#x1F4BB;", "\\u{1F469}\\u{200D}\\u{1F4BB}"],
    ["1️⃣", "U+0031 U+FE0F U+20E3", "31 EF B8 8F E2 83 A3", "&#x31;&#xFE0F;&#x20E3;", "\\u{31}\\u{FE0F}\\u{20E3}"],
    ["🏴󠁧󠁢󠁳󠁣󠁴󠁿", "U+1F3F4 U+E0067 U+E0062 U+E0073 U+E0063 U+E0074 U+E007F", "F0 9F 8F B4 F3 A0 81 A7 F3 A0 81 A2 F3 A0 81 B3 F3 A0 81 A3 F3 A0 81 B4 F3 A0 81 BF", "&#x1F3F4;&#xE0067;&#xE0062;&#xE0073;&#xE0063;&#xE0074;&#xE007F;", "\\u{1F3F4}\\u{E0067}\\u{E0062}\\u{E0073}\\u{E0063}\\u{E0074}\\u{E007F}"],
  ])("preserves the complete sequence for %s", (emoji, codePoints, utf8, html, javascript) => {
    expect(formatEmojiDetails(emoji)).toEqual({ codePoints, utf8, html, javascript });
  });
});
