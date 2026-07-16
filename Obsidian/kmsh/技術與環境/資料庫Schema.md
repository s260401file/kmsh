---
tags: [kmsh, 技術, 資料庫]
---
# 資料庫 Schema（自建後台 Whiteboard DB）

> 自建 SQL Server Express、DB 名 **`Whiteboard`**（`.\sqlexpress`，見 `Document/sqlexpress.txt`）。
> 初版 DDL：`API/kmsh-whiteboard/Database/schema_v1_selfbuild.sql`（可重複執行；每欄含 extended property memo，SSMS「描述」可見）。
> 背景與策略見 [[後台總覽]]、[[缺漏與申請清單]]；為何不靠程式既有 API 欄位見 [[_院方API總覽]]（預留殼）。

## 設計原則
- **沿用既有慣例**（同 `DutyContact`/`CommonContact`/`Text`/`Evac*`）：`Id INT IDENTITY` 主鍵、`UnitCode` 分單位、`IsActive` 上下架、`SortOrder` 排序、`CreatedAt` GETDATE()；Dapper + raw SQL；硬刪除。
- **欄位命名盡量對齊院方**：有 HIS/AMDR 對應者直接用院方欄位名（`Hnamec`/`Hbed`/`Hnursta`/`Hhisnum`/`Hcaseno`/`Hdocnamc`/`Hdiagtxt`/`Etrank`/`Hpatstat`…），日後切回 API/HIS 零摩擦；純自建者用描述性 PascalCase。
- **每欄都有 memo**：以 `sp_addextendedproperty` 寫 `MS_Description`，內含院方來源對照。

## 已存在表（後台已完成，非本批）
`DutyContact`（值班人員）、`CommonContact`（常用電話）、`Text`（跑馬燈/佈告欄）、`EvacImage`/`EvacEquipment`/`EvacContact`（避難圖）。

### 變更紀錄
- `Text` 加 `StartAt` / `EndAt`（DATETIME2 NULL）— 公告/跑馬燈顯示起迄時間，白板僅顯示「現在落在區間內」者；NULL=該端不限。遷移：`API/kmsh-whiteboard/Database/migration_text_startat_endat.sql`（**新版 API 啟用前需先執行**）。

## 本批新增表（14 張，自建過渡）
| # | 表 | 用途 | 院方對應 | 來源策略 |
|---|---|---|---|---|
| 1 | `PatientCensus` | 病人/床位主檔（註記錨點，一床一活躍列）| 欄位對齊 HIS AM.* / AMDR | `Source` 欄(HIS/MANUAL) |
| 2 | `MarkerTypeDef` | 註記類型定義＋**來源策略 SourceMode** | 無（自建機制）| ★切換開關 |
| 3 | `PatientMarker` | 病人註記（掛 census）| 視註記而定 | 依 `SourceMode` 合併 |
| 4 | `UnitInfo` | 站別/護理長/病房主任 | 無 | 自建 |
| 5 | `NurseStaff` | 護理人員主檔 | KMUH HRS PE_NO/PE_NAME（503未開）| 自建 |
| 6 | `NurseBedAssignment` | 主護指派（員編勾床）| HIS 主護未開放 | 自建 |
| 7 | `ShiftStaff` | 三班醫護/值班（Role 收斂）| 無 | 自建 |
| 8 | `DoctorDirectory` | 會診醫師主檔（科別→醫師）| HDOCNAMC | 自建 |
| 9 | `ConsultDutyDaily` | 會診醫師每日各科值班 | 會診值班未開放 | 自建 |
| 10 | `DoctorRound` | 醫師查房時間表（W52）| 無 | 自建 |
| 11 | `Handover` | 護理交班/日誌摘要（W52）| 無 | 自建 |
| 12 | `OrSpecialHandover` | OR 特殊交班 | 流動護理師護理紀錄（撈不到留白）| 自建 |
| 13 | `CareTeam` | 照護團隊 | 無 | 自建 |
| 14 | `OrShiftAssignment` | OR 刷手/流動派班 | 高榮無 API | 自建 |

## ★ 實際已落地（看板接真實資料，schema_v2~v6）
> 上方 14 表為原始規劃；**實作收斂為「Board API 真實 ＋ 自建 overlay/主檔」的精簡模式**（W52/ICU/ER/OR 四板病室動態已上線）。下列為目前 `Whiteboard` DB 中**實際存在並使用**的自建表：

