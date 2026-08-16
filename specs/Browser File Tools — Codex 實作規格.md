# Browser File Tools — Codex 實作規格

## 1. 專案目標

建立純前端 Browser File Tools 網站。

技術：

- React
- Vite
- TypeScript
- 不建立 Backend API
- 檔案不得上傳 Server
- 所有檔案處理皆在 Browser 執行
- 優先使用 Browser Native API
- 必要時使用 JavaScript Library / WebAssembly

核心訴求：

> Files never leave your browser.

網站未來以 SEO、廣告、Sponsored Ads 為主要營收模式。

---

# 2. MVP 功能

第一版實作以下工具。

## Image

### Image Resize

支援：

- JPG
- PNG
- WebP

功能：

- 自訂 Width
- 自訂 Height
- Keep Aspect Ratio
- Quality：1～100
- 輸出：
  - JPG
  - PNG
  - WebP

使用：

- `createImageBitmap`
- Canvas API
- `canvas.toBlob`

---

### Image Converter

支援：

```text
JPG → PNG
JPG → WebP
PNG → JPG
PNG → WebP
WebP → JPG
WebP → PNG
```

不得將圖片送至 Server。

---

### Image Compress

功能：

- Quality Slider
- 顯示原始 Size
- 顯示輸出 Size
- 顯示壓縮比例
- Before / After Preview

---

# 3. PDF

使用：

```text
pdf-lib
```

## PDF Merge

功能：

- 多檔選擇
- Drag & Drop
- 可調整 PDF 順序
- Merge
- Download

限制：

- 全部 Browser-side
- 不得 Upload

---

## PDF Split

功能：

輸入：

```text
1
1-3
1,3,5
1-3,5,8-10
```

輸出新 PDF。

需驗證頁碼合法性。

---

## PDF Rotate

支援：

```text
90°
180°
270°
```

可：

- 全部頁面
- 指定頁面

---

# 4. Data Tools

## JSON Formatter

功能：

- Format
- Minify
- Validate
- Copy
- Download `.json`

錯誤時顯示：

```text
JSON parse error
line
column
error message
```

---

## CSV Viewer

建議使用：

```text
PapaParse
```

功能：

- Drag & Drop CSV
- Table Preview
- 自動辨識 Header
- 顯示：
  - Rows
  - Columns
  - File Size

大型 CSV 不得一次 render 全部 DOM。

需限制 Preview Row，例如：

```text
Maximum preview: 1000 rows
```

---

## CSV → JSON

功能：

- Header 作為 Property Name
- Preview JSON
- Download `.json`

---

## JSON → CSV

支援：

```json
[
  {
    "name": "Tom",
    "age": 20
  }
]
```

輸出：

```csv
name,age
Tom,20
```

---

# 5. Text Tools

## Base64

功能：

```text
Text → Base64
Base64 → Text
File → Base64
```

File 必須在 Browser 讀取。

---

## Hash Generator

使用 Browser：

```typescript
crypto.subtle.digest()
```

支援：

- SHA-1
- SHA-256
- SHA-384
- SHA-512

不要加入 MD5。

---

## UUID Generator

使用：

```typescript
crypto.randomUUID()
```

功能：

- 單筆
- 批次產生

最大：

```text
1000
```

---

# 6. QR Code

使用成熟 JavaScript Library。

功能：

- Text / URL
- Size
- Error correction level
- PNG Download

不得呼叫第三方 QR API。

---

# 7. UI 架構

首頁：

```text
Header

Browser File Tools
Files never leave your browser.

Search Tools

Popular Tools
┌──────────────┐
│ Image Resize │
└──────────────┘

┌──────────────┐
│ Compress     │
└──────────────┘

┌──────────────┐
│ PDF Merge    │
└──────────────┘

Categories

Image
PDF
Data
Text
Developer

Footer
```

Desktop 與 Mobile 都必須可正常使用。

---

# 8. Tool Page Layout

統一所有工具頁 Layout：

