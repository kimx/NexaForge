import type { Locale } from "../context/LanguageContext";
import { stripLocalePrefix } from "../routing/localePaths";

export interface LandingPreset {
  sourceFormat?: "jpeg" | "png" | "webp" | "heic";
  outputFormat?: "jpeg" | "png" | "webp";
  mode?: "validate" | "textToBase64" | "base64ToText" | "encode" | "decode";
}

export interface LandingContent {
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  steps: string[];
  privacy: string;
  faq: Array<{ q: string; a: string }>;
  related: Array<{ path: string; label: string }>;
}

export interface SeoLandingDefinition {
  path: string;
  toolId: string;
  isAlias: boolean;
  preset: LandingPreset;
  content: Record<Locale, LandingContent>;
}

interface CopySeed {
  h1: string;
  description: string;
  featureHeading: string;
  featureBody: string;
  useHeading: string;
  useBody: string;
  steps: [string, string, string];
  secondFaq: { q: string; a: string };
}

interface PageSeed {
  path: string;
  toolId: string;
  isAlias?: boolean;
  preset?: LandingPreset;
  related: [string, string, string, string];
  zh: CopySeed;
  en: CopySeed;
}

const RELATED_LABELS: Record<string, Record<Locale, string>> = {
  "/image/jpg-to-webp": { "zh-TW": "JPG 轉 WebP", en: "JPG to WebP" },
  "/image/png-to-webp": { "zh-TW": "PNG 轉 WebP", en: "PNG to WebP" },
  "/image/webp-to-jpg": { "zh-TW": "WebP 轉 JPG", en: "WebP to JPG" },
  "/image/heic-to-jpg": { "zh-TW": "HEIC 轉 JPG", en: "HEIC to JPG" },
  "/image/jpg-compress": { "zh-TW": "JPG 圖片壓縮", en: "Compress JPG" },
  "/image/png-compress": { "zh-TW": "PNG 圖片壓縮", en: "Compress PNG" },
  "/image/convert": { "zh-TW": "圖片格式轉換", en: "Image Converter" },
  "/image/resize": { "zh-TW": "調整圖片尺寸", en: "Resize Images" },
  "/image/crop": { "zh-TW": "線上裁切圖片", en: "Crop Images" },
  "/image/compress": { "zh-TW": "圖片壓縮工具", en: "Image Compressor" },
  "/image/heic-converter": { "zh-TW": "HEIC 圖片轉換", en: "HEIC Converter" },
  "/pdf/merge": { "zh-TW": "合併 PDF", en: "Merge PDF" },
  "/pdf/split": { "zh-TW": "分割 PDF", en: "Split PDF" },
  "/pdf/rotate": { "zh-TW": "旋轉 PDF", en: "Rotate PDF" },
  "/data/json-formatter": { "zh-TW": "JSON 格式化", en: "JSON Formatter" },
  "/data/json-validator": { "zh-TW": "JSON 驗證", en: "JSON Validator" },
  "/json": { "zh-TW": "JSON 工具中心", en: "JSON Tool Hub" },
  "/developer/base64-encode": { "zh-TW": "Base64 編碼", en: "Base64 Encode" },
  "/developer/base64-decode": { "zh-TW": "Base64 解碼", en: "Base64 Decode" },
  "/developer/base64": { "zh-TW": "Base64 工具", en: "Base64 Tool" },
  "/developer/url-encode": { "zh-TW": "URL 編碼", en: "URL Encode" },
  "/developer/url-decode": { "zh-TW": "URL 解碼", en: "URL Decode" },
  "/developer/url-encoder": { "zh-TW": "URL 編碼與解碼", en: "URL Encoder / Decoder" },
  "/developer/unix-timestamp": { "zh-TW": "Unix 時間戳轉換", en: "Unix Timestamp Converter" },
  "/text/uuid": { "zh-TW": "UUID 產生器", en: "UUID Generator" },
  "/qr-code": { "zh-TW": "QR Code 產生器", en: "QR Code Generator" },
  "/qr-code/reader": { "zh-TW": "QR Code 讀取器", en: "QR Code Reader" },
  "/text/diff": { "zh-TW": "文字差異比對", en: "Text Diff" },
  "/text/markdown": { "zh-TW": "Markdown 即時預覽", en: "Markdown Preview" },
  "/text/hash": { "zh-TW": "Hash 產生器", en: "Hash Generator" },
};

