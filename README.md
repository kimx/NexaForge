# NexaForge — 在瀏覽器內完成你所有常用文件與資料工具

**NexaForge** 是一個以隱私為優先、專為日常工作設計的線上工具平台。  
你可以在同一個網站完成圖片處理、PDF 操作、資料轉換、文字工具與開發者小幫手，所有流程都在你的瀏覽器中完成，不需註冊、不需上傳文件。

## 產品定位

NexaForge 目標是成為「打開瀏覽器就能用」的效率中樞：
- 快速完成重複且零門檻的格式轉換任務
- 不依賴後端 API，減少資料外傳風險
- 一個介面整合多類型工具，減少切換多個網站的時間

## 我們解決的問題

### 1) 你需要小工具，但總是要跑很多網站
NexaForge 將常見工具集中到一個站點，從圖片到 PDF、從 JSON 到 CSV，一站就能完成多個步驟。

### 2) 檔案隱私顧慮高
 所有上傳、編輯與轉換皆在前端執行，檔案本體不會被傳到外部伺服器儲存或分析。

## 產品網址

- 線上服務：**https://nexaforge.kimx.info**

## 核心功能

### 圖片工具
- **圖片拼貼與合成長圖**：將最多 20 張照片或截圖依指定順序拼成直向長圖、橫向排列或網格，支援背景、間距、比例保留與 JPG / PNG 下載
- **圖片轉文字（OCR）**：在瀏覽器 worker 辨識繁中與英文，可複製或下載 UTF-8 文字；首次使用需下載語言模型，圖片不會上傳
- **手機文件掃描**：手機拍照或選取文件照片，手動調整四角進行透視校正，支援彩色、灰階與黑白輸出及 JPG / PDF 下載
- **Image Resize / Compress**：最多 20 張圖片批次調整尺寸或壓縮，支援單檔與 ZIP 下載
- **Image Converter**：轉換 JPG / PNG / WebP / AVIF，另有 HEIC / HEIF → JPG / PNG
- **Image Crop**：矩形、圓形、預設比例與自訂形狀裁切
- **EXIF Viewer**：檢視 JPEG 相片中的 EXIF 中繼資料
- **Remove EXIF**：移除 JPEG 相片中的 EXIF 中繼資料
- **Image → Base64**：輸出原始 Base64 或 Data URL
- **SVG Optimizer**：保留 viewBox 的安全 SVG 最佳化與下載
- **Favicon Generator**：產生 ICO、平台 PNG 圖示與 web manifest
- **Social Media Image Resizer**：產生 Instagram、Facebook、X、LinkedIn、YouTube 與自訂尺寸
- **Image → PDF**：多張 JPG、PNG、WebP 依指定順序合併，每張圖片各佔一頁
- **Image Watermark**：批次加入文字或 Logo 浮水印，支援即時預覽、定位、單檔與 ZIP 下載

### PDF 工具
- **PDF 壓縮**：保留文字重寫，或選擇 JPEG 頁面壓縮並調整品質與解析度；比較實際大小，未縮小時保留原檔。JPEG 模式不保留可搜尋文字、連結、表單與簽章
- **PDF Merge**：合併多份 PDF
- **PDF Split**：依頁碼切分 PDF
- **PDF Rotate**：旋轉頁面方向
- **PDF → Image**：多頁 PDF 逐頁轉為 PNG，支援預覽、單張與 ZIP 下載

### 資料工具
- **JSON Formatter**：格式化、壓縮與驗證 JSON
- **CSV Viewer**：檢視與快速預覽 CSV
- **CSV → JSON**：CSV 轉 JSON
- **JSON → CSV**：JSON 轉 CSV
- **JSON ↔ XML**：依 @attribute、#text 與陣列規則雙向轉換
- **XML Formatter**：驗證、格式化與壓縮 XML

### 文字工具
- **批次重新命名**：最多 200 個檔案，預覽前後綴、文字取代、序號與檔名衝突，下載內容不變的改名 ZIP 副本
- **清單清理範本**：一次輸入名單，檢查清理 → 去重 → 排序規則後執行；逐步預覽結果，並將規則儲存為個人範本
- **Word Counter**：統計文字、字元與行數
- **Case Converter**：快速轉換大小寫樣式
- **Remove Duplicate Lines**：移除重複行並保留首次出現
- **Sort Lines**：將文字逐行排序
- **Hash Generator**：生成安全雜湊
- **UUID Generator**：批次建立 UUID v4、UUID v7 與相容 .NET Guid 的格式

### 開發者工具
- **Base64**：文字與檔案的 Base64 互轉
- **JWT Decoder / JWT Key Generator**：開發驗證流程輔助
- **Regex Tester**：安全測試 JavaScript 正則表達式、旗標與擷取群組
- **SQL Formatter**：格式化或壓縮 SQL Server、PostgreSQL 與 MySQL 查詢
- **Cron Expression Builder**：建立五欄 Cron 並預覽未來五次執行時間
- **URL Parser**：拆解 URL 結構並保留重複的查詢參數
- **cURL → Code**：將 cURL 轉成 C#、JavaScript、Python 或 PowerShell
- **Password & Key Generator**：產生密碼、API Key、Hex、Base64 並顯示熵資訊
- **JSON → C# Class**：產生巢狀類別、可空型別與 JSON 欄位對應
- **JSON → TypeScript Interface**：產生 interface、聯集與可選欄位

