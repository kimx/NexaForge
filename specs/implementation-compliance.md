# Browser File Tools — 實作規格驗證清單（MVP）

目標：以規格 `Browser File Tools — Codex 實作規格.md` 為準，逐條證據化目前完成度。

## 已驗證（含程式碼 / 測試 / 指令）

### 開發骨架與技術
- React / Vite / TypeScript / 無後端 API
  - 專案組態：`package.json`、`vite.config.ts`、`src/main.tsx`
  - 全域建置：`npm run build` 成功

### 工具頁與路由
- 圖片工具、PDF、Data、Text、QR Route 均已註冊
  - `src/App.tsx`
- 首頁、Header/Footer、工具目錄資料
  - `src/pages/HomePage.tsx`
  - `src/components/Header.tsx`
  - `src/components/Footer.tsx`
  - `src/data/tools.ts`

### Tool Page Layout 與 SEO
- Tool 模板含 Workspace / Options / Result / How it works / FAQ / Related Tools / Ad Slot / Privacy Notice / breadcrumb
  - `src/components/ToolPageTemplate.tsx`
  - `src/components/PrivacyNotice.tsx`
  - `src/components/AdSlot.tsx`
- SEO meta 與 canonical
  - `src/hooks/useSeo.ts`
- 路由渲染與 canonical 連結已補充單元驗證
  - `src/App.test.tsx`
- 首頁 SEO 元資料已補齊（標題 / 描述 / canonical）
  - `src/pages/HomePage.tsx`
- 各工具已設定 `ToolMeta`，包含 title、description、canonical、h1
  - 各頁面元件（如 `src/pages/data/JsonFormatterPage.tsx` 等）

### 檔案處理與服務層分離
- 核心處理邏輯放在 services，而非元件直接處理
  - `src/services/*`
- 文字、CSV/JSON、圖片、PDF、QR 服務皆有可測試邏輯
  - `src/services/text/textService.ts`
  - `src/services/json/jsonService.ts`
  - `src/services/csv/csvService.ts`
  - `src/services/image/imageService.ts`
  - `src/services/pdf/pdfService.ts`
  - `src/services/qr/qrService.ts`

### 驗證、錯誤、Processing 狀態
- 檔案大小限制與 MIME 驗證
  - `src/config/fileLimits.ts`
  - `src/utils/validation.ts`
- Processing state（idle/processing/success/error）與 disabled/`aria-busy`
  - 各工具頁面實作
- 錯誤訊息 fallback
  - 各工具頁面 catch flow（例如 `process_failed` 時顯示 user-facing error）

### 下載與記憶體處理
- 下載使用 `URL.createObjectURL()` + `URL.revokeObjectURL()`
  - `src/utils/download.ts`
- 預覽 Blob URL 使用 hook，unmount 時回收
  - `src/hooks/useBlobUrl.ts`

### Drag & Drop / 檔案輸入
- 共用 `FileDropzone` 支援拖拉、點選、multiple、accept、size/max check、拒絕回報
  - `src/components/FileDropzone.tsx`
  - `src/components/FileDropzone.test.tsx`

### 主要工具功能
- Image Resize / Convert / Compress
  - `src/pages/image/*`
- PDF Merge / Split / Rotate
  - `src/pages/pdf/*`
- Data: JSON Formatter / CSV Viewer / CSV→JSON / JSON→CSV
  - `src/pages/data/*`
- Text: Base64 / Hash / UUID
  - `src/pages/text/*`
- QR: Generate PNG
  - `src/pages/qr/*`
- 服務與頁面測試
  - `src/pages/**.test.tsx`
  - `src/services/**.test.ts`
  - `npm run test`

### 部署與直刷（Static Hosting）
- Vite build 通過，輸出 404/redirect 配置
  - `public/404.html`
  - `public/_redirects`
  - `public/.htaccess`
  - `netlify.toml`
  - `vercel.json`
- `vite preview` 對 `/data/json-formatter` 回傳 200（非 404）
  - 實驗指令：`npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`
  - 實測結果：`curl -I http://127.0.0.1:4173/data/json-formatter` 回應 `200 OK`
- 建置分塊策略已實作（`manualChunks`）
  - `vite.config.ts`
  - `npm run build` 無單一 chunk 超過預設警告門檻

### 隱私 / Telemetry
- 不上傳檔名/內容到追蹤事件
  - `src/utils/analytics.ts`
  - `src/utils/analytics.test.ts`

## 已覆蓋測試
- 全量測試：`npm run test` => 22 檔、66 測試通過（含新增 App route + Data / QR / analytics 驗證）
- 全量建置：`npm run build` 成功

## 待補（可行但非必需於程式邏輯）
- 手機實機體驗確認（雖有 RWD CSS，建議實機截圖或 Playwright smoke）
- SEO 首頁/子頁 meta 深化驗證（除路由基本覆蓋外，可再補每頁 title/description/canonical 單元測試）
- 部署平台最終端到端驗證（Netlify/Vercel/GitHub Pages 實際上線後回路測試）
