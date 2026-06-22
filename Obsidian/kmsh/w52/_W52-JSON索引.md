---
tags: [kmsh, 技術, W52, 索引]
---
# W52 — JSON 設計索引

> W52 一般病房各功能的 JSON 設計（試作）。方法共通：後端聚合 BFF＋逐欄合併（HIS 非空優先，否則自建）＋快取＋詳情 lazy，見 [[W52病室動態-JSON與組裝]]。
> 來源/狀態依 [[資料項對照表]]、[[欄位資料實況]]；自建表 [[資料庫Schema]]。

| 功能 | 文件 | 主要來源 | 現可上線 |
|---|---|---|---|
| 病室動態 | [[W52病室動態-JSON與組裝]] | HIS 清單＋自建註記 | 待 AMDR 開放/先自建 |
| 照護提醒 | [[照護提醒-JSON]] | 自建（`CareReminder`）| ✅ 可自建 |
| 手術資訊 | [[手術資訊-JSON]] | HIS `OR.OPORDER` | 待開放 |
| 檢查／會診 | [[檢查會診-JSON]] | HIS `OR.ORDER`/`RESULT` | 待開放（會診待確認）|
| 排班資訊 | [[排班資訊-JSON]] | 自建（`NurseStaff`/`NurseBedAssignment`/`ShiftStaff`）| ✅ 可自建 |
| 醫師資訊 | [[醫師資訊-JSON]] | HIS `HDOCTOR`＋自建 `DoctorRound` | 查房表✅可自建 |
| 護理交班 | [[護理交班-JSON]] | 自建（`Handover`＋子表）| ✅ 可自建 |
| 照護團隊 | [[照護團隊-JSON]] | 自建（`CareTeam`）| ✅ 可自建 |

## schema 待補（依本批設計）
- `CareReminder`（照護提醒）、`Handover` 結構化子表（`HandoverPatient`/`HandoverItem`）、`DoctorRound` 加 `ActualTime`/`IsCompleted`、`CareTeam` 加 `GroupKey`/`Mobile` → 補進 [[資料庫Schema]]。

相關：[[W52-一般病房]] · [[資料庫Schema]] · [[00-總覽]]
