---
tags: [kmsh, API, 院方]
---
# 院方 API 總覽（外部 HIS）

院方（民生醫院 HIS）提供的唯讀資料來源。看板透過自建 .NET API 轉接後給前端（見 [[系統架構]]）。

## 已知端點（真正可用，白板實際使用中）
> 全部 **`POST http://10.20.111.84:8088/api/v1/<端點>`**、header `x-api-key: cf0b5fadd56e4362a4fb`、body **`{}`**（僅 Board_bed 帶 `{"病房":...}`）。回 `{ success, data[] }`；字串補空白（含全形）需 trim。實作見 `Services/BoardApiService.cs`。★2026-07 起新增的端點皆**容錯**（失敗回空清單、不中斷看板）。

| 端點 | 用途 | body | 主要用在 | 筆記 |
|------|------|------|------|------|
| `Board_bed` | **住院在床清單＋基本**（+2026-07 負責醫師/科別/診斷/**動態**/用藥）| `{"病房":"W52"/"AICU"/"CICU"}` | W52/ICU 病室動態 | [[Board_bed]] ★ |
| `Board_ER` | 急診在室病患 | `{}` | ER 病室動態 | [[Board_ER]]（資料可能停更）|
| `Board_ER_TypeE` | 急診「死亡類別」在室（**不佔床**）清單/筆數 | `{}` | ER 死亡明細彈窗、統計 | 容錯回空 |
| `Board_OR` | 開刀房**當日手術**（即時；完成後從清單消失）| `{}` | OR 手術動態 | [[Board_OR]]；落地 `OrDailySurgery`（消失→Completed）|
| `Board_Examine` | **全院檢查**清單 | `{}` | W52/ICU/ER「檢查」（只顯示在床）| Status→未執行/未排程/已排程；45s 快取 |
| `Board_AICUUD` | **AICU 用藥/抗生素** | `{}` | ICU 抗生素頁 | 2026-07 自 Board_bed 拆出（解耦、免拖慢）|
| `AICUPHY` | **AICU 身體約束** | `{}` | ICU「約束」旗標 | `Restraint=Y`→需約束；⚠端點**無 `Board_` 前綴** |
| `Board_HCA` | **策盟註記**（≠0＝轉入，值＝來源機構名）| `{}` | ER「轉入」 | HcaMark 非 0 即轉入 |

主機：`http://10.20.111.84:8088`（民生 copy 區 84，內網限定）。

### 各端點回應主要欄位（皆中文鍵、trim 後用）
- **Board_bed**：病歷號/姓名/身分證/出生年月日/性別/病房/床位＋負責醫師/轉入日期/科別/診斷/**動態**(A/D/E/I/M/T)/抗生素(用藥)。詳 [[Board_bed]]。
- **Board_ER**：病歷號/姓名/身分證/出生/性別/負責醫師/醫師卡號/**病患動向**(代碼)/檢傷分類(1-3)/類別/床位/診斷/科別。詳 [[Board_ER]]。
- **Board_OR**：Room/病歷號/姓名/性別/生日/術式/主刀/科別/麻醉/來源/OpDate/OpTime/診斷。詳 [[Board_OR]]。
- **Board_Examine**：病歷號/姓名/類別/病房/床位/轉入日/**Status**/檢查名稱。
- **Board_AICUUD**：病歷號/姓名/藥名/起訖日期時間。
- **AICUPHY**：病歷號/姓名/病房/床位/**Restraint**(Y=約束)。
- **Board_HCA**：病歷號/姓名/病房/床位/**HcaMark**(≠0＝轉入來源機構)。
- **Board_ER_TypeE**：ER 死亡類別在室清單（不佔床）。

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

## 待確認 / 已解決
- ~~ICU/其他病房 Board_bed~~ → ✅ ICU＝`AICU`(4F)＋`CICU`(3F) 同支可查。
- ~~OR/檢查/手術/抗生素 端點~~ → ✅ 已有 `Board_OR`（手術）、`Board_Examine`（檢查）、`Board_AICUUD`（抗生素）；約束 `AICUPHY`、轉入 `Board_HCA`、急診死亡 `Board_ER_TypeE`。
- ~~科別/主治/診斷/入院日/狀態~~ → ✅ **Board_bed 已直接帶**（負責醫師/科別/診斷/轉入日/動態），不再靠 DB2_DUMP。
- **仍待/自建**：**會診**院方無端點 → 自建 `WardExamConsult`（24h）；`Board_ER` 的「類別」代碼表待院方；備份庫 84 排程同步狀態；正式機（88）資料開放範圍。
