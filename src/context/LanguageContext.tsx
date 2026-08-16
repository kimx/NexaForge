import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useEffect,
  useCallback,
  useState,
} from "react";

export type Locale = "zh-TW" | "en";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LOCALE_STORAGE_KEY = "nexaforge-locale";

function normalizeLocale(raw: string | null): Locale {
  if (!raw) {
    return "zh-TW";
  }

  switch (raw.toLowerCase().trim()) {
    case "zh":
    case "zh-tw":
    case "zh-hant":
      return "zh-TW";
    case "en":
    case "en-us":
    case "en-gb":
    case "en-ca":
      return "en";
    default:
      return "zh-TW";
  }
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "zh-TW";
  }

  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) {
      return normalizeLocale(stored);
    }

    const browserLocale = window.navigator.language;
    return normalizeLocale(browserLocale);
  } catch {
    return "zh-TW";
  }
}

function persistLocaleState(locale: Locale): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Best effort: persist in memory when storage is unavailable.
  }
}

const zhMessages: Record<string, string> = {
  "top.banner": "給設計師、學生、研究員、工程師的多功能檔案工具站。",
  "top.banner.cta": "你處理 PDF、圖片、JSON、文字的每一步都在本機完成，適合忙著出成果、又重視隱私的人。",
  "top.languageSwitcherLabel": "語言切換",
  "breadcrumb.aria": "麵包屑導覽",
  "lang.zh": "繁中",
  "lang.en": "English",

  "header.title": "NexaForge",
  "header.subtitle": "為有檔案需求的工作流程打造：學生、上班族、創作者、工程師都能直接使用。",

  "sidebar.home": "首頁",
  "sidebar.searchLabel": "工具搜尋",
  "sidebar.searchPlaceholder": "輸入工具名稱，例如：Image 或 JSON",
  "sidebar.sectionTitle": "全部工具導覽",
  "sidebar.resultCount": "找到 {count} 個結果",
  "sidebar.noResult": "找不到符合條件的工具，試試其他關鍵字。",
  "sidebar.aria": "工具側欄",
  "sidebar.empty": "找不到符合條件的工具，試試其他關鍵字。",
  "button.download": "下載",
  "fileDropzone.aria": "檔案拖放區",
  "fileDropzone.orSelect": "或點擊選擇檔案",
  "fileDropzone.help": "拖放或點擊以選擇檔案。",
  "fileDropzone.tooLarge": "此工具不支援這個檔案大小。",
  "fileInfo.noSelection": "目前未選取檔案。",
  "fileInfo.unknownType": "未知類型",
  "privacyNotice.aria": "隱私權提醒",
  "privacyNotice.title": "隱私提醒",
  "privacyNotice.description": "你的檔案會在這台裝置本機處理。",
  "privacyNotice.neverUploaded": "檔案不會被上傳到伺服器。",
  "category.Image": "影像",
  "category.PDF": "PDF",
  "category.Data": "資料",
  "category.Text": "文字",
  "category.Developer": "開發者",

  "tool.image-resize.title": "影像縮放",
  "tool.image-resize.description": "在瀏覽器直接調整 JPG、PNG 或 WebP 大小。",
  "tool.image-compress.title": "影像壓縮",
  "tool.image-compress.description": "可控品質壓縮，快速比較大小。",
  "tool.image-convert.title": "影像轉換",
  "tool.image-convert.description": "立即轉換 JPG、PNG 與 WebP 格式。",
  "tool.pdf-merge.title": "PDF 合併",
  "tool.pdf-merge.description": "整合多個 PDF 為單一檔案。",
  "tool.pdf-split.title": "PDF 分割",
  "tool.pdf-split.description": "依頁碼安全切分並保留結果。",
  "tool.pdf-rotate.title": "PDF 旋轉",
  "tool.pdf-rotate.description": "旋轉指定頁面並輸出品質。",
  "tool.json-formatter.title": "JSON 格式化",
  "tool.json-formatter.description": "快速格式化、壓縮與驗證 JSON。",
  "tool.csv-viewer.title": "CSV 檢視器",
  "tool.csv-viewer.description": "安全預覽 CSV，展示欄位與資料。",
  "tool.csv-to-json.title": "CSV 轉 JSON",
  "tool.csv-to-json.description": "將 CSV 快速轉成 JSON 並下載。",
  "tool.json-to-csv.title": "JSON 轉 CSV",
  "tool.json-to-csv.description": "將物件陣列轉為 CSV 輸出。",
  "tool.base64.title": "Base64",
  "tool.base64.description": "文字、Base64 與檔案互轉，全部本機執行。",
  "tool.hash.title": "Hash 產生器",
  "tool.hash.description": "在瀏覽器中安全產生 SHA 雜湊值。",
  "tool.uuid.title": "UUID 產生器",
  "tool.uuid.description": "產生 1 筆或 1000 筆 UUID。",
  "tool.qr-code.title": "QR Code",
  "tool.qr-code.description": "由文字或網址快速產生 PNG 二維碼。",

  "home.title": "NexaForge",
  "home.subtitle": "把轉檔、壓縮、格式化與拆分放在同一個工作台，打開工具就能開始。",
  "home.eyebrow": "你的檔案工作台",
  "home.primaryCta": "開始處理檔案",
  "home.secondaryCta": "查看熱門工具",
  "home.proofLabel": "NexaForge 使用方式",
  "home.proof.local": "檔案不上傳",
  "home.proof.formats": "PDF、圖片、JSON 都能處理",
  "home.proof.noAccount": "不用註冊，打開就能用",
  "home.workspaceKicker": "TOOL WORKSPACE",
  "home.workspaceTitle": "一站式檔案工具",
  "home.workspaceSubtitle": "快速、免費、好上手；從圖片到 PDF，找到工具就能開始。",
  "home.browseCategories": "依分類瀏覽",
  "home.browseCategoriesSubtitle": "按照你的工作情境，快速找到下一個工具。",
  "home.categoryCount": "{count} 個工具",
  "home.searchLabel": "搜尋工具",
  "home.searchPlaceholder": "Image, PDF, JSON...",
  "home.popular": "熱門工具",
  "home.open": "開啟工具",
  "home.categories.Image": "影像",
  "home.categories.PDF": "PDF",
  "home.categories.Data": "資料",
  "home.categories.Text": "文字",
  "home.categories.Developer": "開發者",

  "toolPage.workspace": "工具工作區",
  "toolPage.options": "設定",
  "toolPage.result": "結果",
  "toolPage.how": "運作方式",
  "toolPage.faq": "常見問題",
  "toolPage.related": "相關工具",

  "footer.text": "© {year} NexaForge",
};

