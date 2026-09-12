import { useLanguage } from "../context/LanguageContext";

const copy = {
  en: {
    pin: "Pin", unpin: "Unpin", pinned: "Pinned tools", personal: "Personal settings",
    hint: "Pinned tools, recent tools, image compression format and quality, and text cleaner choices are saved in this browser. File and text content are not saved.",
    reset: "Reset settings", clearRecent: "Clear recent tools", clearPins: "Clear pinned tools",
    clearPreferences: "Reset saved tool options", clearAll: "Clear personal settings", cleared: "Personal settings cleared.",
    saved: "These choices are remembered in this browser.",
  },
  "zh-TW": {
    pin: "釘選", unpin: "取消釘選", pinned: "釘選工具", personal: "個人設定",
    hint: "此瀏覽器會保存釘選工具、最近使用工具、圖片壓縮的格式與品質，以及文字清理選項。不會保存檔案或文字內容。",
    reset: "重設選項", clearRecent: "清除最近使用工具", clearPins: "清除釘選工具",
    clearPreferences: "重設已儲存的工具選項", clearAll: "清除個人設定", cleared: "已清除個人設定。",
    saved: "此瀏覽器會記住這些選項。",
  },
};
export function usePersonalizationCopy() { return copy[useLanguage().locale]; }
