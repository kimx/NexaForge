# 使用統計與回饋規格

## 範圍與隱私

第一版只觀測文字清理、移除重複行、逐行排序和圖片壓縮的流程；其他工具沿用相同的事件格式時也可以收集。所有文字、文件、檔名、JWT、金鑰、QR 內容、搜尋原文和自由輸入值都禁止進入事件。

事件不包含永久使用者識別。`operationId` 只在一次處理流程期間使用，頁面關閉後不保存；瀏覽器不保存事件佇列。預設只在設定 `VITE_ANALYTICS_ENDPOINT` 時送出 HTTP `POST`，端點未設定、回應失敗或 `fetch` 不可用都不會阻塞工具或下載。

工具頁的隱私提醒提供停用／重新啟用按鈕；停用會在本機寫入 `nexaforge-analytics-disabled=true`，之後不再送出或發出本機 analytics event。收集端應保留事件最多 90 天，並限制只有營運報表可讀取。第一版不做跨週留存、永久使用者識別或自動附上操作內容。

## 事件定義

收集端收到的欄位為 `eventId`、`event`、`occurredAt`、`language` 和下表白名單欄位。`tool` 使用程式內工具 ID；`language` 只有 `en` 或 `zh-TW`。

| 事件 | 意義 | 主要欄位 |
| --- | --- | --- |
| `tool_open` | 工具頁完成開啟 | `tool` |
| `process_start` | 使用者開始一次處理 | `tool`, `operationId` |
| `process_success` | 一次處理成功產生結果 | `tool`, `operationId`, `durationMs`, `resultCount` |
| `process_failed` | 一次處理失敗 | `tool`, `operationId`, `durationMs`, `errorCategory` |
| `copy_success` | 剪貼簿 API 成功寫入 | `tool`, `operationId` |
| `download_triggered` | 瀏覽器下載提示已被觸發 | `tool`, `operationId` |
| `workflow_continue` | 結果接續到下一個文字工具 | `sourceTool`, `targetTool`, `action` |
| `feedback_submitted` | 固定選項回饋送出 | `tool`, `feedback`, `problem` |

`download_triggered` 只是觀測代理，不代表檔案已寫入磁碟。複製失敗使用 `copy_failed`，不計入 `copy_success`；既有的 `download`、`workflow_ready` 和 `result_action_used` 名稱會在收集端映射到相同的相容事件。

## 計數與彙整

- 一次 `process_start` 加一個 `operationId` 是一個處理分母。重試會產生新的 `operationId`。
- 同一 `operationId` 的重複成功、複製或下載點擊各只計一次；因此同一結果重複點擊不會增加完成任務數。
- 成功率 = 去重後的 `process_success` / `process_start`。
- 取得結果數是成功操作中至少有一次成功複製或下載觸發的去重操作數；取得結果比例 = 取得結果數 / 成功數。
- 處理時間優先使用終止事件的 `durationMs`，沒有時以同一 `operationId` 的開始與終止時間相減，報表使用平均值。
- 錯誤依 `errorCategory` 分組；未知或未提供的值歸入 `unknown`。
- 日期以 `occurredAt` 的 UTC 日期分組，報表鍵為 `tool × date × language`。

前端的 `aggregateAnalyticsEvents` 可用於測試事件和本機報表。若收集端使用 SQL，可用下列查詢核對每日工具結果（`analytics_events` 是收集端表名，欄位可依實際資料庫映射）：

```sql
WITH operations AS (
  SELECT
    tool,
    CAST(occurred_at AS DATE) AS event_date,
    language,
    operation_id,
    MAX(CASE WHEN event = 'process_start' THEN 1 ELSE 0 END) AS started,
    MAX(CASE WHEN event = 'process_success' THEN 1 ELSE 0 END) AS succeeded,
    MAX(CASE WHEN event = 'copy_success' OR event = 'download_triggered' THEN 1 ELSE 0 END) AS acquired,
    MAX(CASE WHEN event = 'process_success' THEN duration_ms END) AS duration_ms
  FROM analytics_events
  WHERE occurred_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY tool, CAST(occurred_at AS DATE), language, operation_id
)
SELECT
  tool,
  event_date,
  language,
  SUM(started) AS starts,
  SUM(succeeded) AS successes,
  SUM(CASE WHEN started = 1 AND succeeded = 0 THEN 1 ELSE 0 END) AS failures,
  SUM(CASE WHEN succeeded = 1 AND acquired = 1 THEN 1 ELSE 0 END) AS result_acquisitions,
  AVG(CASE WHEN succeeded = 1 THEN duration_ms END) AS average_processing_ms,
  SUM(succeeded)::DECIMAL / NULLIF(SUM(started), 0) AS success_rate,
  SUM(CASE WHEN succeeded = 1 AND acquired = 1 THEN 1 ELSE 0 END)::DECIMAL
    / NULLIF(SUM(succeeded), 0) AS result_acquisition_rate
FROM operations
GROUP BY tool, event_date, language
ORDER BY event_date, tool, language;
```

## 回饋

每個工具頁提供「有幫助」和「遇到問題」入口；問題只能選擇處理、複製、下載或可用性四個固定選項，沒有文字欄位，也不需要 GitHub 帳號。一次頁面生命週期只接受一次成功回饋；收集端失敗會顯示錯誤提示，重試不會在成功前建立重複提交。