const enMessages: Record<string, string> = {
  "top.banner": "Built for designers, students, researchers, and engineers.",
  "top.banner.cta": "Image, PDF, JSON, and text workflows stay on your device, from upload to download.",
  "top.languageSwitcherLabel": "Language switch",
  "breadcrumb.aria": "Breadcrumb",
  "lang.zh": "繁中",
  "lang.en": "English",

  "header.title": "NexaForge",
  "header.subtitle": "For students, creators, analysts, and builders who process files all day.",

  "sidebar.home": "Home",
  "sidebar.searchLabel": "Tool search",
  "sidebar.searchPlaceholder": "Search tool name, e.g. Image or JSON",
  "sidebar.sectionTitle": "Tool navigation",
  "sidebar.resultCount": "Found {count} result(s)",
  "sidebar.noResult": "No matches found, please try another keyword.",
  "sidebar.aria": "Tool sidebar",
  "sidebar.empty": "No matching tools. Try another keyword.",
  "button.download": "Download",
  "fileDropzone.aria": "File dropzone",
  "fileDropzone.orSelect": "or click to select",
  "fileDropzone.help": "Drag and drop or click to choose files.",
  "fileDropzone.tooLarge": "This file is too large for this tool.",
  "fileInfo.noSelection": "No file selected.",
  "fileInfo.unknownType": "Unknown type",
  "privacyNotice.aria": "Privacy Notice",
  "privacyNotice.title": "Privacy Notice",
  "privacyNotice.description": "Your files are processed locally.",
  "privacyNotice.neverUploaded": "They are never uploaded.",
  "category.Image": "Image",
  "category.PDF": "PDF",
  "category.Data": "Data",
  "category.Text": "Text",
  "category.Developer": "Developer",

  "tool.image-resize.title": "Image Resize",
  "tool.image-resize.description": "Resize JPG, PNG, or WebP directly in the browser.",
  "tool.image-compress.title": "Image Compress",
  "tool.image-compress.description": "Compress with quality control and compare file sizes.",
  "tool.image-convert.title": "Image Converter",
  "tool.image-convert.description": "Convert JPG, PNG, and WebP formats instantly.",
  "tool.pdf-merge.title": "PDF Merge",
  "tool.pdf-merge.description": "Merge many PDF files and download a single file.",
  "tool.pdf-split.title": "PDF Split",
  "tool.pdf-split.description": "Split pages by range input with secure browser-side validation.",
  "tool.pdf-rotate.title": "PDF Rotate",
  "tool.pdf-rotate.description": "Rotate selected pages with preview and quality-safe output.",
  "tool.json-formatter.title": "JSON Formatter",
  "tool.json-formatter.description": "Format, minify, and validate JSON in seconds.",
  "tool.csv-viewer.title": "CSV Viewer",
  "tool.csv-viewer.description": "Render large CSV safely with preview and metadata.",
  "tool.csv-to-json.title": "CSV to JSON",
  "tool.csv-to-json.description": "Convert CSV files to JSON quickly and download.",
  "tool.json-to-csv.title": "JSON to CSV",
  "tool.json-to-csv.description": "Transform object arrays into CSV output.",
  "tool.base64.title": "Base64",
  "tool.base64.description": "Text, Base64, and file conversion fully local.",
  "tool.hash.title": "Hash Generator",
  "tool.hash.description": "Generate SHA digest values in browser securely.",
  "tool.uuid.title": "UUID Generator",
  "tool.uuid.description": "Generate one UUID or batch up to 1000.",
  "tool.qr-code.title": "QR Code",
  "tool.qr-code.description": "Create and download PNG QR codes from text or URL.",

  "home.title": "NexaForge",
  "home.subtitle": "Resize, convert, format, and split from one focused workspace. Open a tool and get moving.",
  "home.eyebrow": "Your file operations desk",
  "home.primaryCta": "Start with a file",
  "home.secondaryCta": "Explore popular tools",
  "home.proofLabel": "How NexaForge works",
  "home.proof.local": "Files stay on your device",
  "home.proof.formats": "PDF, image, and JSON workflows",
  "home.proof.noAccount": "No account needed",
  "home.workspaceKicker": "TOOL WORKSPACE",
  "home.workspaceTitle": "All-in-One File Tools",
  "home.workspaceSubtitle": "Fast, free, and easy to use. Find a tool, open it, and keep moving.",
  "home.browseCategories": "Browse by Category",
  "home.browseCategoriesSubtitle": "Find the next tool by the kind of work you are doing.",
  "home.categoryCount": "{count} tools",
  "home.searchLabel": "Search Tools",
  "home.searchPlaceholder": "Image, PDF, JSON...",
  "home.popular": "Popular Tools",
  "home.open": "Open tool",
  "home.categories.Image": "Image",
  "home.categories.PDF": "PDF",
  "home.categories.Data": "Data",
  "home.categories.Text": "Text",
  "home.categories.Developer": "Developer",

  "toolPage.workspace": "Tool Workspace",
  "toolPage.options": "Options",
  "toolPage.result": "Result",
  "toolPage.how": "How it works",
  "toolPage.faq": "FAQ",
  "toolPage.related": "Related Tools",

  "footer.text": "© {year} NexaForge",
};

const DICTIONARY: Record<Locale, Record<string, string>> = {
  "zh-TW": zhMessages,
  en: enMessages,
};

function renderTemplate(template: string, params?: Record<string, string | number>): string {
  if (!params || Object.keys(params).length === 0) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return String(params[key] ?? match);
  });
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren): JSX.Element {
  const [locale, setLocaleValue] = useState<Locale>(readInitialLocale);
  const setLocale = useCallback((next: Locale) => {
    const normalized = normalizeLocale(next);
    setLocaleValue(normalized);
    persistLocaleState(normalized);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = locale === "en" ? "en" : "zh-Hant";
    }
  }, [locale]);

  const t = (key: string, params?: Record<string, string | number>) => {
    const localeDict = DICTIONARY[locale];
    const nextLocaleDict = DICTIONARY.en;
    const raw = localeDict[key] ?? nextLocaleDict[key] ?? key;
    return renderTemplate(raw, params);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

export function useLocalizedToolMeta(): (toolId: string, type: "title" | "description") => string {
  const { t } = useLanguage();
  return (toolId, type) => t(`tool.${toolId}.${type}`);
}

export function localizedCategoryLabel(category: string, t: (key: string) => string): string {
  return t(`category.${category}`);
}

