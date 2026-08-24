# 圖片加浮水印功能設計

## 摘要

NexaForge 將新增「圖片加浮水印」工具，讓使用者在瀏覽器內為最多 20 張圖片批次套用相同的文字或 Logo 浮水印。工具採純前端 Canvas 處理，不上傳來源圖片、Logo 或輸出檔案。

第一版支援 JPG、PNG 與 WebP，提供即時預覽、拖曳定位、九宮格快速定位、透明度、相對大小與旋轉設定。處理結果維持原始像素尺寸與圖片格式，可逐張下載或打包成 ZIP。

## 目標

- 讓使用者在單一流程內為最多 20 張圖片加入一致的文字或 Logo 浮水印。
- 讓不同尺寸與方向的來源圖片使用相對座標後仍保持一致的視覺位置。
- 維持 NexaForge 的隱私原則：所有讀取、預覽、合成與下載均在瀏覽器完成。
- 沿用既有的檔案驗證、批次處理、結果呈現與 ZIP 下載模式。
- 提供滑鼠、觸控與鍵盤皆可完成的定位操作。

## 非目標

- 同一次輸出疊加文字與 Logo 兩個圖層。
- 為每張來源圖片保存不同的浮水印設定。
- 平鋪、重複或多圖層浮水印。
- SVG Logo、動畫圖片、HEIC、AVIF 或 PDF 輸入。
- 任意字型上傳、進階文字排版或完整影像編輯功能。
- 在浮水印工具內提供額外的格式轉換或尺寸調整流程。

## 使用者流程

1. 使用者進入 `/image/watermark` 或 `/en/image/watermark`。
2. 使用者上傳一至 20 張 JPG、PNG 或 WebP 圖片。
3. 工具以第一張來源圖片顯示即時預覽。
4. 使用者選擇「文字」或「Logo」浮水印模式。
5. 文字模式下，使用者輸入文字並設定系統字型、顏色、相對大小、透明度及旋轉角度。
6. Logo 模式下，使用者上傳一張 JPG、PNG 或 WebP，並設定相對寬度、透明度及旋轉角度。
7. 使用者可在預覽上拖曳浮水印，或用九宮格按鈕快速定位；亦可用數值控制調整位置。
8. 使用者執行批次處理。頁面顯示已完成數量與總數。
9. 使用者可下載各個成功結果，或將所有成功結果下載為 ZIP。
10. 若部分項目失敗，成功項目仍可下載，失敗項目則顯示原因。

## 架構

### `ImageWatermarkPage`

新增 `src/pages/image/ImageWatermarkPage.tsx`，負責：

- 來源圖片、目前預覽圖片與浮水印設定的狀態。
- 檔案選取與驗證結果。
- 批次執行、進度、成功結果與逐項錯誤。
- 設定變更後使舊輸出失效。
- 組合既有 `ToolPageTemplate`、`FileDropzone`、`FileInfo`、`BatchFileResults` 與 `DownloadCollectionButton`。

### `WatermarkEditor`

新增 `src/components/WatermarkEditor.tsx`，負責：

- 顯示目前預覽圖片與浮水印圖層。
- 支援指標拖曳與觸控定位。
- 提供九宮格快速定位按鈕及可存取名稱。
- 將互動位置轉換為正規化座標，而非保存預覽像素。
- 讓鍵盤使用者能透過 X/Y 數值控制完成相同定位。

元件不負責產生下載檔案。它只接收來源預覽、設定值與變更回呼，避免把批次流程與編輯器互動耦合。

### `watermarkService`

新增 `src/services/image/watermarkService.ts`，負責：

- 解碼來源圖片及選用的 Logo。
- 將正規化設定解析為目標圖片的實際像素幾何。
- 在 Canvas 繪製來源圖片與單一文字或 Logo 圖層。
- 套用透明度、縮放與旋轉。
- 將浮水印限制在有效畫布範圍內。
- 依來源格式輸出 JPG、PNG 或 WebP，並回傳 `FileProcessResult`。
- 將輸出檔名改為 `<原檔名>-watermarked.<原副檔名>`；JPEG 統一使用 `.jpg`。

