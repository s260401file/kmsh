---
tags: [kmsh, 技術, OR, 索引]
---
# OR — JSON 設計索引

> OR 手術室各功能的 JSON 設計（試作）。方法共通：後端聚合 BFF＋逐欄合併＋快取，見 [[OR手術動態-JSON與組裝]]。
> 來源/狀態依 [[資料項對照表]]、[[欄位資料實況]]；自建表 [[資料庫Schema]]。

| 功能 | 文件 | 主要來源 | 現可上線 |
|---|---|---|---|
| 手術動態（刀房，含**第 8 格溫溼度**）| [[OR手術動態-JSON與組裝]] | Board_OR 今日排程＋自建派班/交班＋`OrRoomEnv` 溫溼度 | ✅ 已上線 |
| 手術派班 | [[手術派班-JSON]] | 自建（`OrShiftStaff`＋`OrShiftRoom`＋`OrRoom`） | ✅ 已上線（非 mock）|
| 特殊交班 | [[特殊交班-JSON]] | 自建（`OrHandover`，全手填） | ✅ 已上線（非 mock）|
| **手術清單**（xlsx 匯出）| [[OR手術動態-JSON與組裝]] | 本地清洗表 `OrSurgery`（WhiteboardSync ETL）；`getOrSurgeryList`/`export` | ✅ 已上線 |
| **各科協助業務**（圖片）| — | 靜態圖片頁 | ✅ 已上線 |
| 溫溼度記錄 | [[OR手術動態-JSON與組裝]] | 自建 `OrRoomEnv`（後台批次；`getOrRoomEnv`）| ✅ 已上線 |
| **資料來源/欄位需求** | [[OR排程系統-高榮欄位需求]] | 高榮另一套 OR 系統（≠ 現用 [[Board_OR]]）；20 欄位需求 | 待資訊室回覆 |

## 其他
- **檢視密碼**：非「手術動態」第一頁若後台設密碼且未解鎖，以 `OrViewGate` 數字鍵盤取代內容（`UnitInfo.viewPassword`/`viewTimeoutMinutes`）。
- 取消刀 `ORSTATUS=82` 於看板一律排除；已完成僅依 `EndTime`。

相關：[[OR]] · [[資料庫Schema]] · [[00-總覽]]
