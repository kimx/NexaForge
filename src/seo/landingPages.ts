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
  title?: string;
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
  "/pdf/reorder-pages": { "zh-TW": "重新排序 PDF 頁面", en: "Reorder PDF Pages" },
  "/pdf/delete-pages": { "zh-TW": "刪除 PDF 頁面", en: "Delete PDF Pages" },
  "/pdf/extract-pages": { "zh-TW": "擷取 PDF 頁面", en: "Extract PDF Pages" },
  "/pdf/add-page-numbers": { "zh-TW": "為 PDF 加入頁碼", en: "Add Page Numbers to PDF" },
  "/pdf/watermark": { "zh-TW": "為 PDF 加入浮水印", en: "Add Watermark to PDF" },
  "/data/json-formatter": { "zh-TW": "JSON 格式化", en: "JSON Formatter" },
  "/data/jsonpath-tester": { "zh-TW": "JSONPath Tester", en: "JSONPath Tester" },
  "/data/json-validator": { "zh-TW": "JSON 驗證", en: "JSON Validator" },
  "/data/json-diff": { "zh-TW": "JSON Diff", en: "JSON Diff" },
  "/data/json-to-csv": { "zh-TW": "JSON 轉 CSV", en: "JSON to CSV" },
  "/data/json-xml": { "zh-TW": "JSON ↔ XML", en: "JSON ↔ XML" },
  "/data/yaml-json": { "zh-TW": "YAML ↔ JSON", en: "YAML ↔ JSON" },
  "/json": { "zh-TW": "JSON 工具中心", en: "JSON Tool Hub" },
  "/developer/json-to-typescript": { "zh-TW": "JSON 轉 TypeScript", en: "JSON to TypeScript" },
  "/developer/json-to-csharp": { "zh-TW": "JSON 轉 C#", en: "JSON to C#" },
  "/developer/base64-encode": { "zh-TW": "Base64 編碼", en: "Base64 Encode" },
  "/developer/base64-decode": { "zh-TW": "Base64 解碼", en: "Base64 Decode" },
  "/developer/base64": { "zh-TW": "Base64 工具", en: "Base64 Tool" },
  "/developer/url-encode": { "zh-TW": "URL 編碼", en: "URL Encode" },
  "/developer/url-decode": { "zh-TW": "URL 解碼", en: "URL Decode" },
  "/developer/url-parser": { "zh-TW": "URL Parser", en: "URL Parser" },
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
    title: seed.title ?? (isEnglish
      ? `${seed.h1} — Private Browser Tool | NexaForge`
      : `${seed.h1}｜免安裝、瀏覽器本機處理 | NexaForge`),
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
  {
    path: "/developer/url-encode-decode",
    toolId: "url-encoder",
    isAlias: true,
    related: ["/developer/url-parser", "/developer/url-encode", "/developer/url-decode", "/developer/base64"],
    zh: {
      title: "URL Encoder / Decoder Online｜NexaForge",
      h1: "URL 編碼與解碼",
      description: "線上進行 URL 與 URI component 百分比編碼、解碼，支援中文、Emoji 與查詢字串，所有內容只在瀏覽器本機處理。",
      featureHeading: "支援 Component 與完整網址模式",
      featureBody: "Component 模式使用 encodeURIComponent 與 decodeURIComponent；完整網址模式使用 encodeURI 與 decodeURI，能保留網址結構符號並正確處理 Unicode。",
      useHeading: "URL 編碼與解碼的常見用途",
      useBody: "準備查詢參數、檢查重導向網址或閱讀應用程式記錄時，可在不傳送資料的情況下快速轉換百分比編碼內容。",
      steps: ["貼上要處理的文字或網址。", "選擇 Component 或完整網址模式，再按編碼或解碼。", "檢查結果並複製；需要重新開始時按清空。"],
      secondFaq: { q: "輸入內容會傳到伺服器嗎？", a: "不會。編碼與解碼使用瀏覽器內建 API 在本機完成，輸入文字不會送到伺服器或分析服務。" },
    },
    en: {
      title: "URL Encoder / Decoder Online | NexaForge",
      h1: "URL Encoder / Decoder",
      description: "Encode and decode URLs and URI components online with encodeURIComponent, decodeURIComponent, encodeURI, and decodeURI. Unicode, Chinese, emoji, and query strings stay in your browser.",
      featureHeading: "Component and full URL modes",
      featureBody: "Component mode uses encodeURIComponent and decodeURIComponent for individual values. Full URL mode uses encodeURI and decodeURI while preserving the structure of a complete URL.",
      useHeading: "When to encode or decode a URL",
      useBody: "Convert query values, inspect redirect URLs, or read application logs without sending the source text to a server. Choose component mode for values and full URL mode for complete URLs.",
      steps: ["Paste the text, query value, or URL to process.", "Choose Component or Full URL, then click Encode or Decode.", "Review and copy the result, or click Clear to start over."],
      secondFaq: { q: "Is my input sent to a server or analytics service?", a: "No. The browser's built-in URL APIs perform every conversion locally, and the entered text is never sent to a server or analytics service." },
    },
  },
];

