---
tags: [kmsh, API, 院方]
---
# 院方 API 總覽（外部 HIS）

院方（民生醫院 HIS）提供的唯讀資料來源。看板透過自建 .NET API 轉接後給前端（見 [[系統架構]]）。

## 已知端點（真正可用）
| 端點 | 用途 | 認證 | 筆記 |
|------|------|------|------|
| `POST /api/v1/Board_ER` | 急診在室病患 | `x-api-key` | [[Board_ER]]（唯一實測過、且資料可能停更）|

主機：`http://10.20.111.84:8088`

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
其他單位（W52/ICU/OR）是否有對應 Board API？檢查/會診/手術/抗生素 端點？見 [[資料項對照表]]。