預覽與輸出必須共用相同的幾何計算函式，避免兩套座標邏輯造成預覽與下載成品偏移。

### 路由、工具清單與內容

- 在 `src/data/tools.ts` 註冊 `image-watermark`，路徑為 `/image/watermark`，分類為 `Image`。
- 在 `src/App.tsx` 加入延遲載入元件與基礎路由；既有本地化路由機制自動建立 `/en/image/watermark`。
- 新增繁中與英文介面文案、操作說明與 FAQ。
- 讓工具進入首頁、側欄、搜尋、相關工具與 SEO 預渲染索引。

## 資料模型

浮水印設定使用可序列化且與輸出尺寸無關的資料模型：

```ts
type WatermarkMode = "text" | "image";

interface WatermarkPosition {
  x: number; // 浮水印中心點，0 至 1
  y: number; // 浮水印中心點，0 至 1
}

interface BaseWatermarkOptions {
  mode: WatermarkMode;
  position: WatermarkPosition;
  opacity: number; // 0.05 至 1
  rotation: number; // -180 至 180 度
}

interface TextWatermarkOptions extends BaseWatermarkOptions {
  mode: "text";
  text: string;
  fontFamily: string; // 限定的跨平台系統字型選項
  color: string;
  sizeRatio: number; // 相對於來源圖片短邊
}

interface ImageWatermarkOptions extends BaseWatermarkOptions {
  mode: "image";
  logo: File;
  widthRatio: number; // 相對於來源圖片寬度
}

type WatermarkOptions = TextWatermarkOptions | ImageWatermarkOptions;
```

九宮格定位會將水平與垂直位置設為預先定義的安全區中心。拖曳後則保存浮水印中心點的正規化座標。幾何計算需納入旋轉後的外框，確保浮水印不會完全移出圖片。

## 輸入與輸出規則

- 來源圖片：JPG、PNG、WebP，一至 20 張，每張最多 20 MB。
- Logo：JPG、PNG、WebP，一張，套用與現有圖片檔案一致的單檔大小上限。
- 來源尺寸與輸出尺寸相同。
- 輸出 MIME 類型與來源格式相同。
- JPG 與 WebP 使用固定的高品質輸出值；PNG 使用無損 Canvas 輸出。
- 透明 Logo 應使用 PNG 或 WebP；JPG 的背景會照原檔保留。
- 來源圖片原有 EXIF 與其他中繼資料不保留，這是 Canvas 重新編碼的既有行為。

## 預設值與控制項

- 預設模式：文字。
- 預設位置：右下角安全區。
- 預設透明度：70%。
- 預設旋轉：0 度。
- 文字預設顏色：白色，並提供有限的跨平台系統字型選項。
- 文字大小與 Logo 寬度以百分比呈現，內部保存為比例。
- X/Y 位置、透明度、大小與旋轉均提供有標籤的數值或範圍輸入。
- 九宮格每個按鈕都要有描述位置的可存取名稱與可見選取狀態。

## 狀態與資料流

1. `FileDropzone` 回傳來源檔案後，頁面以 `validateImageBatch` 驗證數量、類型與大小。
2. 頁面為第一張有效來源圖片建立預覽 URL，並將其傳給 `WatermarkEditor`。
3. `WatermarkEditor` 只回傳正規化設定，不保存來源檔案或批次結果。
4. 使用者執行處理時，頁面把不可變的設定快照交給 `runBatch`。
5. `runBatch` 以並行數 2 呼叫 `watermarkService`，並回報進度。
6. 頁面忽略已被新版設定或新操作取代的非同步結果。
7. 成功結果沿用既有個別下載及 ZIP 打包元件；失敗結果保留逐項錯誤。
8. 來源、Logo 或設定改變時清除舊結果，避免輸出與畫面設定不一致。

## 驗證與錯誤處理