const EXISTING_PAGE_SEEDS: PageSeed[] = [
  ["/image/resize", "image-resize", "免費線上調整圖片尺寸", "Free Online Image Resizer", "依指定寬高批次縮放 JPG、PNG 與 WebP，支援維持比例與輸出畫質設定，全程在瀏覽器本機處理。", "Resize JPG, PNG, and WebP images in batches with aspect-ratio and quality controls, entirely in your browser.", ["/image/crop", "/image/jpg-compress", "/image/png-compress", "/image/jpg-to-webp"]],
  ["/image/crop", "image-crop", "免費線上裁切圖片", "Free Online Image Cropper", "使用矩形、圓形、比例預設或自訂形狀裁切圖片，預覽與輸出都在瀏覽器本機完成，開啟頁面即可使用。", "Crop images with rectangles, circles, aspect presets, or custom shapes while preview and export stay local.", ["/image/resize", "/image/jpg-compress", "/image/png-compress", "/image/convert"]],
  ["/pdf/merge", "pdf-merge", "免費線上合併 PDF", "Free Online PDF Merger", "依照指定順序合併多份 PDF，文件只在瀏覽器本機讀取與輸出，不需上傳到遠端服務，也不用建立帳號。", "Merge multiple PDF files in your chosen order while every document remains local in your browser.", ["/pdf/reorder-pages", "/pdf/delete-pages", "/pdf/rotate", "/pdf/split"]],
  ["/pdf/split", "pdf-split", "免費線上分割 PDF", "Free Online PDF Splitter", "選取需要的頁碼並匯出新的 PDF，原始文件只在瀏覽器本機處理，不會傳送到伺服器，也不用建立帳號。", "Select pages and export a new PDF while the source document stays entirely in your browser.", ["/pdf/merge", "/pdf/rotate", "/image/jpg-compress", "/text/markdown"]],
  ["/pdf/rotate", "pdf-rotate", "免費線上旋轉 PDF", "Free Online PDF Rotator", "將 PDF 頁面旋轉 90、180 或 270 度並下載新檔，文件不需上傳或註冊帳號。", "Rotate PDF pages by 90, 180, or 270 degrees and download a new file without uploading the document.", ["/pdf/merge", "/pdf/split", "/image/crop", "/text/markdown"]],
  ["/data/json-formatter", "json-formatter", "免費線上 JSON 格式化", "Free Online JSON Formatter", "格式化、壓縮並檢查 JSON，支援文字與本機檔案輸入，資料不會離開你的瀏覽器，也不需註冊。", "Format, minify, and inspect JSON from text or a local file without sending data outside your browser.", ["/data/json-validator", "/json", "/text/diff", "/developer/base64-decode"]],
  ["/text/uuid", "uuid", "免費線上 UUID 產生器", "Free Online UUID Generator", "批次產生 UUID v4、UUID v7 或相容 .NET Guid 的識別碼，可調整大小寫與格式，結果全程留在瀏覽器。", "Generate UUID v4, UUID v7, or .NET Guid-compatible identifiers in batches with configurable case and formatting, entirely in your browser.", ["/developer/unix-timestamp", "/developer/base64-encode", "/text/hash", "/data/json-formatter"]],
  ["/developer/unix-timestamp", "unix-timestamp", "免費 Unix 時間戳轉換器", "Free Unix Timestamp Converter", "在 Unix 秒數、毫秒與日期時間之間轉換，輸入內容只在瀏覽器本機計算與顯示，不會傳送到伺服器。", "Convert Unix seconds or milliseconds and readable dates while every value stays local in your browser.", ["/text/uuid", "/developer/url-encode", "/developer/url-decode", "/data/json-formatter"]],
  ["/qr-code", "qr-code", "免費線上 QR Code 產生器", "Free Online QR Code Generator", "將文字或網址製作成可下載的 QR Code，尺寸與容錯等級可調，資料不會上傳到伺服器。", "Create a downloadable QR code from text or a URL with adjustable size and error correction, entirely locally.", ["/qr-code/reader", "/developer/url-encode", "/text/uuid", "/text/markdown"]],
  ["/text/text-cleaner", "text-cleaner", "免費線上文字清理工具", "Text Cleaner Online", "清理多餘空白、定位字元與空行，所有文字都只在瀏覽器本機完成處理，不會上傳到伺服器，也不需要註冊帳號。", "Clean whitespace, tabs, and blank lines locally in your browser without uploading text or registering.", ["/text/find-replace", "/text/remove-duplicate-lines", "/text/sort-lines", "/text/diff"]],
  ["/text/find-replace", "find-replace", "免費線上尋找與取代", "Find and Replace Text Online", "在瀏覽器中尋找與取代一般文字或正則表達式，所有輸入與結果都會留在本機，不會上傳到伺服器，也不需要註冊帳號。", "Find and replace literal text or regular expressions in your browser without uploading content or registering.", ["/text/diff", "/text/text-cleaner", "/text/word-counter", "/developer/regex-tester"]],
  ["/text/diff", "text-diff", "免費線上文字比對", "Compare Text Online", "並排輸入兩段文字並查看逐行差異，適合比較設定、草稿或程式片段，內容只在本機處理，不會上傳。", "Compare two blocks of text line by line for configs, drafts, or code snippets without uploading either side.", ["/text/text-cleaner", "/text/remove-duplicate-lines", "/text/sort-lines", "/text/find-replace"]],
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

const UNIX_TIMESTAMP_LANDING: SeoLandingDefinition = {
  path: "/developer/unix-timestamp",
  toolId: "unix-timestamp",
  isAlias: false,
  preset: {},
  content: {
    "zh-TW": {
      title: "Unix 時間戳轉換工具｜Epoch 時間轉換器 | NexaForge",
      description: "免費 Unix timestamp converter，支援秒、毫秒、日期時間互相轉換，Local 與 UTC 顯示都在瀏覽器本機完成。",
      h1: "Unix 時間戳轉換器",
      intro: "在 Unix 秒數、毫秒與日期時間之間雙向轉換，並清楚查看 Local、UTC、ISO 8601 與相對時間。",
      sections: [
        {
          heading: "秒與毫秒的時間戳轉換",
          body: "自動模式會將 10 位數判斷為秒、13 位數判斷為毫秒。其他長度可手動指定單位，也能處理 1970 年以前的負數時間戳。",
        },
        {
          heading: "日期轉時間戳",
          body: "輸入日期、時間與 Local 或 UTC 時區，立即取得 Unix seconds 與 Unix milliseconds。Local 使用這台裝置的瀏覽器時區。",
        },
      ],
      steps: [
        "輸入 Unix 秒數或毫秒，或填寫日期、時間與時區。",
        "確認單位或時區後執行轉換。",
        "檢查 Local、UTC、ISO 8601、相對時間或時間戳結果。",
      ],
      privacy: "所有計算都在這台裝置的瀏覽器本機完成，不會將輸入內容傳送或儲存於 NexaForge 伺服器。",
      faq: [
        { q: "這個工具會使用伺服器時間嗎？", a: "不會。Current Timestamp 與相對時間都使用目前瀏覽器的時間。" },
        { q: "如何判斷輸入是秒還是毫秒？", a: "自動模式會將 10 位數判斷為秒、13 位數判斷為毫秒；其他數值可手動選擇。" },
        { q: "可以處理 1970 年以前的日期嗎？", a: "可以。瀏覽器 Date 支援 Unix epoch 以前的負數秒數與毫秒數。" },
      ],
      related: [
        { path: "/text/uuid", label: "UUID 產生器" },
        { path: "/developer/url-encode", label: "URL 編碼" },
        { path: "/developer/url-decode", label: "URL 解碼" },
        { path: "/data/json-formatter", label: "JSON 格式化" },
      ],
    },
    en: {
      title: "Unix Timestamp Converter – Epoch Time Converter | NexaForge",
      description: "Free Unix timestamp converter for seconds, milliseconds, and date-time values with Local and UTC output processed in your browser.",
      h1: "Unix Timestamp Converter",
      intro: "Convert Unix seconds, milliseconds, and date-time values in both directions with clear Local, UTC, ISO 8601, and relative-time output.",
      sections: [
        {
          heading: "Convert seconds and milliseconds",
          body: "Auto-detect treats 10 digits as seconds and 13 digits as milliseconds. Choose a unit manually for other lengths, including negative timestamps before 1970.",
        },
        {
          heading: "Convert a date to a timestamp",
          body: "Enter a date, time, and either Local or UTC to get Unix seconds and Unix milliseconds. Local uses this device's browser timezone.",
        },
      ],
      steps: [
        "Enter Unix seconds or milliseconds, or provide a date, time, and timezone.",
        "Confirm the unit or timezone, then run the conversion.",
        "Review Local, UTC, ISO 8601, relative time, or timestamp output.",
      ],
      privacy: "Every calculation runs locally in this browser. Your input is not sent to or stored by NexaForge servers.",
      faq: [
        { q: "Does this tool use server time?", a: "No. Current Timestamp and relative time use the current clock in this browser." },
        { q: "How does it distinguish seconds from milliseconds?", a: "Auto-detect treats 10 digits as seconds and 13 digits as milliseconds. Choose a unit manually for other values." },
        { q: "Can it handle dates before 1970?", a: "Yes. The browser Date API supports negative seconds and milliseconds before the Unix epoch." },
      ],
      related: [
        { path: "/text/uuid", label: "UUID Generator" },
        { path: "/developer/url-encode", label: "URL Encoder" },
        { path: "/developer/url-decode", label: "URL Decoder" },
        { path: "/data/json-formatter", label: "JSON Formatter" },
      ],
    },
  },
};

const JSON_DIFF_LANDING: SeoLandingDefinition = {
  path: "/data/json-diff",
  toolId: "json-diff",
  isAlias: false,
  preset: {},
  content: {
    "zh-TW": {
      title: "JSON Diff 線上比較工具｜比較 JSON 差異 - NexaForge",
      description: "免費線上 JSON Diff 工具，比較兩份 JSON 的新增、刪除與修改內容。所有 JSON 都在瀏覽器本機處理，不會上傳伺服器。",
      h1: "JSON Diff 線上比較工具",
      intro: "JSON Diff 會以資料結構比較兩份 JSON，協助你在 API 開發、設定檔檢查與測試資料驗證時快速找出真正變動的欄位。",
      sections: [
        {
          heading: "JSON Diff 是什麼？",
          body: "JSON Diff 是用來比較兩份 JSON 文件的工具，會分別標示新增、刪除、修改與未變更的欄位，並顯示對應的 JSON Path。",
        },
        {
          heading: "Object 與 Array 如何比較？",
          body: "Object 的 key 順序不會造成差異；Array 則依 index 比較，因此相同元素的順序不同會被視為修改。",
        },
      ],
      steps: ["在左側貼上原始 JSON。", "在右側貼上修改後 JSON。", "選擇「比較 JSON」查看結構化差異。"],
      privacy: "你的 JSON 只會在瀏覽器本機處理，不會傳送至伺服器，也不會加入網址或分析事件。",
      faq: [
        { q: "JSON Diff 會上傳我的資料嗎？", a: "不會，所有 JSON 比較都在瀏覽器本機完成。" },
        { q: "JSON 欄位順序不同會被判定為差異嗎？", a: "不會，Object key 順序不影響比較結果。" },
        { q: "Array 順序不同會被判定為差異嗎？", a: "會，第一版依照 Array index 比較內容。" },
        { q: "可以比較大型 JSON 嗎？", a: "可以在瀏覽器能力範圍內處理；大型資料可能需要較多記憶體與處理時間。" },
      ],
      related: [
        { path: "/data/json-formatter", label: "JSON 格式化" },
        { path: "/developer/json-to-typescript", label: "JSON 轉 TypeScript" },
        { path: "/developer/json-to-csharp", label: "JSON 轉 C#" },
        { path: "/data/json-to-csv", label: "JSON 轉 CSV" },
      ],
    },
    en: {
      title: "JSON Diff Online – Compare JSON Differences | NexaForge",
      description: "Compare two JSON documents and find added, removed, and changed values instantly. Your JSON is processed locally in your browser and never uploaded.",
      h1: "JSON Diff Online",
      intro: "Compare JSON structures for API work, configuration reviews, test data validation, and version checks without sending either document away from your browser.",
      sections: [
        {
          heading: "What is JSON Diff?",
          body: "JSON Diff compares two JSON documents structurally, marking added, removed, changed, and unchanged fields with their corresponding JSON Paths.",
        },
        {
          heading: "How are objects and arrays compared?",
          body: "Object key order does not create a difference. Arrays are compared by index, so a different order is treated as a change in this first version.",
        },
      ],
      steps: ["Paste the original JSON on the left.", "Paste the modified JSON on the right.", "Select Compare JSON to inspect the structured result."],
      privacy: "Your JSON is processed locally in your browser and is never uploaded, included in a URL, or sent to analytics.",
      faq: [
        { q: "Will JSON Diff upload my data?", a: "No. All JSON comparisons run locally in your browser." },
        { q: "Does a different JSON key order count as a difference?", a: "No. Object key order does not affect the comparison." },
        { q: "Does array order count as a difference?", a: "Yes. This version compares arrays by index." },
        { q: "Can I compare large JSON documents?", a: "Yes, within your browser's available resources. Large documents may require more memory and processing time." },
      ],
      related: [
        { path: "/data/json-formatter", label: "JSON Formatter" },
        { path: "/developer/json-to-typescript", label: "JSON to TypeScript" },
        { path: "/developer/json-to-csharp", label: "JSON to C#" },
        { path: "/data/json-to-csv", label: "JSON to CSV" },
      ],
    },
  },
};

const JSONPATH_TESTER_LANDING: SeoLandingDefinition = {
  path: "/data/jsonpath-tester",
  toolId: "jsonpath-tester",
  isAlias: false,
  preset: {},
  content: {
    "zh-TW": {
      title: "JSONPath Tester 線上測試工具 | NexaForge",
      description: "線上測試 JSONPath expression，快速取得格式化匹配結果。JSON 與查詢內容只在瀏覽器本機處理，不會上傳。",
      h1: "JSONPath Tester 線上測試工具",
      intro: "貼上 JSON 並輸入 JSONPath expression，快速檢查物件、陣列、萬用字元與 recursive path 的匹配結果。",
      sections: [
        {
          heading: "支援常見 JSONPath 語法",
          body: "可使用 $.users[*].name 這類 property、array index、wildcard 與 recursive path 查詢，結果會以格式化 JSON 顯示。",
        },
        {
          heading: "大型 JSON 的瀏覽器本機處理",
          body: "一般輸入會在短暫 debounce 後自動執行；較大的內容會停用自動執行，改由你按下 Run 控制處理時機。",
        },
      ],
      steps: [
        "貼上 JSON 並輸入 JSONPath expression，例如 $.users[*].name。",
        "等待自動執行，或在大型輸入時選擇 Run。",
        "檢查匹配結果，格式化輸入或複製結果。",
      ],
      privacy: "JSON 與 JSONPath expression 都只在這台裝置的瀏覽器本機處理，不會傳送至 NexaForge 伺服器或分析工具。",
      faq: [
        { q: "JSONPath Tester 會上傳我的 JSON 嗎？", a: "不會。JSON 解析、JSONPath 查詢、格式化與複製都在瀏覽器本機完成。" },
        { q: "沒有匹配結果時會顯示什麼？", a: "工具會顯示 No values matched this JSONPath.，這是空結果，不是錯誤。" },
        { q: "支援大型 JSON 嗎？", a: "支援手動 Run；輸入超過合理大小後會停用 debounce 自動執行，以避免編輯時持續阻塞瀏覽器。" },
      ],
      related: [
        { path: "/data/json-formatter", label: "JSON 格式化" },
        { path: "/data/json-diff", label: "JSON Diff" },
        { path: "/data/yaml-json", label: "YAML ↔ JSON" },
        { path: "/json", label: "JSON 工具中心" },
      ],
    },
    en: {
      title: "JSONPath Tester Online – Test JSONPath Expressions | NexaForge",
      description: "Test JSONPath expressions against JSON online and view formatted matches. JSON is processed locally in your browser and never uploaded.",
      h1: "JSONPath Tester Online",
      intro: "Paste JSON and enter a JSONPath expression to inspect matches across objects, arrays, wildcards, and recursive paths.",
      sections: [
        {
          heading: "Common JSONPath syntax",
          body: "Use property, array index, wildcard, and recursive path queries such as $.users[*].name, with formatted JSON results.",
        },
        {
          heading: "A safer workflow for large JSON",
          body: "Normal input runs after a short debounce. Larger documents pause automatic execution so you can choose when to run the query.",
        },
      ],
      steps: [
        "Paste JSON and enter an expression such as $.users[*].name.",
        "Wait for the debounced result, or select Run for large input.",
        "Review the matches, format the input, or copy the result.",
      ],
      privacy: "Your JSON and JSONPath expression are processed only in this browser. They are not sent to NexaForge servers or analytics.",
      faq: [
        { q: "Will JSONPath Tester upload my JSON?", a: "No. JSON parsing, JSONPath evaluation, formatting, and copying all happen locally in your browser." },
        { q: "What happens when there are no matches?", a: "The tool shows No values matched this JSONPath. as an empty state, not an error." },
        { q: "Can I use large JSON documents?", a: "Yes. Automatic execution pauses after the input reaches the size threshold, and you can run the query manually." },
      ],
      related: [
        { path: "/data/json-formatter", label: "JSON Formatter" },
        { path: "/data/json-diff", label: "JSON Diff" },
        { path: "/data/yaml-json", label: "YAML ↔ JSON" },
        { path: "/json", label: "JSON Tool Hub" },
      ],
    },
  },
};

const YAML_JSON_LANDING: SeoLandingDefinition = {
  path: "/data/yaml-json",
  toolId: "json-yaml",
  isAlias: false,
  preset: {},
  content: {
    "zh-TW": {
      title: "YAML 與 JSON 線上轉換器 | YAML to JSON / JSON to YAML | NexaForge",
      description: "免費線上 YAML 與 JSON 雙向轉換器，支援驗證、複製、下載與交換格式。所有資料都在瀏覽器本機處理，不會上傳。",
      h1: "YAML ↔ JSON 線上轉換器",
      intro: "在 YAML 與 JSON 之間雙向轉換設定檔與資料，並取得清楚的語法錯誤位置與驗證結果。",
      sections: [
        { heading: "雙向轉換與語法驗證", body: "選擇輸入格式後轉換成另一種格式。YAML 與 JSON 解析錯誤會顯示訊息、行號，以及可取得的欄位位置。" },
        { heading: "Anchor 與複雜資料", body: "陣列、巢狀物件、null、布林值、數字、多行文字、註解、Unicode 與 YAML anchor 都能在瀏覽器本機處理。" },
      ],
      steps: [
        "選擇 JSON 轉 YAML 或 YAML 轉 JSON，貼上輸入內容。",
        "執行轉換，並在錯誤時查看行號與欄位。",
        "複製結果、下載檔案，或交換輸入與輸出後繼續轉換。",
      ],
      privacy: "輸入的 YAML 與 JSON 只在這台裝置的瀏覽器本機處理，不會傳送到 NexaForge 伺服器或分析工具。",
      faq: [
        { q: "YAML 與 JSON 會上傳嗎？", a: "不會。解析、轉換、複製與下載都在瀏覽器本機完成。" },
        { q: "YAML anchor 會保留在 JSON 嗎？", a: "anchor 與 alias 會解析為一般物件或陣列，參照內容會在 JSON 結果中展開。" },
        { q: "支援多行文字與註解嗎？", a: "支援。YAML 多行文字會轉為 JSON 字串，YAML 註解不會出現在 JSON 結果中。" },
      ],
      related: [
        { path: "/data/json-formatter", label: "JSON 格式化" },
        { path: "/data/json-diff", label: "JSON Diff" },
        { path: "/data/json-xml", label: "JSON ↔ XML" },
        { path: "/data/json-to-csv", label: "JSON 轉 CSV" },
      ],
    },
    en: {
      title: "YAML to JSON / JSON to YAML Converter Online | NexaForge",
      description: "Convert YAML and JSON online with syntax validation, copy, download, swap, and clear controls. Everything runs locally in your browser.",
      h1: "YAML to JSON / JSON to YAML Converter",
      intro: "Convert configuration and data between YAML and JSON while keeping source content in this browser.",
      sections: [
        { heading: "Two-way conversion with validation", body: "Choose the input format and convert to the other format. Syntax errors include a clear message, line number, and column when available." },
        { heading: "Anchors and structured data", body: "Process arrays, nested objects, null, booleans, numbers, multiline strings, comments, Unicode, and YAML anchors locally." },
      ],
      steps: [
        "Choose JSON to YAML or YAML to JSON, then paste your input.",
        "Run the conversion and review the line and column if the syntax is invalid.",
        "Copy or download the result, or swap the output back into the input editor.",
      ],
      privacy: "Your YAML and JSON are processed only in this browser. The content is not sent to NexaForge servers or analytics.",
      faq: [
        { q: "Is my YAML or JSON uploaded?", a: "No. Parsing, conversion, copying, and downloading all happen locally in your browser." },
        { q: "Are YAML anchors preserved in JSON?", a: "Anchors and aliases resolve to ordinary objects or arrays, so referenced content is expanded in the JSON result." },
        { q: "Are multiline strings and comments supported?", a: "Yes. YAML multiline strings become JSON strings, while YAML comments are omitted from the JSON result." },
      ],
      related: [
        { path: "/data/json-formatter", label: "JSON Formatter" },
        { path: "/data/json-diff", label: "JSON Diff" },
        { path: "/data/json-xml", label: "JSON ↔ XML" },
        { path: "/data/json-to-csv", label: "JSON to CSV" },
      ],
    },
  },
};

const PDF_PAGE_EDITOR_LANDINGS: readonly SeoLandingDefinition[] = [
  {
    path: "/pdf/reorder-pages",
    toolId: "pdf-reorder-pages",
    isAlias: false,
    preset: {},
    content: {
      "zh-TW": {
        title: "重新排序 PDF 頁面｜私密瀏覽器工具 | NexaForge",
        description: "免費在線重新排序 PDF 頁面，可拖曳或使用移動按鈕調整順序；檔案只在瀏覽器處理，不需上傳或註冊。",
        h1: "重新排序 PDF 頁面",
        intro: "調整 PDF 頁面順序、旋轉選取頁面，並下載新的 PDF。處理完全在這台裝置的瀏覽器內完成。",
        sections: [{ heading: "重新整理 PDF 順序", body: "可拖曳縮圖調整位置，也可使用每張頁面的左右移動按鈕，讓鍵盤與行動裝置操作同樣可用，完全不必離開此工具。" }, { heading: "保留原始品質", body: "工具會複製原始 PDF 頁面物件來建立結果，而不是將每一頁轉成圖片，因此不會因重新排序降低畫質。" }],
        steps: ["選擇一份 PDF。", "拖曳或移動頁面，並視需要旋轉選取頁面。", "匯出並下載重新排序的 PDF。"],
        privacy: "你的 PDF 只在這台裝置的瀏覽器本機處理，不會上傳到 NexaForge 伺服器，也不會由 NexaForge 儲存。",
        faq: [{ q: "PDF 會上傳嗎？", a: "不會。頁面預覽與輸出都在這台裝置的瀏覽器內完成。" }, { q: "行動裝置可以重新排序嗎？", a: "可以。每張頁面都提供左右移動按鈕，不必依賴拖曳。" }],
        related: [{ path: "/pdf/delete-pages", label: "需要移除頁面？刪除 PDF 頁面" }, { path: "/pdf/extract-pages", label: "只保留部分頁面？擷取 PDF 頁面" }, { path: "/pdf/merge", label: "先合併多份文件？合併 PDF" }, { path: "/pdf/rotate", label: "需要旋轉頁面？旋轉 PDF" }],
      },
      en: {
        title: "Reorder PDF Pages Online – Private Browser Tool | NexaForge",
        description: "Reorder PDF pages online with drag and drop or keyboard-friendly move controls. Free, browser-only processing with no upload or registration.",
        h1: "Reorder PDF Pages Online",
        intro: "Rearrange PDF pages, rotate selected pages, and download a new PDF without sending the document away from your browser.",
        sections: [{ heading: "Organize PDF page order", body: "Drag page previews into place or use the left and right move controls on every page. The alternative controls work on touch devices and with a keyboard." }, { heading: "Keep the original quality", body: "The export copies the original PDF page objects instead of turning pages into images, so changing the page order does not lower visual quality." }],
        steps: ["Choose one PDF.", "Drag or move pages and rotate selected pages if needed.", "Export and download the reordered PDF."],
        privacy: "Your PDF is processed locally in your browser. The file is not uploaded to NexaForge servers.",
        faq: [{ q: "Is my PDF uploaded?", a: "No. Previews and exports run locally in this browser." }, { q: "Can I reorder pages without dragging?", a: "Yes. Every page includes left and right movement controls for keyboard and mobile use." }],
        related: [{ path: "/pdf/delete-pages", label: "Need to remove pages? Delete PDF Pages" }, { path: "/pdf/extract-pages", label: "Only need several pages? Extract PDF Pages" }, { path: "/pdf/merge", label: "Need to combine documents first? Merge PDF" }, { path: "/pdf/rotate", label: "Need to turn pages? Rotate PDF" }],
      },
    },
  },
  {
    path: "/pdf/delete-pages",
    toolId: "pdf-delete-pages",
    isAlias: false,
    preset: {},
    content: {
      "zh-TW": {
        title: "刪除 PDF 頁面｜私密且免費 | NexaForge",
        description: "免費從 PDF 移除指定頁面，刪除前可還原；檔案只在瀏覽器本機處理，不需上傳或註冊。",
        h1: "刪除 PDF 頁面",
        intro: "選取不需要的頁面並標記刪除，隨時可在匯出前還原，最後下載保留所需內容的新 PDF。",
        sections: [{ heading: "先標記，再輸出", body: "頁面在輸出前不會消失，並以清楚文字標示刪除狀態，方便你檢查、還原操作，再放心下載結果。" }, { heading: "安全保留至少一頁", body: "工具不會產生沒有頁面的 PDF。若所有頁面都被標記刪除，匯出按鈕會停用並顯示原因。" }],
        steps: ["選擇一份 PDF。", "選取頁面並標記刪除，必要時選擇還原。", "匯出移除指定頁面後的新 PDF。"],
        privacy: "你的 PDF 只在這台裝置的瀏覽器本機處理，不會上傳到 NexaForge 伺服器，也不會由 NexaForge 儲存。",
        faq: [{ q: "可以還原刪除頁面嗎？", a: "可以，在匯出前選擇「還原」即可。" }, { q: "可以刪除全部頁面嗎？", a: "不可以。PDF 必須至少保留一頁。" }],
        related: [{ path: "/pdf/reorder-pages", label: "需要調整順序？重新排序 PDF 頁面" }, { path: "/pdf/extract-pages", label: "只要保留部分內容？擷取 PDF 頁面" }, { path: "/pdf/split", label: "想建立多份檔案？分割 PDF" }, { path: "/pdf/merge", label: "需要合併文件？合併 PDF" }],
      },
      en: {
        title: "Delete PDF Pages Online – Private & Free | NexaForge",
        description: "Delete pages from PDF files online for free. Mark and restore pages before export with private browser-only processing and no upload.",
        h1: "Delete Pages from PDF",
        intro: "Select unwanted PDF pages, mark them for deletion, restore anything before export, and download a new PDF with the pages you need.",
        sections: [{ heading: "Review pages before deleting", body: "Pages remain visible until export with an explicit deletion label and restore control, so it is easy to review or undo a pending removal." }, { heading: "Always keep a valid PDF", body: "The tool never creates a PDF with no pages. Export is disabled with a clear message if every page is marked for deletion." }],
        steps: ["Choose one PDF.", "Select unwanted pages, then mark them for deletion or restore them.", "Export the PDF with selected pages removed."],
        privacy: "Your PDF is processed locally in your browser. The file is not uploaded to NexaForge servers.",
        faq: [{ q: "Can I restore a deleted page?", a: "Yes. Select Restore before exporting to keep that page." }, { q: "Can I remove every page?", a: "No. A PDF must contain at least one page." }],
        related: [{ path: "/pdf/reorder-pages", label: "Need to change the order? Reorder PDF Pages" }, { path: "/pdf/extract-pages", label: "Only need some pages? Extract PDF Pages" }, { path: "/pdf/split", label: "Need multiple files? Split PDF" }, { path: "/pdf/merge", label: "Need to combine documents? Merge PDF" }],
      },
    },
  },
  {
    path: "/pdf/extract-pages",
    toolId: "pdf-extract-pages",
    isAlias: false,
    preset: {},
    content: {
      "zh-TW": {
        title: "擷取 PDF 頁面｜選取並儲存頁面 | NexaForge",
        description: "免費擷取指定 PDF 頁面，可點選縮圖或輸入 1,3,5-8 等範圍；全程在瀏覽器處理，不需上傳。",
        h1: "擷取 PDF 頁面",
        intro: "從一份 PDF 選取任意頁面，或使用頁碼範圍建立新的單一 PDF，來源檔案不會上傳。",
        sections: [{ heading: "選取所需頁面", body: "直接點選頁面縮圖，或輸入像 1,3,5-8 的範圍。重複範圍會自動合併成單一選取集合，避免重複輸出。" }, { heading: "擷取不同於分割", body: "擷取會將選取頁面放進一份新 PDF；若你需要輸出多份 PDF，請使用分割 PDF 工具。" }],
        steps: ["選擇一份 PDF。", "點選縮圖或輸入頁碼範圍。", "匯出包含選取頁面的單一 PDF。"],
        privacy: "你的 PDF 只在這台裝置的瀏覽器本機處理，不會上傳到 NexaForge 伺服器，也不會由 NexaForge 儲存。",
        faq: [{ q: "支援哪些範圍格式？", a: "可使用 2、2,5,8、1-5 或 1,4,7-10。" }, { q: "重複頁碼會重複輸出嗎？", a: "不會，重複頁碼會自動合併。" }],
        related: [{ path: "/pdf/reorder-pages", label: "需要調整頁面順序？重新排序 PDF 頁面" }, { path: "/pdf/rotate", label: "需要旋轉選取頁面？旋轉 PDF" }, { path: "/pdf/to-image", label: "需要將頁面轉為圖片？PDF 轉圖片" }, { path: "/pdf/split", label: "需要建立多份 PDF？分割 PDF" }],
      },
      en: {
        title: "Extract PDF Pages Online – Select & Save Pages | NexaForge",
        description: "Extract PDF pages online by selecting previews or entering ranges such as 1,3,5-8. Save one new PDF privately in your browser.",
        h1: "Extract Pages from PDF",
        intro: "Select any pages from one PDF or enter page ranges to save one new PDF. The source file remains in your browser.",
        sections: [{ heading: "Select the pages you need", body: "Choose page previews directly or enter a range such as 1,3,5-8. Overlapping ranges are merged so a page is included only once." }, { heading: "Extracting is not splitting", body: "Extracting places your selected pages into one new PDF. Use Split PDF instead when you need to make multiple PDF files." }],
        steps: ["Choose one PDF.", "Click page previews or enter page ranges.", "Export one PDF containing the selected pages."],
        privacy: "Your PDF is processed locally in your browser. The file is not uploaded to NexaForge servers.",
        faq: [{ q: "Which page-range formats work?", a: "Use 2, 2,5,8, 1-5, or 1,4,7-10." }, { q: "Are duplicate page numbers exported twice?", a: "No. Duplicate and overlapping selections are merged." }],
        related: [{ path: "/pdf/reorder-pages", label: "Need a different order? Reorder PDF Pages" }, { path: "/pdf/rotate", label: "Need to rotate pages? Rotate PDF" }, { path: "/pdf/to-image", label: "Need page images? PDF to Image" }, { path: "/pdf/split", label: "Need multiple PDFs? Split PDF" }],
      },
    },
  },
  {
    path: "/pdf/watermark",
    toolId: "pdf-watermark",
    isAlias: false,
    preset: {},
    content: {
      "zh-TW": {
        title: "為 PDF 加入浮水印｜免費且私密 | NexaForge",
        description: "免費在線上為 PDF 加入文字、PNG 或 JPEG 浮水印，支援透明度、旋轉、位置與自訂頁面範圍；全程在瀏覽器本機處理。",
        h1: "為 PDF 加入浮水印",
        intro: "為 PDF 加入文字或圖片浮水印，調整透明度、旋轉角度與位置後，在瀏覽器內產生新的 PDF。",
        sections: [
          { heading: "文字或圖片浮水印", body: "可輸入文字並設定字體大小與顏色，也可上傳 PNG 或 JPEG 圖片。透明 PNG 能保留圖片本身的透明效果。" },
          { heading: "每頁尺寸都能正確定位", body: "支援左上、上方置中、右上、中央、左下、下方置中與右下。每一頁都依自己的尺寸計算位置，也能只處理指定頁面。" },
        ],
        steps: ["上傳一份 PDF，確認頁數與預覽。", "選擇文字或圖片，調整樣式、位置與頁面範圍。", "產生並下載加上浮水印的新 PDF。"],
        privacy: "你的 PDF 與浮水印圖片只在這台裝置的瀏覽器本機處理，不會上傳到 NexaForge 伺服器，也不會由 NexaForge 儲存。",
        faq: [
          { q: "PDF 會上傳或儲存嗎？", a: "不會。處理與下載都在瀏覽器本機完成，NexaForge 不會接收或儲存來源 PDF 或浮水印圖片。" },
          { q: "圖片浮水印支援哪些格式？", a: "目前支援 PNG 與 JPEG，透明 PNG 也能保留透明效果。" },
          { q: "可以只為部分頁面加浮水印嗎？", a: "可以。選擇自訂頁面，輸入例如 1-5、8、10-15。" },
          { q: "不同尺寸或橫向頁面會跑位嗎？", a: "工具會依每頁自己的 CropBox 或 MediaBox 尺寸計算位置，支援不同尺寸與橫向頁面。" },
        ],
        related: [
          { path: "/pdf/add-page-numbers", label: "為 PDF 加入頁碼" },
          { path: "/pdf/merge", label: "合併 PDF" },
          { path: "/pdf/rotate", label: "旋轉 PDF" },
          { path: "/image/watermark", label: "圖片加浮水印" },
        ],
      },
      en: {
        title: "Add Watermark to PDF Online – Free & Private | NexaForge",
        description: "Add a text, PNG, or JPEG watermark to PDF online for free. Set opacity, rotation, position, and page range with private browser-only processing.",
        h1: "Add Watermark to PDF",
        intro: "Add text or image watermarks to a PDF, adjust opacity, rotation, and placement, then create a new PDF in your browser.",
        sections: [
          { heading: "Text or image watermarks", body: "Enter text with a font size and color, or choose a PNG or JPEG image. Transparent PNG files keep their transparency." },
          { heading: "Placement for every page size", body: "Choose top left, top center, top right, center, bottom left, bottom center, or bottom right. Each page uses its own dimensions, and you can target selected pages." },
        ],
        steps: ["Upload one PDF and confirm its page count and preview.", "Choose text or an image, then adjust its style, position, and page range.", "Create and download the new watermarked PDF."],
        privacy: "Your PDF and watermark image are processed locally in your browser. They are not uploaded to or stored by NexaForge.",
        faq: [
          { q: "Is my PDF uploaded or stored?", a: "No. Processing and downloading happen in your browser, and NexaForge does not receive or store the source PDF or watermark image." },
          { q: "Which image watermark formats are supported?", a: "PNG and JPEG are supported, including transparent PNG files." },
          { q: "Can I watermark only some pages?", a: "Yes. Choose Custom pages and enter values such as 1-5, 8, 10-15." },
          { q: "Will different-size or landscape pages be misplaced?", a: "The tool calculates placement from each page's CropBox or MediaBox dimensions, including mixed sizes and landscape pages." },
        ],
        related: [
          { path: "/pdf/add-page-numbers", label: "Add Page Numbers to PDF" },
          { path: "/pdf/merge", label: "Merge PDF" },
          { path: "/pdf/rotate", label: "Rotate PDF" },
          { path: "/image/watermark", label: "Image Watermark" },
        ],
      },
    },
  },
  {
    path: "/pdf/add-page-numbers",
    toolId: "pdf-add-page-numbers",
    isAlias: false,
    preset: {},
    content: {
      "zh-TW": {
        title: "為 PDF 加入頁碼｜免費且私密 | NexaForge",
        description: "免費在線上為 PDF 加入頁碼，選擇位置、格式、起始頁碼與自訂頁面範圍；全程在瀏覽器本機處理。",
        h1: "為 PDF 加入頁碼",
        intro: "選擇頁碼位置、起始數字、格式、字體大小、顏色與邊距，在瀏覽器內產生並下載新的 PDF。",
        sections: [
          { heading: "依每頁尺寸精準定位", body: "支援左上、上方置中、右上、左下、下方置中與右下。每一頁都依自己的頁面尺寸計算位置，也能處理橫向頁面。" },
          { heading: "彈性頁碼格式與範圍", body: "可為全部頁面加碼，或輸入 1-5、8、10-15 等自訂範圍。支援 {n}、Page {n}、{n} / {total} 與 Page {n} of {total}。" },
        ],
        steps: ["上傳一份 PDF，確認頁數與預覽。", "選擇位置、頁面範圍、格式、起始頁碼與文字樣式。", "產生並下載加上頁碼的新 PDF。"],
        privacy: "你的 PDF 只在這台裝置的瀏覽器本機處理，不會上傳到 NexaForge 伺服器，也不會由 NexaForge 儲存。",
        faq: [
          { q: "PDF 會上傳或儲存嗎？", a: "不會。處理與下載都在瀏覽器本機完成，NexaForge 不會接收或儲存來源 PDF。" },
          { q: "可以只為部分頁面加頁碼嗎？", a: "可以。選擇自訂範圍，輸入例如 1-5、8、10-15。" },
          { q: "不同尺寸或橫向頁面會跑位嗎？", a: "工具會依每頁自己的 CropBox 或 MediaBox 尺寸計算位置，支援不同尺寸與橫向頁面。" },
        ],
        related: [
          { path: "/pdf/merge", label: "合併 PDF" },
          { path: "/pdf/reorder-pages", label: "重新排序 PDF 頁面" },
          { path: "/pdf/delete-pages", label: "刪除 PDF 頁面" },
          { path: "/image/watermark", label: "圖片浮水印" },
        ],
      },
      en: {
        title: "Add Page Numbers to PDF Online – Free & Private | NexaForge",
        description: "Add page numbers to PDF online for free. Choose the position, range, format, starting number, font size, color, and margin with private browser-only processing.",
        h1: "Add Page Numbers to PDF",
        intro: "Choose the page number position, starting value, format, font size, color, and margin, then create and download a new PDF.",
        sections: [
          { heading: "Place numbers for every page size", body: "Choose top left, top center, top right, bottom left, bottom center, or bottom right. Each page uses its own dimensions, including landscape pages." },
          { heading: "Flexible formats and page ranges", body: "Number every page or enter a custom range such as 1-5, 8, 10-15. Use {n}, Page {n}, {n} / {total}, or Page {n} of {total}." },
        ],
        steps: ["Upload one PDF and confirm its page count and preview.", "Choose the position, page range, format, starting number, and text styling.", "Create and download the new numbered PDF."],
        privacy: "Your PDF is processed locally in your browser. The file is not uploaded to NexaForge servers or stored by NexaForge.",
        faq: [
          { q: "Is my PDF uploaded or stored?", a: "No. Processing and downloading happen in your browser, and NexaForge does not receive or store the source PDF." },
          { q: "Can I number only some pages?", a: "Yes. Choose Custom range and enter values such as 1-5, 8, 10-15." },
          { q: "Will different-size or landscape pages be misplaced?", a: "The tool calculates placement from each page's CropBox or MediaBox dimensions, including mixed sizes and landscape pages." },
        ],
        related: [
          { path: "/pdf/merge", label: "Merge PDF" },
          { path: "/pdf/reorder-pages", label: "Reorder PDF Pages" },
          { path: "/pdf/delete-pages", label: "Delete PDF Pages" },
          { path: "/image/watermark", label: "Image Watermark" },
        ],
      },
    },
  },
];

const PDF_METADATA_LANDING: SeoLandingDefinition = {
  path: "/pdf/metadata",
  toolId: "pdf-metadata",
  isAlias: false,
  preset: {},
  content: {
    "zh-TW": {
      title: "檢視與移除 PDF 中繼資料｜NexaForge",
      description: "線上檢視並移除 PDF 文件資訊中的標題、作者、主旨、關鍵字、建立工具與日期；全程在瀏覽器本機處理。",
      h1: "檢視與移除 PDF 中繼資料",
      intro: "查看 PDF 常見文件中繼資料，建立移除支援欄位的新副本。中繼資料可能包含作者名稱、建立工具與建立日期。",
      sections: [
        { heading: "查看常見文件資訊", body: "工具會顯示 PDF 文件資訊字典中的標題、作者、主旨、關鍵字、建立工具、製作程式、建立日期與修改日期，方便分享前先檢查。" },
        { heading: "只移除支援的中繼資料", body: "移除功能會建立保留頁面內容的新 PDF，清除上述文件資訊欄位；此工具不宣稱能移除所有隱藏資料或其他 PDF 內容。" },
      ],
      steps: [
        "上傳一份 PDF，查看文件中繼資料。",
        "確認資訊後選擇移除 PDF 中繼資料。",
        "下載清除後的新 PDF，原始檔案不會被修改。",
      ],
      privacy: "你的 PDF 只在這台裝置的瀏覽器本機讀取與處理，不會上傳到 NexaForge 伺服器，也不會由 NexaForge 儲存。",
      faq: [
        { q: "PDF 會上傳或儲存嗎？", a: "不會。檢視、移除與下載都在目前的瀏覽器本機完成。" },
        { q: "工具支援哪些欄位？", a: "MVP 支援文件資訊字典中的標題、作者、主旨、關鍵字、建立工具、製作程式、建立日期與修改日期。" },
        { q: "會移除所有 PDF 隱藏資料嗎？", a: "不會。工具只處理支援的文件資訊字典欄位，不宣稱移除嵌入檔案、註解或其他 hidden content。" },
      ],
      related: [
        { path: "/image/exif-viewer", label: "檢視圖片 EXIF" },
        { path: "/image/remove-exif", label: "移除圖片 EXIF" },
        { path: "/pdf/watermark", label: "為 PDF 加入浮水印" },
        { path: "/pdf/merge", label: "合併 PDF" },
      ],
    },
    en: {
      title: "View & Remove PDF Metadata Online | NexaForge",
      description: "View and remove PDF document metadata online, including title, author, subject, keywords, creator, producer, and dates in your browser.",
      h1: "View & Remove PDF Metadata Online",
      intro: "Review common PDF document metadata and create a new copy without the supported fields. Metadata may include an author name, the creation tool, and a creation date.",
      sections: [
        { heading: "Review common document information", body: "The viewer reads Title, Author, Subject, Keywords, Creator, Producer, Creation Date, and Modification Date from the PDF document information dictionary." },
        { heading: "Remove supported metadata only", body: "Removal creates a PDF with the page content preserved while clearing the supported document information fields. It does not claim to remove all hidden data or other PDF content." },
      ],
      steps: [
        "Upload one PDF to view its document metadata.",
        "Review the fields, then choose Remove PDF metadata.",
        "Download the clean PDF; your original file is not changed.",
      ],
      privacy: "Your PDF is read and processed locally in this browser. It is not uploaded to or stored by NexaForge.",
      faq: [
        { q: "Is my PDF uploaded or stored?", a: "No. Viewing, removal, and downloading happen locally in your current browser." },
        { q: "Which fields does the tool support?", a: "The MVP supports Title, Author, Subject, Keywords, Creator, Producer, Creation Date, and Modification Date in the document information dictionary." },
        { q: "Does it remove all hidden PDF data?", a: "No. It handles supported document information dictionary fields only and does not claim to remove embedded files, annotations, or other hidden content." },
      ],
      related: [
        { path: "/image/exif-viewer", label: "View Image EXIF" },
        { path: "/image/remove-exif", label: "Remove Image EXIF" },
        { path: "/pdf/watermark", label: "Add Watermark to PDF" },
        { path: "/pdf/merge", label: "Merge PDF" },
      ],
    },
  },
};

export const SEO_SEARCH_PAGES: readonly SeoLandingDefinition[] = [
  ...ALIAS_PAGE_SEEDS.map(definePage),
  ...EXISTING_PAGE_SEEDS.map(definePage).map((entry) =>
    entry.path === UNIX_TIMESTAMP_LANDING.path ? UNIX_TIMESTAMP_LANDING : entry
  ),
  ...PDF_PAGE_EDITOR_LANDINGS,
  PDF_METADATA_LANDING,
  JSON_DIFF_LANDING,
  JSONPATH_TESTER_LANDING,
  YAML_JSON_LANDING,
];

export const SEO_ALIAS_PAGES = SEO_SEARCH_PAGES.filter(({ isAlias }) => isAlias);

export function findSeoLanding(path: string): SeoLandingDefinition | undefined {
  const basePath = stripLocalePrefix(path.split(/[?#]/, 1)[0] || "/");
  return SEO_SEARCH_PAGES.find((entry) => entry.path === basePath);
}

export function getSeoLandingContent(path: string, locale: Locale): LandingContent | undefined {
  return findSeoLanding(path)?.content[locale];
}
