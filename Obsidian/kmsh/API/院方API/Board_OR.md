---
tags: [kmsh, API, 院方, 單位/OR]
---
# Board_OR（院方手術排程 API）

## 呼叫
```bash
curl --location 'http://10.20.111.84:8088/api/v1/Board_OR' \
  --header 'x-api-key: cf0b5fadd56e4362a4fb' \
  --header 'Content-Type: application/json' \
  --data '{}'
```
- `POST`、header `x-api-key`、body `{}`。回應 `{ success, data[] }`，UTF-8。
- 實測 **109 筆**（跨多日，非僅當日；含未來日期）。**是「預定排程」**，非即時手術狀態。
- ⚠ 同 Board_bed/Board_ER 走 `10.20.111.84:8088`（民生 copy 區），見 [[系統架構]]。

## 欄位
| 欄位 | 範例 | 說明 / 注意 |
|------|------|------|
| 刀房 | `"R1  "` | **R1~R7**，trim；對應白板房號見下 |
| 病歷號 | `"10050900  "` | trim；overlay 合併鍵 |
| 姓名 | `"許振泰      "` | trim |
| 性別 | `"M"` | M/F |
| 出生年月日 | `"1940-02-27T00:00:00"` | ISO；自算年齡 |
| 手術 | `"Ex of subcutaneous tumor…"` | 術式名（多英文、補空白） |
| 主刀醫師 | `"林淑媛　　"` | trim（含全形空白）|
| 麻醉 | `"LA"` | **代碼** LA/SA/GA/IG/IR（待代碼表）|
| 來源 | `"O"` | **代碼**，實測**全 O**（暫對門診刀；E/I 待確認）|
| 手術日期 | `"2026-06-25T00:00:00"` | ISO；板面篩**當日** |
| 手術時間 | `"12:00"` | HH:mm；當日排序鍵 |
| 診斷 | `""` | 常空 → 不足由 overlay 補 |

## 刀房 R↔白板房號對應（使用者確認）
`R{n}` → 第 n 個 UI 房 `[OR-01, OR-02, OR-03, OR-05, OR-06, OR-07, OR-08]`（跳過已撤 OR-04）：

| API | 白板 | | API | 白板 |
|---|---|---|---|---|
| R1 | OR-01 | | R5 | OR-06 |
| R2 | OR-02 | | R6 | OR-07 |
| R3 | OR-03 | | R7 | OR-08 |
| R4 | OR-05 | | | |

> 對應存於自建 `OrRoom` 主檔（`RoomId↔ApiRoom`），**後台「OR 刀房主檔」可增刪改**。實測 API 目前無 R4 → OR-05 暫空房。

## 已上線：OR 手術動態接真實資料（2026-06-24）
- 端點 **`GET /api/Board/or`**（`BoardController.GetOr`）：自建 `OrRoom` 鋪 4×2 房卡 → **篩當日**手術、以 `ApiRoom` 分組依手術時間排序 → `WardPatientExt`(OR) overlay 補。輸出 **PascalCase**。
- `OrRoomDto`：`RoomId, ApiRoom, Status, TodayCount, Patient(今日進行中/首台), Surgeries[](今日全部供 Modal)`。`Status`＝overlay 手術狀態(手術中→in-surgery…)，無→`scheduled`；無今日手術→`empty`。
- `來源`→`SurgerySource`：`{O:門診刀,E:急診刀,I:住院刀}`（暫定，待代碼表）。`麻醉` 原碼直顯。
- **overlay（重用 `WardPatientExt`,UnitCode='OR'）**：Board_OR 缺的 **手術狀態 / 實際進出刀房(StartTime/EndTime) / 刷手(ScrubNurse) / 流動(CircNurse) / 科別 / 備註** 由後台維護（schema_v6 ALTER 補 5 欄）。
- **前端**：`OR/tabs/WardTab.jsx` 用 `useErWard` 同款 `useOrWard`（輪詢 `CENSUS_MS`，回 `data.Rooms`）；房卡顯示今日「進行中/首台」＋「今日 N 台」，Modal 列今日台次可切換。
- 後台：新增「OR 刀房主檔」CRUD（房號↔R 代碼/排序/啟用）；「病人臨床補充」OR tab 顯示手術狀態/刷手/流動/實際起訖欄位。
- 實測（伺服器日 2026-06-24，今日 6 台）：OR-03(R3)2台、OR-06(R5)1台、OR-07(R6)3台；OR-01/02/05/08 今日空房。

## 待院方確認
1. `來源` 代碼表（實測全 `O`）、`麻醉` 代碼（LA/SA/GA/IG/IR）。
2. `R4`（對 OR-05，API 目前無資料）與 OR-08 房號最終確認。
3. **實際進出刀房時間**來源（Board_OR 僅預定；實際暫由 overlay 手填）。
4. 即時手術狀態（手術中/準備中/已完成）是否有 API 來源（目前自建）。

## 範圍外（另案）
- **手術派班**（ScheduleTab / `OrShiftAssignment`）、**特殊交班**（HandoverTab / `OrSpecialHandover`）仍 mock。見 [[手術派班-JSON]]、[[特殊交班-JSON]]、[[OR手術動態-JSON與組裝]]。
