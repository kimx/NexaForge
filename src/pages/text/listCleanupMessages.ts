export const listCleanupMessages = {
  en: {
    title: "List Cleanup", description: "Clean, deduplicate, and sort a list with reusable rules. Review every step before copying or downloading.",
    input: "Original list", output: "Final list", run: "Run cleanup", rules: "Review cleanup rules", order: "Clean → Deduplicate → Sort (optional)",
    clean: "Clean", deduplicate: "Deduplicate", sort: "Sort", preview: "preview", counts: "lines before → after", skipped: "Sorting is skipped; the first occurrence stays in its original position.",
    trimLines: "Trim each line", removeEmptyLines: "Remove empty lines", collapseSpaces: "Collapse repeated spaces", ignoreCase: "Ignore case", sortEnabled: "Sort the list", direction: "Sort direction", asc: "Ascending", desc: "Descending", normalization: "Line endings are normalized to LF.",
    templates: "Saved templates", builtIn: "Default list cleanup", templateName: "Template name", save: "Save new template", rename: "Rename template", remove: "Delete template", reset: "Reset rules", resetAll: "Delete all saved templates", resetDone: "All saved templates deleted.",
    privacy: "Only template names, steps, and rules are saved on this device. Input and results stay in memory and are cleared when you leave this page or refresh. Do not put private list content in a template name.",
    storageError: "Templates are available for this visit, but device storage is unavailable or contains invalid data. You can still run cleanup and export results.",
    invalidName: "Enter a unique template name (1–80 characters).", limit: "You can save up to 30 templates. Delete one to add another.", saved: "Template saved.", renamed: "Template renamed.", deleted: "Template deleted.", resetRules: "Default rules restored. Your original list is preserved.",
    import: "Use original text from the current workflow", clear: "Clear list and results", empty: "No lines remain after cleanup. Adjust the rules and run again.",
    how: ["Paste a list, or bring in the original text from your current text workflow.", "Review cleaning and deduplication rules, optionally enable sorting, then run cleanup.", "Inspect each step and export the final list. Save only the rules as a reusable template."],
    faqQ: "Does changing a template process my text?", faqA: "No. Loading, saving, or editing rules never runs cleanup. Every run starts from the original list, so you can compare different rules without losing entries.",
  },
  "zh-TW": {
    title: "清單清理", description: "使用可重複套用的規則清理、去重與排序清單，逐步檢查結果後複製或下載。",
    input: "原始清單", output: "最終清單", run: "執行清理", rules: "檢查清理規則", order: "清理 → 去重 → 排序（可選）",
    clean: "清理", deduplicate: "去重", sort: "排序", preview: "預覽", counts: "行數：處理前 → 處理後", skipped: "已略過排序，保留首次出現的原始順序。",
    trimLines: "移除每行前後空白", removeEmptyLines: "移除空白行", collapseSpaces: "合併連續空格", ignoreCase: "忽略大小寫", sortEnabled: "排序清單", direction: "排序方向", asc: "升冪", desc: "降冪", normalization: "換行符號會統一為 LF。",
    templates: "已儲存範本", builtIn: "預設清單清理", templateName: "範本名稱", save: "儲存新範本", rename: "重新命名範本", remove: "刪除範本", reset: "重設規則", resetAll: "刪除所有已儲存範本", resetDone: "已刪除所有範本。",
    privacy: "僅範本名稱、步驟與規則儲存在此裝置。輸入與結果只保留在記憶體，離開此頁或重新整理即清除。請勿將清單的私人內容放入範本名稱。",
    storageError: "裝置儲存空間無法使用或含有無效資料，範本僅供本次使用。仍可執行清理與匯出結果。",
    invalidName: "請輸入不重複的範本名稱（1–80 字元）。", limit: "最多可儲存 30 個範本，請先刪除一個再新增。", saved: "已儲存範本。", renamed: "已重新命名範本。", deleted: "已刪除範本。", resetRules: "已還原預設規則，原始清單保持不變。",
    import: "使用目前文字工作流程的原始輸入", clear: "清除清單與結果", empty: "清理後沒有剩餘行，請調整規則再執行。",
    how: ["貼上清單，或帶入目前文字工作流程的原始輸入。", "檢查清理與去重規則，選擇是否排序，再執行清理。", "逐步檢查結果並匯出最終清單，亦可將規則儲存為範本。"],
    faqQ: "更換範本會立即處理文字嗎？", faqA: "不會。載入、儲存或修改規則都不會執行清理。每次執行都從原始清單開始，方便比較不同規則而不遺失項目。",
  },
};

export const listCleanupToolMessages = {
  en: { "tool.list-cleanup.title": listCleanupMessages.en.title, "tool.list-cleanup.description": listCleanupMessages.en.description },
  "zh-TW": { "tool.list-cleanup.title": listCleanupMessages["zh-TW"].title, "tool.list-cleanup.description": listCleanupMessages["zh-TW"].description },
};
