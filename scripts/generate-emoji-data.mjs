import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEmojiRecords, renderEmojiModule } from "./emoji-data-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sources = {
  emoji: "https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt",
  en: [
    "https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/annotations/en.xml",
    "https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/annotationsDerived/en.xml",
  ],
  zhHant: [
    "https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/annotations/zh_Hant.xml",
    "https://raw.githubusercontent.com/unicode-org/cldr/release-48/common/annotationsDerived/zh_Hant.xml",
  ],
};

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to download ${url}: HTTP ${response.status}`);
  return response.text();
}

const [emojiTest, englishSources, traditionalChineseSources] = await Promise.all([
  download(sources.emoji),
  Promise.all(sources.en.map(download)),
  Promise.all(sources.zhHant.map(download)),
]);
const records = buildEmojiRecords(emojiTest, englishSources, traditionalChineseSources);
if (records.length < 3000) throw new Error(`Unexpected Emoji 17.0 record count: ${records.length}`);
if (new Set(records.map(({ id }) => id)).size !== records.length) throw new Error("Duplicate emoji ids generated.");

const output = resolve(root, "src/data/emoji.generated.ts");
await writeFile(output, renderEmojiModule(records), "utf8");
console.log(`Generated ${records.length} emoji records at ${output}`);