### QR 與條碼工具
- **QR Code Generator / Reader**：建立 QR 圖片，或從圖片與相機辨識 QR
- **Code128 / EAN-13 Barcode Generator**：輸出 PNG 或 SVG 條碼
- **Wi-Fi QR Generator**：將 SSID、安全性與密碼製成 Wi-Fi QR
- **vCard QR Generator**：建立 vCard 3.0 聯絡人 QR

## 三條完整工作流程

首頁「一次完成整個任務」與相關工具頁提供三個雙語流程入口：

- `/workflows/image-delivery`：圖片縮放 → 文字浮水印 → ZIP 打包 → 下載。支援 JPG、PNG、WebP，最多 20 張、來源總大小 200 MiB；可預覽每張圖片，ZIP 重名檔案會加序號。
- `/workflows/document-text`：拍攝或選取文件照片 → 四角校正 → OCR → 校對與文字清理 → UTF-8 文字下載或複製。首次 OCR 需下載模型，可取消並重試。
- `/workflows/pdf-delivery`：依選定順序合併 PDF → 加頁碼 → 壓縮 → 下載。最多 20 份、來源總大小 100 MiB；每階段可檢查第一頁縮圖與頁數。壓縮未縮小時保留加入頁碼的版本；JPEG 模式會移除可選取文字、連結、表單與簽章。

英文路由使用 `/en/workflows/...`。檔案只需在流程開始時選取；步驟可返回檢查，修改上游檔案或設定會清除後續結果。取消或失敗保留已完成的前一步，僅全部圖片處理成功才會開放 ZIP 打包。檔案與文字不會寫入瀏覽器儲存空間，離開或重新整理流程頁即清除。

可選的真實瀏覽器驗證使用 `node scripts/verify-file-workflows.mjs`（需 Playwright）。以 `AUDIT_BASE_URL` 指定本機網址，`AUDIT_OUTPUT` 指定證據目錄，或用 `PLAYWRIGHT_MODULE_PATH` 指向既有 Playwright 套件。

## 技術特性

- 前端：Vite + React + TypeScript
- 路由：React Router（SPA）
- 部署導向：可直接部署到 Vercel / Netlify / Azure Static Web Apps 等靜態平台
- 設計原則：輕量、快速、低風險、可離線使用

### 個人化工具入口

首頁與工具頁可釘選常用工具；從側欄、相關工具或直接網址進入，也會更新最近使用的 4 項工具。圖片壓縮會記住格式與品質，文字清理會記住核取選項；各頁可重設選項，首頁「個人設定」可分別清除最近使用、釘選與已儲存選項。

這些設定只保存在目前瀏覽器，不包含檔案或輸入內容。清單範本另保存名稱、步驟與規則，可在清單清理頁新增、重新命名或刪除；首頁清除個人設定不會刪除清單範本、QR 設定或語言偏好。

## 立即體驗

```bash
npm install
npm run dev
```

- 本機預設網址：`http://localhost:5173`
- 打包：`npm run build`
- 測試：`npm run test`
- OCR 引擎與 worker 資產會在 install、dev、build 時自動複製至 `public/ocr/`；首次辨識時從 `tessdata.projectnaptha.com` 下載所選語言模型。檔案內容不會送到該主機。此功能需要支援 worker、`createImageBitmap` 與 `OffscreenCanvas` 的新版瀏覽器。
- 預覽建置結果：`npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`

### SEO 靜態輸出

`npm run build` 會在 `dist/` 產生每個繁中與英文索引路由的預渲染 HTML，並同步輸出：

- `dist/sitemap.xml`：正式網域的雙語 URL 與 reciprocal `hreflang`
- `dist/robots.txt`：允許索引並指向正式 sitemap
- 各路由的 `index.html`：包含 canonical、Open Graph、Twitter Card、結構化資料與可見頁面內容

部署正式站後，可在 Google Search Console 新增 `https://nexaforge.kimx.info/sitemap.xml`，再以網址檢查抽查重要搜尋頁面。提交 sitemap 與要求重新建立索引屬於部署後的站長操作，不由本機 build 自動執行。

## 授權條款

本專案採用 MIT License：

- [MIT License（英文原文）](LICENSE)
- [MIT License（繁體中文翻譯）](LICENSE.zh-TW.md)

繁體中文版本僅供閱讀與理解；如與英文原文有差異，以英文 `LICENSE` 為準。

## 開源與關注

- 專案原始碼：<https://github.com/kimx/NexaForge>
- GitHub 上可提交 issue、需求與更新需求