```text
Breadcrumb

H1
Short Description

Privacy Notice
────────────────────
Your files are processed locally.
They are never uploaded.
────────────────────

Tool Workspace

[ Drop file here ]

Options

[ Process ]

Result

[ Download ]

────────────────────
Ad Slot
────────────────────

How it works

FAQ

Related Tools
```

---

# 9. Drag & Drop

建立共用：

```typescript
<FileDropzone />
```

需支援：

- Click Select
- Drag Enter
- Drag Leave
- Drop
- Multiple
- Accept MIME Type
- Maximum Size

不得使用 Server Upload Component。

---

# 10. File Processing Architecture

建立：

```text
src/
  features/
    image/
    pdf/
    csv/
    json/
    text/
    qr/

  components/
    FileDropzone
    FileInfo
    DownloadButton
    ToolLayout
    PrivacyNotice
    AdSlot

  services/
    image
    pdf
    csv
    file

  utils/
    fileSize
    download
    mime
    validation

  pages/
```

File Processing Logic 不得直接塞在 React Component。

例如：

```typescript
resizeImage(...)
mergePdf(...)
splitPdf(...)
parseCsv(...)
generateHash(...)
```

放在 service / utility。

---

# 11. TypeScript

禁止：

```typescript
any
```

除非第三方 Library 型別確實無法避免。

定義：

```typescript
export interface FileProcessResult {
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
}
```

各工具需有自己的 Option Type。

例如：

```typescript
export interface ImageResizeOptions {
  width: number;
  height: number;
  keepAspectRatio: boolean;
  quality: number;
  format: "jpeg" | "png" | "webp";
}
```

---

# 12. Download

統一建立：

```typescript
downloadBlob(blob, filename)
```

使用：

```typescript
URL.createObjectURL()
```

下載完成後：

```typescript
URL.revokeObjectURL()
```

避免 Memory Leak。

---

# 13. Memory 管理

大量 File / Blob 必須注意 Browser Memory。

當：

- Component Unmount
- 新結果覆蓋舊結果
- Download 完成

應清除：

```typescript
Object URL
ImageBitmap
Canvas Reference
Large ArrayBuffer
```

---

# 14. File Size Limit

初期限制：

```text
Image       50 MB
PDF        100 MB
CSV         100 MB
Other       50 MB
```

超過顯示：

```text
This file is too large to process safely in your browser.
```

限制集中於 config：

```typescript
export const FILE_LIMITS = {
  image: 50 * 1024 * 1024,
  pdf: 100 * 1024 * 1024,
  csv: 100 * 1024 * 1024,
};
```

---

# 15. Privacy

網站不得：

- Upload 使用者 File
- 將 File Content 傳送 Analytics
- 將 File Name 傳送 Analytics
- 將 File Content 寫入 localStorage
- 將 File Content 寫入 IndexedDB

Analytics 只能紀錄：

```text
tool_open
process_start
process_success
process_failed
download
```

例如：

```json
{
  "tool": "pdf-merge"
}
```

不得包含檔案內容。

---

# 16. Ad Slot

建立：

```tsx
<AdSlot position="tool-result" />
```

第一版可以只是 Placeholder：

```text
Advertisement
```

未來才接：

- Google AdSense
- Direct Sponsored Ads

Component 必須與 Tool Logic 完全分離。

---

# 17. SEO

每個 Tool 必須有獨立 URL：

```text
/image/resize
/image/compress
/image/convert

/pdf/merge
/pdf/split
/pdf/rotate

/data/json-formatter
/data/csv-viewer
/data/csv-to-json
/data/json-to-csv

/text/base64
/text/hash
/text/uuid

/qr-code
```

每頁必須有：

```text
title
description
canonical
H1
```

例如：

```text
Free Online PDF Merge - Browser File Tools
```

Description：

```text
Merge PDF files directly in your browser.
Your files are never uploaded.
```

---

# 18. Routing

使用：

```text
react-router
```

Tool Route 必須支援直接開啟：

```text
https://site.com/pdf/merge
```