| 表 | DDL | 鍵 | 用途 / 對應板 |
|---|---|---|---|
| `WardPatientExt` | schema_v2（+v3/v5/v6 ALTER）| `(UnitCode, Hhisnum)` | **臨床/狀態 overlay**：補 Board_bed/Board_ER/Board_OR 不足欄位，以病歷號 merge 到各板真實在床/在室/手術病人。四板共用，欄位逐版擴充。 |
| `ErOnCallDoctor` | schema_v4 | `(UnitCode, DeptCode)` | ER 各科值班醫師（病室動態右下面板）。 |
| `ErBed` | schema_v5 | `(UnitCode, BedId)` | **ER 床位主檔**：床碼＋分區＋平面圖座標(GridCol/GridRow)；鋪 ER 平面圖、顯示空床。床碼未建者→白板「不佔床病人」面板。 |
| `OrRoom` | schema_v6 | `(UnitCode, RoomId)` | **OR 刀房主檔**：白板房號 RoomId(OR-01…) ↔ Board_OR 刀房代碼 ApiRoom(R1…) 對應與排序；鋪 OR 4×2 房卡。 |
| `OrShiftStaff` | schema_v8 | `(UnitCode, ShiftType, Role)` | **OR 手術派班-班級人員**：護理長/麻醉/體循，依班別。供 ScheduleTab。 |
| `OrShiftRoom` | schema_v8 | `(UnitCode, ShiftType, RoomId)` | **OR 手術派班-房×班 刷手/流動**：刀房清單用 `OrRoom`，此表只存派班。 |
| `OrHandover` | schema_v8 | `Id`（active 列） | **OR 術後特殊交班**：轉病房/床、出血/輸血、引流、注意事項…全自建手填。供 HandoverTab。 |

**`WardPatientExt` 欄位演進**：v2 基本臨床＋管路/旗標（W52）→ v3 加 `Ventilator/Crrt/Ng`（ICU）→ v5 加 ER 狀態 `Observation/Awaiting(+Type)/TransferIn/Out(+Hospital)/Admitted(+AdmBedNo)/Aad/Mbd/Deceased/ArrivalDate/ArrivalTime` → v6 加 OR `ScrubNurse/CircNurse/SurgeryStatus/StartTime/EndTime`。皆 `COL_LENGTH` 保護、可重跑。

**對應端點**：`GET /api/Board/{w52|icu|er|or}`（聚合輸出）＋ overlay CRUD `/api/Board/{ext|bed|room|oncall}`。院方 API 見 [[Board_ER]]、[[Board_OR]]。
> OR 手術派班（`OrShiftStaff`/`OrShiftRoom`）、特殊交班（`OrHandover`）**已上線**（非 mock）。

## ★★ 後續批次新增表（schema_v9～v40，皆已上線）
> 隨後台功能陸續擴充；schema 檔以 `schema_vNN_*.sql` 版本化、可重複執行、以 `sqlcmd -f 65001`（UTF-8）套用。**目前最高為 v40**。

| # / DDL | 表 | 鍵 | 用途 / 對應功能 |
|---|---|---|---|
| v9 | `UnitInfo` | `UNIQUE(UnitCode)` | 各站頁首（主任/護理長標籤與姓名、總病床數）。後台「頁首設定」。v10 加 `TotalBeds`；v30 加 `ViewPassword`、v31 加 `ViewTimeoutMinutes`（OR 檢視密碼/逾時）。 |
| v11 | `WardExamConsult` | `(UnitCode, …)` | 檢查/會診明細（自建過渡，HIS 明細未開放）；完成後 24h 自動移除。四板共用。 |
| v14 | `Staff` / `StaffSchedule` / `BedStaffAssignment` | 見下 | **人員排班主軸**：`Staff` 人員主檔＋單位角色；`StaffSchedule`（每人每日每班，含 `EmergencyGroup` 緊急編組、`IsCharge` 點班）；`BedStaffAssignment`（我的病床勾床，AssignType=主護）。三班護理師、緊急應變編組、責任護理師皆源於此。 |
| v19 | `ErShiftStaff` | 每班一列 | ER 三班醫護面板：`Doctor`（自由輸入）、`Aide`（照服員，改主檔下拉）、`NurseStaffIds`。 |
| v24 | `Department` / `Doctor` | `UNIQUE(Code)` / `UNIQUE(EmployeeNo)` | 全院共用**科別／醫師主檔**（系統管理）。`Doctor.DeptCode` 軟關聯 `Department.Code`。 |
| v26 | `OnCallDept` / `OnCallRoster` | 見下 | **值班醫師排程**（ER 每月維護，全院共用，無 UnitCode）。`OnCallDept`（科別＋時段 Slots，MED 有 值班/上午/下午）；`OnCallRoster`（每日×科別×時段值班醫師，月存＝先刪後插）。看板 `GET oncall-board` 一律取 `Slot=值班`。v34 補 呼吸治療科(DRT)、v39 補 大外科(--)。 |
| v32 | `BoardImage` | `UNIQUE(Kind,UnitCode)` | 通用看板圖片（kind＋unit）；用於 OR「各科協助業務」（kind=assist）等整頁圖片上傳。 |
| v33 | `OrRoomEnv` | `UNIQUE(OpDate,RoomId)` | **OR 刀房每日溫溼度**（後台登錄→前台手術動態第 8 格）。 |
| v35 | `UnitOnCallDept` | `UNIQUE(UnitCode,DeptCode)` | **各單位「顯示值班醫師」**：選取要顯示的值班科別＋順序，引用中央排程之當日值班（W52/ICU/ER；ER≤10 科）。 |
| v36 | `CareAide` | `Id` | **照服員主檔**（全院共用；姓名＋單一聯絡方式）。系統管理 › 照服員。 |
| v37 | `UnitCareAide` | `UNIQUE(UnitCode,AideId)` | **各單位「顯示照服員」**：選人＋順序，引用照服員主檔。 |
| v38 | `ContactPhone` | `(UnitCode,…)` | **值班表「聯絡電話」清單**（標題＋名稱＋分機/電話＋排序）；比照常用電話多標題。後台「顯示聯絡電話」。 |
| v40 | `NightNurseRoster` | `Id` | **夜/假護理師排程**（全院、無科別、只選月份；每日兩時段 小夜/小夜貳組；姓名純文字）。ER 管理維護；看板「夜專師」取當日小夜。 |