function buildContent(seed: CopySeed, locale: Locale, relatedPaths: string[]): LandingContent {
  const isEnglish = locale === "en";
  return {
    title: isEnglish
      ? `${seed.h1} — Private Browser Tool | NexaForge`
      : `${seed.h1}｜免安裝、瀏覽器本機處理 | NexaForge`,
    description: seed.description,
    h1: seed.h1,
    intro: isEnglish
      ? `${seed.description} Start immediately without creating an account or sending the source file to NexaForge.`
      : `${seed.description} 不必註冊帳號，開啟頁面即可開始，而且來源檔案不會傳送到 NexaForge。`,
    sections: [
      { heading: seed.featureHeading, body: seed.featureBody },
      { heading: seed.useHeading, body: seed.useBody },
    ],
    steps: [...seed.steps],
    privacy: isEnglish
      ? "Your input is processed locally by the browser on this device. NexaForge does not upload the file or text to its server, which keeps private work under your control."
      : "你選擇的檔案或輸入文字只會在這台裝置的瀏覽器內處理，不會上傳到 NexaForge 伺服器，私密資料與工作內容仍由你掌控。",
    faq: [
      isEnglish
        ? {
            q: "Will NexaForge upload or store my input?",
            a: "No. Processing happens locally in your browser, and NexaForge does not receive or store the source file or text.",
          }
        : {
            q: "NexaForge 會上傳或儲存我的內容嗎？",
            a: "不會。所有處理都在瀏覽器本機完成，NexaForge 不會接收或儲存來源檔案與文字。",
          },
      seed.secondFaq,
    ],
    related: relatedPaths.map((path) => ({
      path,
      label: RELATED_LABELS[path]?.[locale] ?? path,
    })),
  };
}

function definePage(seed: PageSeed): SeoLandingDefinition {
  return {
    path: seed.path,
    toolId: seed.toolId,
    isAlias: seed.isAlias ?? false,
    preset: seed.preset ?? {},
    content: {
      "zh-TW": buildContent(seed.zh, "zh-TW", seed.related),
      en: buildContent(seed.en, "en", seed.related),
    },
  };
}

