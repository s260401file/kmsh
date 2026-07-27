---
tags: [kmsh, API, 院方, 單位/ER]
---
# Board_ER（院方急診 API）

## 呼叫
```bash
curl --location 'http://10.20.111.84:8088/api/v1/Board_ER' \
  --header 'x-api-key: cf0b5fadd56e4362a4fb' \
  --header 'Content-Type: application/json' \
  --data '{}'
```
- `POST`、header `x-api-key`、body `{}`。
- 回應 200、UTF-8、~8.7s（偏慢）。
- ⚠ 主機 `10.20.111.84` ＝ **民生 copy 區**（排程同步自 88，**目前異常→資料可能停更**）；真正來源在 **88 高榮開放區**，**不排除改直接存取 88**。見 [[系統架構]]。

## 回應結構
```json
{ "success": true,
  "data": [ { …一筆病患… } ] }
```

## 欄位
| 欄位 | 範例 | 說明 / 注意 |
|------|------|------|
| 病歷號 | `"16432589  "` | 尾端空白 → trim |
| 姓名 | `"廖芸君      "` | 尾端空白 → trim |
| 身分證 | `"T225494516"` | 白板**需顯示**（使用者 2026-06 更正） |
| 出生年月日 | `"2000-10-01T00:00:00"` | ISO；自算年齡 |
| 性別 | `"F"` | F/M |
| 負責醫師 | `"高益凱      "` | trim |
| 醫師卡號 | `"MB46"` | |
| 病患動向 | `"O"` | **代碼**（2026-07-27 確認，見下表）；O＝診間 |
| 檢傷分類 | `"3"` | **僅 3 級** `1/2/3`（白板顯示 A/B/C＝重症/中症/輕症；對應 1→A、2→B、3→C）|
| 類別 | `"E"` | **代碼**，待代碼表（E＝急診?）|
| 床位 | `"007"` | **床號對應＝病房＋床位**（去前導零、不足兩位補零）：MER+`007`→**MER07**、MER+`022`→MER22、MER+`991`→MER991 |

## 「病患動向」(Flow) 代碼對照（2026-07-27 確認，與 [[Board_bed]] 動態不同表）
| 代碼 | 中文 | | 代碼 | 中文 | | 代碼 | 中文 |
|---|---|---|---|---|---|---|---|
| A | 留觀中 | | O | 診間 | | 3 | 血液透析室 |
| C | 急救間 | | X | 取消掛號 | | 4 | 已辦理急診轉住院手續 |
| D | 出院 | | 1 | 手術室 | | 5 | 恢復室 |
| E | 病故 | | 2 | 產房 | | 6 | 自行離院 |
| I | 通知出院 | | | | | 7 | 病故 |
| M | 報轉榮院 | | | | | 8 | OHCA |

**白板對應**：ER 病床卡彈窗「動向狀態」以 `FLOW_LABEL` 對照顯示。統計/狀態對應：**A→留觀**（`Observation`）、**4→待床一般**（`Awaiting`）、**M→轉出**（`TransferOut`＋卡片轉床色，2026-07-27 新增）。其餘代碼目前僅顯示。後台「病人臨床補充」(ER) 已**移除「轉出醫院」設定、待床「一般」鎖定**（皆由院方動向帶入）。

## 與白板對應
姓名→PatientName、病歷號→MedRecord、性別→Gender、出生→算 Age、負責醫師→Doctor、檢傷分類→Triage、床位→BedId、病患動向→Status。

## ⚠️ API 未提供（白板有用、需他法）
診斷、到院時間、責任護理師、隔離/DNR/各種註記、留觀/待床/轉院旗標、分區、急診狀態、備註、三班人員。→ 見 [[資料項對照表]]。

## 已上線：ER 病室動態接真實資料（2026-06-24）
**架構＝自建床位主檔 ＋ Board_ER 真實 ＋ overlay**（W52/ICU 用固定 bed master，ER 因真實床碼超出平面圖且 API 無空床，改自建可增刪的床位主檔）：
- **床位主檔 `[dbo].[ErBed]`**（schema_v5）：`BedId, Ward, Zone, GridCol, GridRow, SortOrder, IsActive`。**平面圖座標存 DB**，前端 `BedCard` 以 inline `style={gridColumn/gridRow}` 擺位（移除 `ErLayout.css` 19 條寫死定位）→ **院方給完整床位清單後全在後台增刪改、免改程式**。已 seed 19 床（沿用原平面圖座標＋分區）。
- 端點 **`GET /api/Board/er`**（`BoardController.GetEr`）：依床位主檔鋪床（**含空床**）→ Board_ER 病人以 `bedId`(=病房+床位) merge → `WardPatientExt`(ER) overlay 補臨床/狀態。輸出 **PascalCase**（比照 W52，貼合前端 `bed.BedId/Patient.PatientName`）。回 `{ Count, Version, Beds[] }`，每床含 `GridCol/GridRow/Status/Unplaced/Patient`。
- **不丟病人**：床碼未建主檔的在室病人 → API 回 `Unplaced=true`、`Zone=未配置`。前端顯示於 **負1 下方 3×2 空格的「不佔床病人」面板**（簡易清單，點擊開既有病人詳情 Modal；`WardTab` 渲染於 `gridColumn:1/4;gridRow:3/6`）。後台「ER 床位主檔」補建該床後會自動回平面圖。
- `Status` 由 overlay 旗標推導：隔離→`isolation`、轉床→`transfer`、待床→`awaiting`、留觀→`observation`、否則 `occupied`；無佔床 `empty`。
- **overlay 新增 ER 狀態欄位**（schema_v5，WardPatientExt）：`Observation, Awaiting, AwaitingType, TransferIn/Out, TransferHospital, Admitted, AdmBedNo, Aad, Mbd, Deceased, ArrivalDate, ArrivalTime`。後台「病人臨床補充」(ER tab) 表單條件顯示這些欄位。
- **後台 CRUD**：新增「ER 床位主檔」分頁（床碼/病房/分區/座標/排序/啟用）；端點 `GET /api/Board/{unit}/bed`、`POST/PUT/DELETE /api/Board/bed[/{id}]`。
- 實測（2 筆在室）：曾怡君 `MER07` 落格(11,3) status=occupied、檢傷3→C；周立甫 `MER22`（主檔未建）→ 未配置區；18 空床正常顯示。
- **前端**：`hooks/useErWard.js`（輪詢 `CENSUS_MS`，回 `data.Beds`）；`ER/tabs/WardTab.jsx`＋`MassCasualtyTab.jsx` 已接真實資料（三班醫護標題仍 mock，另案）。

## 待院方確認
1. ~~`病患動向` 代碼表~~ → **2026-07-27 已確認**（見上「病患動向代碼對照」，A留觀/M報轉榮院/4轉住院…）。`類別` 代碼仍待（實測 `E`）。
2. ~~只回 1 筆~~ → 實測**會回多筆**（目前 2 筆在室）；確認是否含全部在室（含留觀/待床/負壓/OER）。
3. **床號規則已確認＝病房＋床位**（MER+007→MER07、MER99x 同），`bedId` 已實作；床位主檔(ErBed)＋未配置溢位區已上線。**待確認**：①負壓床（負1/負2）的**英文病房代碼**（使用者：「前面也應是英文」，待告知；主檔先用現名）②**急診實際完整床位清單＋分區/座標** → 給齊後在後台「ER 床位主檔」補建，MER22 等即自動歸位（目前 MER22 在未配置區）。
4. 是否有註記/檢查/會診等其他端點。