Static Hosting Refresh 不得 404。

---

# 19. UI State

工具 Processing 狀態：

```typescript
"idle"
"processing"
"success"
"error"
```

Process 執行期間：

- Disable Process Button
- 顯示 Processing
- 防止重複執行

---

# 20. Error Handling

所有工具均需捕捉錯誤。

不得：

```typescript
catch {}
```

顯示 User-Friendly Error：

```text
Unable to process this file.

The file may be corrupted or unsupported.
```

Console 可保留詳細 Error。

---

# 21. Web Worker

MVP 不強制所有功能使用 Web Worker。

但以下 Service 設計時不得與 UI 強耦合：

```text
PDF
大型 CSV
圖片大量處理
```

確保後續可移至：

```text
Web Worker
```

避免重構整個 Component。

---

# 22. Accessibility

至少：

- Button 可 Keyboard 操作
- File Input 有 Label
- Error 使用 `role="alert"`
- Form Field 有 Label
- Drag Drop 不能是唯一上傳方式
- Loading 狀態提供 `aria-busy`

---

# 23. Styling

使用：

```text
CSS Modules
```

或專案統一 CSS。

不要引入大型 UI Framework。

視覺：

```text
簡潔
工具導向
Desktop 優先
Mobile Responsive
```

主要內容最大寬度：

```css
max-width: 1200px;
```

---

# 24. Testing

使用：

```text
Vitest
React Testing Library
```

至少測試：

### Utility

```text
fileSize
download filename
JSON parsing
CSV conversion
page range parser
```

### Service

```text
JSON → CSV
CSV → JSON
Hash
UUID
PDF page range parser
```

### Component

```text
FileDropzone
Tool error state
Tool processing state
```

不要求 E2E。

---

# 25. Build

必須可以：

```bash
npm install
npm run dev
npm run build
npm run test
```

且：

```bash
npm run build
```

不得有 TypeScript Error。

---

# 26. 第一階段實作順序

依以下順序完成：

```text
1. Vite + React + TypeScript 基礎專案
2. Routing
3. Global Layout
4. ToolLayout
5. FileDropzone
6. Download Utility

7. JSON Formatter
8. Base64
9. Hash
10. UUID

11. Image Resize
12. Image Converter
13. Image Compress

14. CSV Viewer
15. CSV → JSON
16. JSON → CSV

17. PDF Merge
18. PDF Split
19. PDF Rotate

20. QR Code

21. SEO Metadata
22. AdSlot
23. Unit Tests
24. Responsive
25. Production Build
```

---

# 27. MVP Definition of Done

MVP 完成必須符合：

- React + Vite + TypeScript
- 無 Backend
- 所有 File Processing 在 Browser
- File 不會送至 Server
- 所有工具具有獨立 Route
- Desktop / Mobile 正常
- Drag & Drop 正常
- Processing / Error State 正常
- Process 後可以 Download
- Object URL 有正確 Release
- TypeScript 無 Error
- `npm run build` 成功
- `npm run test` 成功
- 無使用 `any` 作為一般實作捷徑

---

# 28. Codex 實作原則

Codex 執行時：

1. 先建立可執行的完整基礎架構。
2. 每完成一個 Tool 即確保可操作。
3. 不要一次建立大量 Placeholder。
4. Service 與 React Component 分離。
5. 不建立 Backend。
6. 不建立 Upload API。
7. 不加入 Authentication。
8. 不加入 Database。
9. 不提前建立會員、訂閱、付款功能。
10. 不為未來需求過度抽象。
11. 優先使用 Browser Native API。
12. 只有 Native API 無法合理完成時才加入 Library。
13. 第三方 Library 必須有實際用途。
14. File Content 永遠不得離開 Browser。
15. 完成後執行 Build 與 Test，修正所有錯誤。

第一階段目標不是完成大型 SaaS，而是建立一個：

**快速、免費、Client-side、Privacy-first、可持續增加工具、可透過 SEO 與廣告變現的 Browser File Tools 網站。**