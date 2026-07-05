---
tags: [kmsh, 技術, OR, 索引]
---
# OR — JSON 設計索引

> OR 手術室各功能的 JSON 設計（試作）。方法共通：後端聚合 BFF＋逐欄合併＋快取，見 [[OR手術動態-JSON與組裝]]。
> 來源/狀態依 [[資料項對照表]]、[[欄位資料實況]]；自建表 [[資料庫Schema]]。

| 功能 | 文件 | 主要來源 | 現可上線 |
|---|---|---|---|
| 手術動態（刀房） | [[OR手術動態-JSON與組裝]] | HIS `OR.OPORDER`＋自建派班/交班 | 手術待開放/派班可自建 |
| 手術派班 | [[手術派班-JSON]] | 自建（`OrShiftAssignment`＋`ShiftStaff`） | ✅ 可自建 |
| 特殊交班 | [[特殊交班-JSON]] | 自建（`OrSpecialHandover`，需擴充）＋OPORDER 手術基本 | ✅ 核心可自建 |
| **資料來源/欄位需求** | [[OR排程系統-高榮欄位需求]] | 高榮另一套 OR 系統（≠ 現用 [[Board_OR]]）；20 欄位需求 | 待資訊室回覆 |

## schema 待補（依本批設計）
- `OrSpecialHandover` 擴充：`SurgeryName`/`SurgeonName`/`SurgerySource`/`DestWard`/`DestBed`/`EndTime`/`BloodLoss`/`BloodTransfusion`/`DrainDetails` → 補進 [[資料庫Schema]]。

相關：[[OR]] · [[資料庫Schema]] · [[00-總覽]]
