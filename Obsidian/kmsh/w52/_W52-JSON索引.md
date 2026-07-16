---
tags: [kmsh, 技術, W52, 索引]
---
# W52 — JSON 設計索引

> W52 一般病房各功能的 JSON 設計（試作）。方法共通：後端聚合 BFF＋逐欄合併（HIS 非空優先，否則自建）＋快取＋詳情 lazy，見 [[W52病室動態-JSON與組裝]]。
> 來源/狀態依 [[資料項對照表]]、[[欄位資料實況]]；自建表 [[資料庫Schema]]。

| 功能 | 文件 | 主要來源 | 現可上線 |
|---|---|---|---|
| 病室動態（含**值班表面板**）| [[W52病室動態-JSON與組裝]] | HIS 清單＋自建註記；值班表面板（三班護理師＋夜專師＋緊急編組｜值班醫療團隊｜照服員＋聯絡電話）| ✅ 值班表已上線 |
| 照護提醒 | [[照護提醒-JSON]] | 自建（`CareReminder`）| ✅ 可自建 |
| 手術資訊 | [[手術資訊-JSON]] | HIS `OR.OPORDER` | 待開放 |
| 檢查／會診 | [[檢查會診-JSON]] | HIS `OR.ORDER`/`RESULT` | 待開放（會診待確認）|
| 排班資訊（三班/緊急編組）| [[排班資訊-JSON]] | 自建排班（`getSchedule`；camelCase）；緊急編組 5 組｜夜專師（`NightNurseRoster`）| ✅ 已上線（值班表面板）|
| 醫師資訊（值班醫療團隊）| [[醫師資訊-JSON]] | 值班團隊改引用**中央值班排程**（`OnCallDept`/`OnCallRoster`）；查房表自建 `DoctorRound` | ✅ 值班團隊已上線 |
| 護理交班 | [[護理交班-JSON]] | 自建（`Handover`＋子表）| ✅ 可自建 |
| 照護團隊（含照服員/聯絡電話）| [[照護團隊-JSON]] | 自建（`CareTeam`）；照服員 `UnitCareAide`／聯絡電話 併入值班表面板 | ✅ 已上線 |

## schema 待補（依本批設計）
- `CareReminder`（照護提醒）、`Handover` 結構化子表（`HandoverPatient`/`HandoverItem`）、`DoctorRound` 加 `ActualTime`/`IsCompleted`、`CareTeam` 加 `GroupKey`/`Mobile` → 補進 [[資料庫Schema]]。

相關：[[W52-一般病房]] · [[資料庫Schema]] · [[00-總覽]]