- 超過 20 張、單檔超過 20 MB、MIME 類型不支援或圖片無法解碼時顯示明確錯誤。
- 文字模式下，去除首尾空白後不得為空字串。
- Logo 模式下必須有一張通過驗證的 Logo。
- 大小比例、透明度、旋轉與座標必須為有限數值且位於允許範圍。
- 無效設定或批次處理中停用主要執行按鈕。
- 單張失敗不終止整批；若全部失敗，工作流程狀態為錯誤。
- 若至少一張成功，保留成功結果並同時呈現失敗項目的原因。
- 圖片解碼、Canvas context 建立及 Blob 序列化失敗時回傳可呈現的錯誤。
- 新的處理操作以 operation token 取代舊操作，避免競態條件覆蓋新結果。

## 資源生命週期

- 預覽 Blob URL 在來源或 Logo 變更以及元件卸載時撤銷。
- 每次建立的 `ImageBitmap` 在處理完成或失敗後關閉。
- 不將來源圖片、Logo 或輸出內容寫入 localStorage。
- 批次處理維持並行數 2，降低大型圖片同時解碼造成的記憶體尖峰。

## 可及性與響應式行為

- 所有欄位具有可見標籤，錯誤訊息使用既有的 live region／alert 模式。
- 拖曳不是唯一的定位方式；九宮格與 X/Y 控制可由鍵盤完成。
- 編輯器以焦點樣式顯示目前可操作圖層，九宮格按鈕以 `aria-pressed` 表示選取狀態。
- 預覽區在窄螢幕按可用寬度縮放，但正規化座標不受 CSS 顯示尺寸影響。
- 指標拖曳採 Pointer Events，涵蓋滑鼠、觸控與手寫筆。
- 控制項沿用現有表單樣式與色彩 token，並維持既有對比與焦點規則。

## 測試策略

### 服務單元測試

新增 `src/services/image/watermarkService.test.ts`，涵蓋：

- 文字與 Logo 模式分別產生正確 MIME 類型、尺寸與檔名。
- 正規化座標在不同尺寸與橫直向來源上換算正確。
- 九宮格定位與安全區計算。
- 相對大小、透明度與旋轉傳入 Canvas 的行為。
- 旋轉外框的邊界限制。
- 無效設定、圖片解碼失敗、缺少 Canvas context 與 Blob 失敗。
- `ImageBitmap` 在成功與失敗路徑皆會關閉。

### 編輯器元件測試

新增 `src/components/WatermarkEditor.test.tsx`，涵蓋：

- 文字與 Logo 預覽模式。
- 九宮格按鈕更新位置及選取狀態。
- Pointer Events 拖曳後回傳正規化座標。
- X/Y 控制可由鍵盤更新位置。
- 各控制項的標籤、焦點與可存取名稱。

### 頁面整合測試

新增 `src/pages/image/ImageWatermarkPage.test.tsx`，涵蓋：

- 一至 20 張有效圖片可進入處理流程。
- 超量、超過檔案上限與錯誤類型被拒絕。
- 文字空白或缺少 Logo 時不能執行。
- 設定或檔案改變後舊結果被清除。
- 進度、部分成功、全部失敗、重試及重新處理狀態。
- 個別下載與 ZIP 下載只包含成功結果。

### 路由與回歸測試

- 驗證 `/image/watermark` 與 `/en/image/watermark` 可渲染工具頁。
- 驗證工具出現在首頁、側欄、搜尋及可索引路由。
- 驗證預渲染輸出包含雙語 canonical、hreflang 與工具內容。
- 執行完整 `npm test` 與 `npm run build`。
- 手動檢查桌面與行動版的拖曳、九宮格、鍵盤定位，以及不同圖片尺寸的預覽／輸出一致性。

## 完成標準

- 使用者能在不連線到後端的情況下，為最多 20 張 JPG、PNG 或 WebP 套用共同的文字或 Logo 浮水印。
- 預覽中的位置、大小與旋轉和下載成品一致。
- 不同尺寸與方向的來源圖片會依相同的相對設定產生合理一致的版面。
- 批次中的失敗項目不會阻止成功項目下載。
- 個別與 ZIP 下載均能正常使用，輸出維持來源尺寸及格式。
- 滑鼠、觸控與鍵盤使用者皆可完成核心流程。
- 完整測試與正式建置通過，且既有工具行為無回歸。
