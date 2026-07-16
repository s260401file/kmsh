---
tags: [kmsh, API, 後台]
---
# 自建後台 API 總覽（.NET）

我們自建的 .NET API（`…\API`），前端 `services/` 以相對 `/api/...` 呼叫（見 [[系統架構]]）。對應後台管理見 [[後台總覽]]。

## 現有控制器 / 端點
| 控制器 | 前綴 | 功能 | 前端 service |
|--------|------|------|------|
| TextController | `/api/Text` | 跑馬燈、佈告欄（category 區分）| `textApi`、`marqueeApi` |
| ContactController | `/api/Contact` | 值班人員 `/duty`、常用電話 `/common`、顯示聯絡電話 `/phone`（GET/POST/PUT/DELETE）| `contactApi` |
| EvacuationController | `/api/Evacuation` | 避難圖 圖片/設備/聯絡 | `evacuationApi` |
| BoardController | `/api/Board` | 看板主控制器：各站看板資料＋後台 CRUD（詳下方「BoardController 端點群」）| `wardApi` |
| BoardImageController | `/api/BoardImage` | 通用看板圖片（`kind`＋`unitCode` 為鍵）：`image/info`、`image`（GET）、`image`（POST multipart）、`image`（DELETE）。目前用於 OR「各科協助業務」`kind=assist` | `wardApi` |

- 共同：多支援 `unitCode` 參數（多單位）、CRUD（GET/POST/PUT/DELETE）、`isActive` 上下架、`sortOrder`。
- 資料庫：SQL Express。
- **授權**（[[00-LDAP總覽]]）：全域 `MutationAuthorizationFilter` — **GET 匿名**（看板顯示），**POST/PUT/DELETE 需登入**（`[AllowAnonymous]` 為例外，如 `personnel/login`）。標 `[Authorize]` 者另需登入即使 GET（如 `{unit}/roster`、`or/surgerylist/export`）。全域 `OperationAuditFilter` 記錄修改類請求（含密碼欄位遮蔽）。

## BoardController 端點群（`/api/Board`，摘要）
| 群組 | 端點 | 說明 |
|--------|------|------|
| 值班醫師排程 | `oncall-dept`(CRUD)、`oncall-roster`(range/`day`)、`oncall-roster/month`(POST 月存)、`oncall-board`(當日各科取值班 Slot) | 各科每日輪值排程 |
| 各站顯示值班醫師 | `{unit}/oncall-display`(GET 選取)、`{unit}/oncall-display/batch`(POST)、`{unit}/oncall-display/board`(當日值班解析) | 站台選要顯示哪幾科 |
| 照服員 | `care-aide`(CRUD 主檔)、`{unit}/aide-display`(GET)、`{unit}/aide-display/batch`(POST) | 照服員主檔＋各站顯示 |
| 夜/假護理師 | `night-nurse`(GET range)、`night-nurse/month`(POST 月存) | 夜班／假日護理師排班 |
| OR 溫溼度 | `or/temphumidity`(GET)、`or/temphumidity/batch`(POST) | 刀房溫溼度記錄 |
| OR 手術清單 | `or/surgerylist`(GET)、`or/surgerylist/export`(GET，`[Authorize]`，xlsx 含完整姓名) | 手術清單頁＋匯出 |
| OR 刷手/流動 | `or/surgery-nurse/batch`(POST) | 逐台刀刷手／流動護理師 |
| 科別/醫師主檔 | `department`(CRUD)、`doctor`(CRUD) | 科別、醫師主檔 |
| 我的病床 | `{unit}/bedassign`(CRUD)、`{unit}/bed-nurse`(POST 勾床；W52/ICU/ER 一床可多位) | 護理師與病床綁定 |
| 頁首/檢視 | `{unit}/info`(GET/PUT，含 OR `ViewPassword`/`ViewTimeoutMinutes`) | 各站頁首與檢視設定 |
| 帳號連動 AD | `personnel/{id}/ad-account`(POST，Admin)、`personnel/{id}/reset-password`(POST，Admin)、`personnel/change-password`(POST，自助) | 見 [[帳號連動AD-規劃]] |

> 其餘既有群組：`personnel`／`unitrole`（人員/角色）、`schedule`（排班）、`{unit}/doctor`＋`round`（醫師查房）、`examconsult`（檢查會診）、`antibiotic`（抗生素）、`handover-shift`／`handover-patient`／`handover-note`（交班）、`care-reminder`（照護註記）、各站 `bed`／`room`／`shiftpanel`／`shiftstaff`／`shiftroom` 等。

## 待長出（對應 [[資料項對照表]] 待建項）
以及轉接 [[_院方API總覽|院方 API]]。
