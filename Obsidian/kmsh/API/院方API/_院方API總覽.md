---
tags: [kmsh, API, 院方]
---
# 院方 API 總覽（外部 HIS）

院方（民生醫院 HIS）提供的唯讀資料來源。看板透過自建 .NET API 轉接後給前端（見 [[系統架構]]）。

## 已知端點（真正可用）
| 端點 | 用途 | 認證/參數 | 筆記 |
|------|------|------|------|
| `POST /api/v1/Board_ER` | 急診在室病患 | `x-api-key` | [[Board_ER]]（資料可能停更）|
| `POST /api/v1/Board_bed` | **住院在床清單＋病人基本** | body `{"病房":"W52"}` | [[Board_bed]]（2026-06 確認有真實資料）★ |

主機：`http://10.20.111.84:8088`

## Board_bed（住院在床清單）— 2026-06 確認可用
`POST /api/v1/Board_bed`，body `{"病房":"W52"}`（病房參數化，可查各住院病房）。回 `success` + `data[]`，**每筆＝一床在床病人**，欄位（皆**有真實資料**）：
| 欄位 | 說明 | 對應 HIS |
|---|---|---|
| 病歷號 | 補空白，需 trim | HHISNUM |
| 姓名 | **全形補空白**，需 trim | HPBASIC.HNAMEC |
| 身分證 | ⚠**個資、白板不可顯示**（僅後端比對用）| HPBASIC.HIDNO |
| 出生年月日 | `yyyy/MM/dd`，前端自算年齡 | HPBASIC.HBIRTHDT |
| 性別 | M/F | HPBASIC.HSEX |
| 病房 | 補空白，需 trim | HLOC.HNURSTA |
| 床位 | 如 `006`（零補） | HLOC.HBED |
> 提供「在床清單＋基本」；**不含**科別/主治/診斷/入院日/狀態/註記 → 那些另由備份庫 DB2_DUMP（科別/主治/診斷/預定出院 實測有值）或自建補。組裝見 [[W52病室動態-JSON與組裝]]。

## ⚠ 程式碼已對接、但欄位為「預留殼」（民生大部份無資料）
> 重要：`API/` 的 `VghksApiService`（AMDRService/UDSPService/MAASService/LABService）已寫好多支端點與資料模型（`Ward/bed-list`、`Patient/er`·`/am`·`/allergy`·`/info`、`NonExSchList`、`Lab/urgent`），其中 `AmdrCase.patflag.hicmap` 帶有 **dnr/fall/iso/npo/activityMode/critical**、**nurseNo/nurseName（主責護理師）**、會診（`NonExSchList` chktype=CON）等欄位。
> **但這些是依高榮 API 規格「預留」的欄位殼，不代表民生有資料**——民生實際**大部份沒有**（正式機未開、護理紀錄/評估系統未開放、備份庫停更）。**判斷資料是否可用，一律以 [[資料項對照表]] / [[HIS可用與缺漏分析]] 為準，不可因程式有欄位就當已可取得。**
> 另：高醫 KMUH 端點（`Staff/tms`·`unit`、`Hr/hrs`·`uas`排班、`Patient/cnc`、`Maintenance/ers`）程式中**全部回 503（未開放）**。
> → 9 月驗收前策略：以自建後台為主（見 [[後台總覽]]、[[缺漏與申請清單]] B）。

## 共同注意
- 字串欄位多為**固定寬度補空白** → 用前 `trim()`。
- 日期為 ISO datetime（需自算年齡）。
- 代碼欄位（動向、類別…）需向院方索取**代碼表**。
- 回應偏慢（Board_ER ~8.7s）→ 看板輪詢需快取。

## 待確認
- 住院病房已有 `Board_bed`（W52 實測✅）→ 確認 ICU/其他病房同支可查、OR 是否有對應 Board。
- 是否有 **科別/主治/診斷/入院日/狀態** 的 Board 端點（目前這些靠備份庫 DB2_DUMP）？檢查/會診/手術/抗生素 端點？見 [[資料項對照表]]、[[欄位資料實況]]。
