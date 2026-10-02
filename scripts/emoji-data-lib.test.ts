import { describe, expect, it } from "vitest";
import { buildEmojiRecords, parseAnnotationsXml, parseEmojiTest } from "./emoji-data-lib.mjs";

const EMOJI_TEST_FIXTURE = `
# group: Smileys & Emotion
# subgroup: face-smiling
1F600                                      ; fully-qualified     # 😀 E1.0 grinning face
263A FE0F                                  ; fully-qualified     # ☺️ E0.6 smiling face
263A                                       ; unqualified         # ☺ E0.6 smiling face
# group: Component
1F3FB                                      ; component           # 🏻 E1.0 light skin tone
# group: Travel & Places
# subgroup: transport-air
1F680                                      ; fully-qualified     # 🚀 E0.6 rocket
`;

const EN_ANNOTATIONS = `
<ldml><annotations>
  <annotation cp="😀">face | grin | smile</annotation>
  <annotation cp="😀" type="tts">grinning face</annotation>
  <annotation cp="🚀">launch | rocket | space</annotation>
  <annotation cp="🚀" type="tts">rocket &amp; spacecraft</annotation>
</annotations></ldml>`;

const ZH_ANNOTATIONS = `
<ldml><annotations>
  <annotation cp="😀">臉 | 笑</annotation>
  <annotation cp="😀" type="tts">笑臉</annotation>
  <annotation cp="☺">微笑 | 表情</annotation>
  <annotation cp="☺" type="tts">微笑臉</annotation>
</annotations></ldml>`;

describe("emoji data generation", () => {
  it("keeps only fully-qualified emoji and preserves group order and complete ids", () => {
    expect(parseEmojiTest(EMOJI_TEST_FIXTURE)).toEqual([
      { id: "1F600", emoji: "😀", group: "Smileys & Emotion", order: 0, sourceNameEn: "grinning face" },
      { id: "263A-FE0F", emoji: "☺️", group: "Smileys & Emotion", order: 1, sourceNameEn: "smiling face" },
      { id: "1F680", emoji: "🚀", group: "Travel & Places", order: 2, sourceNameEn: "rocket" },
    ]);
  });

  it("parses TTS names, keywords, and XML entities independently", () => {
    expect(parseAnnotationsXml(EN_ANNOTATIONS).get("🚀")).toEqual({
      name: "rocket & spacecraft",
      keywords: ["launch", "rocket", "space"],
    });
  });

  it("falls back to English names when Traditional Chinese TTS is absent", () => {
    const records = buildEmojiRecords(
      EMOJI_TEST_FIXTURE,
      [EN_ANNOTATIONS],
      [ZH_ANNOTATIONS]
    );
    expect(records.find((record) => record.emoji === "😀")).toMatchObject({
      nameEn: "grinning face",
      nameZhHant: "笑臉",
      keywordsZhHant: ["臉", "笑"],
    });
    expect(records.find((record) => record.emoji === "🚀")).toMatchObject({
      nameEn: "rocket & spacecraft",
      nameZhHant: "rocket & spacecraft",
      keywordsZhHant: [],
    });
    expect(records.find((record) => record.emoji === "☺️")).toMatchObject({
      nameEn: "smiling face",
      nameZhHant: "微笑臉",
      keywordsZhHant: ["微笑", "表情"],
    });
  });
});