const ALIAS_PAGE_SEEDS: PageSeed[] = [
  {
    path: "/image/jpg-to-webp",
    toolId: "image-convert",
    isAlias: true,
    preset: { sourceFormat: "jpeg", outputFormat: "webp" },
    related: ["/image/png-to-webp", "/image/webp-to-jpg", "/image/jpg-compress", "/image/resize"],
    zh: {
      h1: "免費線上 JPG 轉 WebP",
      description: "免費將 JPG 圖片轉成 WebP，支援瀏覽器本機處理，不需上傳、不需安裝軟體，也不用註冊帳號。",
      featureHeading: "JPG 轉 WebP 工具特色",
      featureBody: "WebP 通常能在維持良好畫質的同時縮小網頁圖片容量。本工具會直接在瀏覽器讀取 JPG，轉換完成後可立即預覽並下載結果。",
      useHeading: "何時適合使用 WebP",
      useBody: "準備網站商品圖、部落格配圖或作品集圖片時，可先轉成 WebP 以減少傳輸量。原始 JPG 不會被修改，你可以自行比較後再決定使用哪個版本。",
      steps: ["選擇一張 JPG 圖片。", "確認輸出格式為 WebP 並開始轉換。", "預覽結果後下載 WebP 檔案。"],
      secondFaq: { q: "轉成 WebP 會改變原始 JPG 嗎？", a: "不會。工具只會建立新的 WebP 檔案，原始 JPG 仍保留在你的裝置上。" },
    },
    en: {
      h1: "Free Online JPG to WebP Converter",
      description: "Convert JPG images to WebP for free with private, browser-local processing and no upload, installation, or registration.",
      featureHeading: "Why convert JPG to WebP",
      featureBody: "WebP can reduce image transfer size while retaining useful visual quality. This tool reads the JPG in your browser and lets you preview and download the converted result immediately.",
      useHeading: "When WebP is a useful choice",
      useBody: "Use WebP for product photos, blog images, portfolios, and other web assets where smaller downloads matter. Your original JPG remains unchanged so you can compare both versions before publishing.",
      steps: ["Choose one JPG image.", "Keep WebP selected and start conversion.", "Preview and download the new WebP file."],
      secondFaq: { q: "Does conversion replace my original JPG?", a: "No. The tool creates a separate WebP file and leaves the original JPG on your device unchanged." },
    },
  },
  {
    path: "/image/png-to-webp",
    toolId: "image-convert",
    isAlias: true,
    preset: { sourceFormat: "png", outputFormat: "webp" },
    related: ["/image/jpg-to-webp", "/image/webp-to-jpg", "/image/png-compress", "/image/resize"],
    zh: {
      h1: "免費線上 PNG 轉 WebP",
      description: "免費將 PNG 圖片轉成 WebP，所有轉換都在瀏覽器本機完成，不需上傳檔案或安裝桌面軟體。",
      featureHeading: "PNG 轉 WebP 的優點",
      featureBody: "將適合的 PNG 轉為 WebP，可減少網站圖片的下載容量並保留透明背景。工具提供即時預覽，方便在下載前確認輸出結果。",
      useHeading: "適合轉換的 PNG 圖片",
      useBody: "網站圖示、透明商品圖與介面素材通常適合嘗試 WebP。若圖片必須支援較舊的工作流程，也可以保留原始 PNG 作為相容版本。",
      steps: ["選擇一張 PNG 圖片。", "確認 WebP 輸出後執行轉換。", "檢查透明度並下載 WebP。"],
      secondFaq: { q: "透明背景可以保留嗎？", a: "WebP 支援透明度；一般 PNG 透明背景可在轉換後保留，但仍建議下載前查看預覽。" },
    },
    en: {
      h1: "Free Online PNG to WebP Converter",
      description: "Convert PNG images to WebP for free with browser-local processing, no file upload, and no desktop software to install.",
      featureHeading: "Benefits of PNG to WebP conversion",
      featureBody: "Suitable PNG assets can become smaller WebP downloads while retaining transparency. The browser shows a preview so you can inspect the output before saving it.",
      useHeading: "PNG assets that suit WebP",
      useBody: "Website icons, transparent product images, and interface graphics are useful candidates. Keep the original PNG when an older workflow or platform still requires that format.",
      steps: ["Choose one PNG image.", "Keep WebP selected and run conversion.", "Check transparency and download the WebP."],
      secondFaq: { q: "Will a transparent background remain transparent?", a: "WebP supports transparency, so ordinary transparent PNG images can retain it. Check the preview before downloading." },
    },
  },
  {
    path: "/image/webp-to-jpg",
    toolId: "image-convert",
    isAlias: true,
    preset: { sourceFormat: "webp", outputFormat: "jpeg" },
    related: ["/image/jpg-to-webp", "/image/png-to-webp", "/image/jpg-compress", "/image/resize"],
    zh: {
      h1: "免費線上 WebP 轉 JPG",
      description: "免費將 WebP 圖片轉成相容性更廣的 JPG，直接在瀏覽器本機處理，不需上傳或註冊。",
      featureHeading: "快速取得相容的 JPG",
      featureBody: "部分應用程式與舊版工作流程不接受 WebP。轉成 JPG 後，可在更多相片編輯器、文件與分享服務中使用同一張圖片。",
      useHeading: "轉換前需要注意的事項",
      useBody: "JPG 不支援透明背景，因此透明區域在輸出時會被平面化。若仍需要透明度，請改用 PNG，並在下載前先檢查預覽結果。",
      steps: ["選擇一張 WebP 圖片。", "確認 JPG 輸出後開始轉換。", "檢查背景與畫質並下載 JPG。"],
      secondFaq: { q: "透明 WebP 轉成 JPG 會怎樣？", a: "JPG 沒有透明度，透明區域會被平面化；需要透明背景時請選擇 PNG 輸出。" },
    },
    en: {
      h1: "Free Online WebP to JPG Converter",
      description: "Convert WebP images to widely compatible JPG files for free, entirely in your browser with no upload or registration.",
      featureHeading: "Create a broadly compatible JPG",
      featureBody: "Some applications and older workflows do not accept WebP. A JPG copy works with more photo editors, documents, and sharing services while keeping the original WebP intact.",
      useHeading: "What to check before conversion",
      useBody: "JPG does not support transparency, so transparent areas must be flattened. Choose PNG instead when transparency matters, and inspect the preview before downloading the JPG.",
      steps: ["Choose one WebP image.", "Keep JPG selected and start conversion.", "Review the background and quality, then download."],
      secondFaq: { q: "What happens to transparent WebP areas?", a: "JPG has no transparency, so those areas are flattened. Select PNG output when you need a transparent background." },
    },
  },
  {
    path: "/image/heic-to-jpg",
    toolId: "heic-converter",
    isAlias: true,
    preset: { sourceFormat: "heic", outputFormat: "jpeg" },
    related: ["/image/heic-converter", "/image/jpg-compress", "/image/resize", "/image/crop"],
    zh: {
      h1: "免費線上 HEIC 轉 JPG",
      description: "在瀏覽器將 iPhone 常見的 HEIC 或 HEIF 相片轉成 JPG，不需上傳檔案、不需註冊，也不用安裝軟體。",
      featureHeading: "讓 HEIC 相片更容易使用",
      featureBody: "JPG 可在更多網站、文件工具與舊版應用程式中開啟。你可以調整輸出品質，並在下載前查看尺寸與容量差異。",
      useHeading: "適合轉成 JPG 的情境",
      useBody: "需要上傳證件照片、插入簡報或分享給不支援 HEIC 的裝置時，可先建立 JPG 副本。原始 HEIC 相片不會被覆寫。",
      steps: ["選擇 HEIC 或 HEIF 相片。", "確認 JPG 並調整輸出品質。", "完成轉換後預覽並下載。"],
      secondFaq: { q: "可以轉換 iPhone 拍攝的 HEIC 嗎？", a: "可以，工具支援一般 HEIC 與 HEIF 圖片；特殊編碼若無法讀取會顯示明確錯誤。" },
    },
    en: {
      h1: "Free Online HEIC to JPG Converter",
      description: "Convert common iPhone HEIC or HEIF photos to JPG in your browser with no upload, account, or desktop installation.",
      featureHeading: "Make HEIC photos easier to use",
      featureBody: "JPG opens in more websites, document tools, and older applications. You can choose output quality and review the file-size comparison before downloading.",
      useHeading: "When a JPG copy helps",
      useBody: "Create a JPG before uploading an ID photo, inserting an image into a presentation, or sharing with a device that lacks HEIC support. The source photo is never overwritten.",
      steps: ["Choose a HEIC or HEIF photo.", "Keep JPG selected and choose output quality.", "Convert, preview, and download the JPG."],
      secondFaq: { q: "Can it convert HEIC photos from an iPhone?", a: "Yes. Common HEIC and HEIF images are supported; an unsupported special encoding produces a clear error." },
    },
  },
  {
    path: "/image/jpg-compress",
    toolId: "image-compress",
    isAlias: true,
    preset: { sourceFormat: "jpeg", outputFormat: "jpeg" },
    related: ["/image/png-compress", "/image/jpg-to-webp", "/image/resize", "/image/crop"],
    zh: {
      h1: "免費線上 JPG 圖片壓縮",
      description: "批次壓縮 JPG 圖片並自行調整畫質，所有處理都在瀏覽器本機完成，不上傳檔案也不需註冊。",
      featureHeading: "控制 JPG 畫質與容量",
      featureBody: "你可以用畫質滑桿在清晰度與檔案大小之間取得平衡。單張結果可預覽，多張圖片則能整理後一次下載。",
      useHeading: "適合壓縮 JPG 的情境",
      useBody: "寄送附件、準備網站照片或縮小表單上傳檔案時，JPG 壓縮能快速降低容量。請保留原檔，以便日後需要最高畫質時使用。",
      steps: ["選擇一張或多張 JPG。", "調整畫質並確認 JPG 輸出。", "比較結果後單獨或批次下載。"],
      secondFaq: { q: "壓縮會降低圖片畫質嗎？", a: "JPG 是有損格式，較低畫質通常會縮小更多容量；可先預覽再選擇合適設定。" },
    },
    en: {
      h1: "Free Online JPG Image Compressor",
      description: "Compress JPG images in batches with adjustable quality, entirely in your browser with no upload, registration, or installation.",
      featureHeading: "Balance JPG quality and file size",
      featureBody: "Use the quality control to balance visual detail against download size. Preview a single result or collect multiple processed images for one convenient download.",
      useHeading: "When to compress JPG files",
      useBody: "Reduce photos for email attachments, website publishing, or upload limits. Keep the originals separately so maximum-quality copies remain available for later editing.",
      steps: ["Choose one or more JPG images.", "Adjust quality and keep JPG output selected.", "Compare and download individual files or the batch."],
      secondFaq: { q: "Does JPG compression reduce image quality?", a: "JPG is lossy, so lower quality usually creates a smaller file. Preview the result before choosing your setting." },
    },
  },
  {
    path: "/image/png-compress",
    toolId: "image-compress",
    isAlias: true,
    preset: { sourceFormat: "png", outputFormat: "png" },
    related: ["/image/jpg-compress", "/image/png-to-webp", "/image/resize", "/image/crop"],
    zh: {
      h1: "免費線上 PNG 圖片壓縮",
      description: "批次壓縮 PNG 圖片並保留 PNG 輸出，直接在瀏覽器本機處理，不需上傳檔案或建立帳號。",
      featureHeading: "在本機縮小 PNG 圖片",
      featureBody: "工具會重新編碼選取的 PNG，提供處理前後容量比較與批次下載。透明背景可繼續使用，但實際縮減幅度取決於圖片內容。",
      useHeading: "PNG 壓縮與格式選擇",
      useBody: "圖示、截圖與透明素材通常需要保留 PNG。若網站傳輸容量更重要，也可以比較 PNG 轉 WebP 的結果，再選擇合適格式。",
      steps: ["選擇一張或多張 PNG。", "保留 PNG 輸出並開始處理。", "檢查透明度與容量後下載。"],
      secondFaq: { q: "壓縮後還會保留透明背景嗎？", a: "PNG 輸出支援透明度；建議在下載前查看預覽，確認結果符合素材需求。" },
    },
    en: {
      h1: "Free Online PNG Image Compressor",
      description: "Compress PNG images in batches while keeping PNG output, with private browser-local processing and no file upload or account.",
      featureHeading: "Reduce PNG files locally",
      featureBody: "The tool re-encodes selected PNG images and shows before-and-after file sizes with batch download. Transparency remains available, while savings depend on image content.",
      useHeading: "Choosing PNG compression or another format",
      useBody: "Icons, screenshots, and transparent assets often need to remain PNG. When web transfer size matters more, compare a PNG-to-WebP result before choosing the final format.",
      steps: ["Choose one or more PNG images.", "Keep PNG output selected and process them.", "Inspect transparency and size, then download."],
      secondFaq: { q: "Will the compressed PNG keep transparency?", a: "PNG output supports transparency. Inspect the preview before download to confirm it suits your asset." },
    },
  },
  {
    path: "/data/json-validator",
    toolId: "json-formatter",
    isAlias: true,
    preset: { mode: "validate" },
    related: ["/data/json-formatter", "/json", "/developer/base64-decode", "/text/diff"],
    zh: {
      h1: "免費線上 JSON 驗證器",
      description: "貼上或載入 JSON 後立即檢查語法問題，內容只在瀏覽器本機解析，不會傳送到伺服器。",
      featureHeading: "快速找出 JSON 語法錯誤",
      featureBody: "驗證器會解析輸入內容並在問題附近顯示錯誤資訊。修正後可以再次驗證，也能切換到格式化檢視確認巢狀結構。",
      useHeading: "適合驗證 JSON 的時機",
      useBody: "處理 API 範例、設定檔或除錯資料交換格式時，先驗證能避免缺少引號、逗號或括號造成後續程式失敗。",
      steps: ["貼上 JSON 或選擇本機檔案。", "執行驗證並閱讀錯誤提示。", "修正內容後再次檢查或格式化。"],
      secondFaq: { q: "驗證器會修改原始 JSON 嗎？", a: "不會。只有在你主動選擇格式化或壓縮時才產生新的輸出內容。" },
    },
    en: {
      h1: "Free Online JSON Validator",
      description: "Paste or load JSON and check syntax immediately while all parsing stays local in your browser and never reaches a server.",
      featureHeading: "Find JSON syntax errors quickly",
      featureBody: "The validator parses your input and reports useful information near a problem. Correct the source and validate again, or switch to formatted output to inspect nested structure.",
      useHeading: "When JSON validation helps",
      useBody: "Validate API examples, configuration files, and exchanged data before use. It catches missing quotes, commas, and brackets that would otherwise break a later program or request.",
      steps: ["Paste JSON or choose a local file.", "Run validation and read any reported issue.", "Correct the source, then validate or format it again."],
      secondFaq: { q: "Does validation change the original JSON?", a: "No. New output is only created when you explicitly choose a formatting or minifying action." },
    },
  },
  {
    path: "/developer/base64-encode",
    toolId: "base64",
    isAlias: true,
    preset: { mode: "textToBase64" },
    related: ["/developer/base64-decode", "/developer/url-encode", "/data/json-formatter", "/text/uuid"],
    zh: {
      h1: "免費線上 Base64 編碼",
      description: "將文字或檔案轉成 Base64，編碼過程只在瀏覽器本機執行，不需上傳內容或註冊帳號。",
      featureHeading: "快速建立 Base64 內容",
      featureBody: "可將一般文字轉成 Base64，也能讀取本機檔案並產生編碼結果。完成後可直接複製文字或下載保存。",
      useHeading: "Base64 編碼的常見用途",
      useBody: "開發者常用 Base64 表示二進位內容、測試資料或嵌入式資源。它不是加密方式，敏感內容仍應使用真正的加密與權限控制。",
      steps: ["輸入文字或切換到檔案模式。", "執行 Base64 編碼。", "複製或下載產生的結果。"],
      secondFaq: { q: "Base64 可以保護機密資料嗎？", a: "不可以。Base64 只是可逆的表示方式，不提供加密或存取保護。" },
    },
    en: {
      h1: "Free Online Base64 Encoder",
      description: "Convert text or a file to Base64 while encoding stays entirely in your browser, with no upload, registration, or account required.",
      featureHeading: "Create Base64 content quickly",
      featureBody: "Encode ordinary text or read a local file and produce its Base64 representation. Copy the output immediately or download it for later use.",
      useHeading: "Common Base64 encoding uses",
      useBody: "Developers use Base64 for binary representations, test fixtures, and embedded resources. It is not encryption, so sensitive information still requires real access control and cryptography.",
      steps: ["Enter text or switch to file mode.", "Run Base64 encoding in the browser.", "Copy or download the generated output."],
      secondFaq: { q: "Does Base64 protect confidential data?", a: "No. Base64 is a reversible representation and provides no encryption or access protection." },
    },
  },
  {
    path: "/developer/base64-decode",
    toolId: "base64",
    isAlias: true,
    preset: { mode: "base64ToText" },
    related: ["/developer/base64-encode", "/developer/url-decode", "/data/json-validator", "/text/hash"],
    zh: {
      h1: "免費線上 Base64 解碼",
      description: "將 Base64 內容還原成可閱讀文字，直接在瀏覽器本機解碼，不需將資料貼到外部伺服器。",
      featureHeading: "立即檢視 Base64 文字",
      featureBody: "貼上編碼字串即可在本機還原 UTF-8 文字，結果可直接複製或下載。無效內容會顯示錯誤，不會默默產生錯誤輸出。",
      useHeading: "解碼前需要確認的事項",
      useBody: "Base64 可能表示文字或二進位檔案；本頁適合解碼文字內容。請只處理你信任的來源，並在使用結果前確認內容與用途。",
      steps: ["貼上要處理的 Base64 字串。", "確認解碼模式並執行。", "檢查後複製或下載文字。"],
      secondFaq: { q: "所有 Base64 都能變成文字嗎？", a: "不一定。若原始內容是二進位檔案，文字解碼結果可能不可讀或無法正確顯示。" },
    },
    en: {
      h1: "Free Online Base64 Decoder",
      description: "Decode Base64 into readable text locally in your browser without pasting private data into an external server or creating an account.",
      featureHeading: "Inspect Base64 text immediately",
      featureBody: "Paste an encoded value to recover UTF-8 text locally, then copy or download the result. Invalid content produces an error instead of silently returning misleading output.",
      useHeading: "What to know before decoding",
      useBody: "Base64 can represent text or binary files; this page is intended for textual content. Process sources you trust and verify decoded information before using it elsewhere.",
      steps: ["Paste the Base64 value to inspect.", "Keep decode mode selected and run it.", "Review, copy, or download the recovered text."],
      secondFaq: { q: "Can every Base64 value become readable text?", a: "No. A value representing a binary file may be unreadable or unsuitable for text decoding." },
    },
  },
  {
    path: "/developer/url-encode",
    toolId: "url-encoder",
    isAlias: true,
    preset: { mode: "encode" },
    related: ["/developer/url-decode", "/developer/base64-encode", "/developer/unix-timestamp", "/text/uuid"],
    zh: {
      h1: "免費線上 URL 編碼",
      description: "將文字轉成安全的 URL component 編碼，直接在瀏覽器完成，不會上傳查詢參數或路徑內容。",
      featureHeading: "建立可用的 URL 編碼字串",
      featureBody: "工具使用標準瀏覽器編碼規則處理空白、非 ASCII 字元與保留符號，適合準備查詢參數值或路徑片段。",
      useHeading: "URL 編碼的使用時機",
      useBody: "當搜尋詞、檔名或其他使用者輸入要放入網址時，應先編碼個別 component。完整網址的結構符號通常不應整段一起編碼。",
      steps: ["貼上要放入網址的文字。", "確認編碼模式後執行。", "複製產生的 URL component。"],
      secondFaq: { q: "可以直接編碼完整網址嗎？", a: "本工具針對 URL component；完整網址包含結構符號，通常應只編碼其中的值。" },
    },
    en: {
      h1: "Free Online URL Encoder",
      description: "Convert text into a safe URL-component encoding directly in your browser without uploading query values or path content.",
      featureHeading: "Create a valid URL-encoded value",
      featureBody: "Standard browser encoding handles spaces, non-ASCII characters, and reserved symbols. It is useful when preparing a query value or individual path segment.",
      useHeading: "When URL encoding is required",
      useBody: "Encode search terms, filenames, and other user input before placing them in a URL. Structural characters in a complete URL usually should not be encoded as one block.",
      steps: ["Paste the text for a URL value.", "Keep encode mode selected and run it.", "Copy the generated URL component."],
      secondFaq: { q: "Should I encode an entire URL at once?", a: "This tool targets URL components. A complete URL contains structural characters, so normally encode only its values." },
    },
  },
  {
    path: "/developer/url-decode",
    toolId: "url-encoder",
    isAlias: true,
    preset: { mode: "decode" },
    related: ["/developer/url-encode", "/developer/base64-decode", "/developer/unix-timestamp", "/data/json-validator"],
    zh: {
      h1: "免費線上 URL 解碼",
      description: "將百分比編碼的 URL component 還原成可閱讀文字，所有內容只在瀏覽器本機處理。",
      featureHeading: "快速讀懂 URL 編碼內容",
      featureBody: "貼上 `%E4%BD%A0%E5%A5%BD` 這類內容即可還原文字，方便檢查查詢參數、重新導向網址或應用程式記錄。",
      useHeading: "安全檢查解碼結果",
      useBody: "解碼只會轉換字元表示，不代表網址安全。開啟陌生連結前，仍應檢查網域、參數與導向目的，避免把可閱讀結果當成信任依據。",
      steps: ["貼上百分比編碼的字串。", "確認解碼模式並執行。", "檢查後複製還原文字。"],
      secondFaq: { q: "URL 解碼能判斷連結是否安全嗎？", a: "不能。它只還原字元，是否安全仍需檢查網域、參數與實際導向。" },
    },
    en: {
      h1: "Free Online URL Decoder",
      description: "Turn percent-encoded URL components back into readable text while all content stays local in your browser.",
      featureHeading: "Read URL-encoded content quickly",
      featureBody: "Paste a value such as `%E4%BD%A0%E5%A5%BD` to recover readable text when inspecting query parameters, redirects, or application logs.",
      useHeading: "Review decoded values safely",
      useBody: "Decoding changes character representation but does not prove a URL is safe. Check domains, parameters, and redirect destinations before opening an unfamiliar link.",
      steps: ["Paste the percent-encoded value.", "Keep decode mode selected and run it.", "Inspect and copy the recovered text."],
      secondFaq: { q: "Can URL decoding tell me whether a link is safe?", a: "No. It only restores characters; you must still inspect the domain, parameters, and destination." },
    },
  },
];

