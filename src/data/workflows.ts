import type { Locale } from "../context/LanguageContext";

export const FILE_WORKFLOWS = [
  {
    id: "image-delivery", path: "/workflows/image-delivery", tools: ["image-resize", "image-watermark", "image-compress"],
    en: { title: "Prepare images for delivery", description: "Resize images, add a watermark, then download one ZIP.", steps: ["Resize", "Watermark", "ZIP", "Download"] },
    "zh-TW": { title: "圖片批次交付", description: "縮放圖片、加入浮水印，最後一次下載 ZIP。", steps: ["縮放", "浮水印", "打包 ZIP", "下載"] },
  },
  {
    id: "document-text", path: "/workflows/document-text", tools: ["document-scan", "image-ocr", "text-cleaner"],
    en: { title: "Turn a document photo into text", description: "Correct the photo, recognize text, then review and clean it.", steps: ["Scan", "OCR", "Clean text", "Download"] },
    "zh-TW": { title: "文件照片轉文字", description: "校正文件照片、辨識文字，檢查並清理後下載。", steps: ["掃描校正", "OCR 辨識", "文字清理", "下載"] },
  },
  {
    id: "pdf-delivery", path: "/workflows/pdf-delivery", tools: ["pdf-merge", "pdf-add-page-numbers", "pdf-compress"],
    en: { title: "Prepare a PDF for delivery", description: "Merge PDFs in order, add page numbers, then compress and download.", steps: ["Merge", "Page numbers", "Compress", "Download"] },
    "zh-TW": { title: "PDF 文件交付", description: "依序合併 PDF、加入頁碼，壓縮後下載交件文件。", steps: ["合併", "加入頁碼", "壓縮", "下載"] },
  },
] as const;

export type FileWorkflowId = typeof FILE_WORKFLOWS[number]["id"];
export function workflowCopy(id: FileWorkflowId, locale: Locale) {
  return FILE_WORKFLOWS.find(item => item.id === id)![locale];
}