**一床多位責任護理師（2026-07）**：`BedStaffAssignment` 無 one-per-bed 唯一鍵，原由 `SetBedNurseAsync` 程式強制「一床一主護」。W52/ICU/ER 三站已放寬（略過「移除他人同床」步驟），一床可多位護理師；看板責任護理師以逗號並列。ER 仍以自建 `ErBed`；W52/ICU 以床碼裸碼對應（曾有 `W52-001` vs `001` key 不符 bug，已修）。

## ★ 混合機制：`MarkerTypeDef.SourceMode`
同一註記「HIS 有就用 HIS、沒有就用人工」，逐項可切換、不雙重輸入。

| SourceMode | 顯示取值 | 用在 |
|---|---|---|
| `MANUAL_ONLY` | 只人工 | HIS 不會有：運送等級/約束/氧氣/禁治療/RRT/策略病人 |
| `HIS_ONLY` | 只 HIS | HIS 開放且可信後 |
| `HIS_THEN_MANUAL` | HIS 優先、查無用人工補洞 | DNR/化療/禁食/隔離/高危跌/管路/測謀（現以人工，開放即自動切）|
| `MANUAL_THEN_HIS` | 人工優先、可覆蓋 HIS | 資料有誤需手動蓋過時 |

> 病人主檔同理：`PatientCensus.Source` + 合併鍵 `(UnitCode,Hbed)`，HIS 通了人工列自動退居備援。
> 註記種子預設值見 DDL 內 `MERGE`（待院方逐項確認後微調）。

> ⚠ **欄位級合併（因應「有欄位但空值」，院方 2026-06-22）**：整列 `Source` 不足以處理「同病人部分欄位有值、部分空值」。改採**逐欄合併**：`顯示值 = HIS 值非空白 ? HIS : 自建`。所有 `HIS_THEN_MANUAL`／`MarkerTypeDef.SourceMode` 的「HIS 有」判定一律含 **`非 null 且非空字串`**（空值不可蓋掉自建值）。病人核心欄位另以 `FieldSourceMap`（欄位→來源模式）驅動；確認空值的欄位設 `MANUAL_ONLY`。設計與待填清單見 [[欄位資料實況]]。

## 索引/鍵重點
- `PatientCensus`：唯一過濾索引 `(UnitCode,Hbed) WHERE IsActive=1`（一床一活躍）；`Hhisnum` 索引。
- `PatientMarker`：FK → `MarkerTypeDef.Code`；`Hhisnum`/`(UnitCode,Hbed)`/`MarkerCode` 索引。
- `NurseBedAssignment`：唯一鍵 `(UnitCode,DutyDate,ShiftType,Hbed)`。
- 各日期型表：`(UnitCode,DutyDate[,ShiftType])` 索引。

相關：[[系統架構]]、[[後台總覽]]、[[護理排班]]、[[資料項對照表]]、[[W52病室動態-JSON與組裝]]、[[_院方API總覽]]、[[HIS資料字典-可用資源]]、[[00-總覽]]
