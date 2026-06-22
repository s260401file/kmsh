---
tags: [kmsh, 技術, ER, 索引]
---
# ER — JSON 設計索引

> ER 急診各功能的 JSON 設計（試作）。方法共通：後端聚合 BFF＋逐欄合併＋快取，見 [[ER急診動態-JSON與組裝]]。
> 來源/狀態依 [[資料項對照表]]、[[欄位資料實況]]；自建表 [[資料庫Schema]]。

| 功能 | 文件 | 主要來源 | 現可上線 |
|---|---|---|---|
| 急診動態（病室） | [[ER急診動態-JSON與組裝]] | **Board_ER（唯一已開放）**＋ETROOT＋自建 | 部分可（Board_ER）|
| 急診值班表（含各科值班醫師） | [[急診值班表-JSON]] | 自建（`ShiftStaff`/`DoctorDirectory`/`ConsultDutyDaily`） | ✅ 可自建（依實體白板補充）|
| 檢查／會診 | [[檢查會診-JSON]] | HIS `OR.ORDER`/`RESULT`（會診待確認） | 待開放 |
| 大量傷患（MCI） | [[大量傷患-JSON]] | 同急診動態（攤平＋統計，無新源） | 同急診動態 |

## schema 待補（依本批設計）
- `ShiftStaff` 加 `EmergencyGroup`（緊急應變編組）、`Tag`；`DoctorDirectory` 加 `Ext`（分機）。→ 補進 [[資料庫Schema]]。

## 其餘 ER 待辦
- 聯絡資訊分「值班人員/常用電話」、醫師白/夜班、大量傷患（MassCasualty）。見 [[待辦清單]]、[[ER急診動態-JSON與組裝]]。

相關：[[ER]] · [[資料庫Schema]] · [[00-總覽]]