const EXISTING_PAGE_SEEDS: PageSeed[] = [
  ["/image/resize", "image-resize", "免費線上調整圖片尺寸", "Free Online Image Resizer", "依指定寬高批次縮放 JPG、PNG 與 WebP，支援維持比例與輸出畫質設定，全程在瀏覽器本機處理。", "Resize JPG, PNG, and WebP images in batches with aspect-ratio and quality controls, entirely in your browser.", ["/image/crop", "/image/jpg-compress", "/image/png-compress", "/image/jpg-to-webp"]],
  ["/image/crop", "image-crop", "免費線上裁切圖片", "Free Online Image Cropper", "使用矩形、圓形、比例預設或自訂形狀裁切圖片，預覽與輸出都在瀏覽器本機完成，開啟頁面即可使用。", "Crop images with rectangles, circles, aspect presets, or custom shapes while preview and export stay local.", ["/image/resize", "/image/jpg-compress", "/image/png-compress", "/image/convert"]],
  ["/pdf/merge", "pdf-merge", "免費線上合併 PDF", "Free Online PDF Merger", "依照指定順序合併多份 PDF，文件只在瀏覽器本機讀取與輸出，不需上傳到遠端服務，也不用建立帳號。", "Merge multiple PDF files in your chosen order while every document remains local in your browser.", ["/pdf/split", "/pdf/rotate", "/image/jpg-compress", "/text/markdown"]],
  ["/pdf/split", "pdf-split", "免費線上分割 PDF", "Free Online PDF Splitter", "選取需要的頁碼並匯出新的 PDF，原始文件只在瀏覽器本機處理，不會傳送到伺服器，也不用建立帳號。", "Select pages and export a new PDF while the source document stays entirely in your browser.", ["/pdf/merge", "/pdf/rotate", "/image/jpg-compress", "/text/markdown"]],
  ["/pdf/rotate", "pdf-rotate", "免費線上旋轉 PDF", "Free Online PDF Rotator", "將 PDF 頁面旋轉 90、180 或 270 度並下載新檔，文件不需上傳或註冊帳號。", "Rotate PDF pages by 90, 180, or 270 degrees and download a new file without uploading the document.", ["/pdf/merge", "/pdf/split", "/image/crop", "/text/markdown"]],
  ["/data/json-formatter", "json-formatter", "免費線上 JSON 格式化", "Free Online JSON Formatter", "格式化、壓縮並檢查 JSON，支援文字與本機檔案輸入，資料不會離開你的瀏覽器，也不需註冊。", "Format, minify, and inspect JSON from text or a local file without sending data outside your browser.", ["/data/json-validator", "/json", "/text/diff", "/developer/base64-decode"]],
  ["/text/uuid", "uuid", "免費線上 UUID 產生器", "Free Online UUID Generator", "批次產生 UUID v4、UUID v7 或相容 .NET Guid 的識別碼，可調整大小寫與格式，結果全程留在瀏覽器。", "Generate UUID v4, UUID v7, or .NET Guid-compatible identifiers in batches with configurable case and formatting, entirely in your browser.", ["/developer/unix-timestamp", "/developer/base64-encode", "/text/hash", "/data/json-formatter"]],
  ["/developer/unix-timestamp", "unix-timestamp", "免費 Unix 時間戳轉換器", "Free Unix Timestamp Converter", "在 Unix 秒數、毫秒與日期時間之間轉換，輸入內容只在瀏覽器本機計算與顯示，不會傳送到伺服器。", "Convert Unix seconds or milliseconds and readable dates while every value stays local in your browser.", ["/text/uuid", "/developer/url-encode", "/developer/url-decode", "/data/json-formatter"]],
  ["/qr-code", "qr-code", "免費線上 QR Code 產生器", "Free Online QR Code Generator", "將文字或網址製作成可下載的 QR Code，尺寸與容錯等級可調，資料不會上傳到伺服器。", "Create a downloadable QR code from text or a URL with adjustable size and error correction, entirely locally.", ["/qr-code/reader", "/developer/url-encode", "/text/uuid", "/text/markdown"]],
  ["/text/diff", "text-diff", "免費線上文字差異比對", "Free Online Text Diff", "並排輸入兩段文字並查看逐行差異，適合比較設定、草稿或程式片段，內容只在本機處理，不會上傳。", "Compare two blocks of text line by line for configs, drafts, or code snippets without uploading either side.", ["/data/json-formatter", "/data/json-validator", "/text/markdown", "/developer/url-decode"]],
  ["/text/markdown", "markdown-previewer", "免費線上 Markdown 即時預覽", "Free Online Markdown Preview", "輸入 Markdown 並即時查看渲染結果，適合整理 README、說明文件與文章草稿，內容不會上傳。", "Write Markdown and preview the rendered result for README files, documentation, and drafts without uploading content.", ["/text/diff", "/data/json-formatter", "/developer/base64-encode", "/qr-code"]],
].map(([path, toolId, zhH1, enH1, zhDescription, enDescription, related]) => ({
  path: path as string,
  toolId: toolId as string,
  related: related as [string, string, string, string],
  zh: {
    h1: zhH1 as string,
    description: zhDescription as string,
    featureHeading: `${zhH1 as string}的實用特色`,
    featureBody: `${zhDescription as string} 完成後會保留原始輸入，讓你先檢查結果再決定是否下載與使用。`,
    useHeading: `何時適合使用${(zhH1 as string).replace("免費線上", "")}`,
    useBody: `需要快速完成一次性工作、避免安裝大型軟體，或不希望把內容交給第三方服務時，這項工具能提供清楚且可重複的本機流程。`,
    steps: ["準備並輸入要處理的內容。", "確認選項後執行主要操作。", "檢查結果並複製或下載。"],
    secondFaq: { q: "使用這項工具需要註冊嗎？", a: "不需要。開啟頁面即可使用，處理與結果都保留在目前瀏覽器工作階段。" },
  },
  en: {
    h1: enH1 as string,
    description: enDescription as string,
    featureHeading: `Practical features of ${enH1 as string}`,
    featureBody: `${enDescription as string} The original input remains available so you can inspect the result before deciding to save or use it.`,
    useHeading: `When to use ${enH1 as string}`,
    useBody: "Use this focused workflow for quick one-off work, when installing a large desktop application is unnecessary, or when sending content to a third-party service is undesirable.",
    steps: ["Prepare and enter the content to process.", "Review the options and run the primary action.", "Inspect the result, then copy or download it."],
    secondFaq: { q: "Do I need to register before using this tool?", a: "No. Open the page and start immediately; processing and results remain in the current browser session." },
  },
}));

export const SEO_SEARCH_PAGES: readonly SeoLandingDefinition[] = [
  ...ALIAS_PAGE_SEEDS.map(definePage),
  ...EXISTING_PAGE_SEEDS.map(definePage),
];

export const SEO_ALIAS_PAGES = SEO_SEARCH_PAGES.filter(({ isAlias }) => isAlias);

export function findSeoLanding(path: string): SeoLandingDefinition | undefined {
  const basePath = stripLocalePrefix(path.split(/[?#]/, 1)[0] || "/");
  return SEO_SEARCH_PAGES.find((entry) => entry.path === basePath);
}

export function getSeoLandingContent(path: string, locale: Locale): LandingContent | undefined {
  return findSeoLanding(path)?.content[locale];
}
