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
- **Image Resize**：調整尺寸、保留品質與預覽
- **Image Compress**：壓縮圖片，提升傳輸與儲存效率
- **Image Converter**：快速轉換 JPG / PNG / WebP 等格式
- **EXIF Viewer**：檢視 JPEG 相片中的 EXIF 中繼資料
- **Remove EXIF**：移除 JPEG 相片中的 EXIF 中繼資料

### PDF 工具
- **PDF Merge**：合併多份 PDF
- **PDF Split**：依頁碼切分 PDF
- **PDF Rotate**：旋轉頁面方向

### 資料工具
- **JSON Formatter**：格式化、壓縮與驗證 JSON
- **CSV Viewer**：檢視與快速預覽 CSV
- **CSV → JSON**：CSV 轉 JSON
- **JSON → CSV**：JSON 轉 CSV

### 文字工具
- **Word Counter**：統計文字、字元與行數
- **Case Converter**：快速轉換大小寫樣式
- **Remove Duplicate Lines**：移除重複行並保留首次出現
- **Sort Lines**：將文字逐行排序
- **Hash Generator**：生成安全雜湊
- **UUID Generator**：快速建立 UUID

### 開發者工具
- **Base64**：文字與檔案的 Base64 互轉
- **JWT Decoder / JWT Key Generator**：開發驗證流程輔助
- **Regex Tester**：安全測試 JavaScript 正則表達式、旗標與擷取群組

### QR 與條碼工具
- **QR Code Generator / Reader**：建立 QR 圖片，或從圖片與相機辨識 QR
- **Code128 / EAN-13 Barcode Generator**：輸出 PNG 或 SVG 條碼
- **Wi-Fi QR Generator**：將 SSID、安全性與密碼製成 Wi-Fi QR
- **vCard QR Generator**：建立 vCard 3.0 聯絡人 QR

## 技術特性

- 前端：Vite + React + TypeScript
- 路由：React Router（SPA）
- 部署導向：可直接部署到 Vercel / Netlify / Azure Static Web Apps 等靜態平台
- 設計原則：輕量、快速、低風險、可離線使用

## 立即體驗

```bash
npm install
npm run dev
```

- 本機預設網址：`http://localhost:5173`
- 打包：`npm run build`
- 測試：`npm run test`
- 預覽建置結果：`npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`

## 開源與關注

- 專案原始碼：<https://github.com/kimx/NexaForge>
- GitHub 上可提交 issue、需求與更新需求
