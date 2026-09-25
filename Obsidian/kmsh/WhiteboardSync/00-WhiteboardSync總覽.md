---
tags: [kmsh, WhiteboardSync, 資料同步, ETL, MOC]
---
# WhiteboardSync 總覽（本地清洗同步工具）

## 一句話
獨立 .NET 8 console ETL 工具，把資訊室同步庫 **DB2_DUMP** 的資料落地到**本地 `Whiteboard` DB**，供白板**直接讀取**，不必即時經院方 Board_* API。分兩類 job：**(1) OrSurgery**（清洗版 `dbo.OrSurgery`，OR 手術清單頁用）；**(2) 全 endpoint 快照**（`dbo.Sync_Snapshot`，四站顯示端資料來源，2026-09 起）。

- 專案：`C:\WorkDir\Nursing Whiteboard\WhiteboardSync`（比照 [[DbSync-同步策略|DbSync]] 寫法）。
- 跑在**本機 101**（可同時連 DB2_DUMP 與本地 `.\SQLEXPRESS`）。每次執行做**一輪** ETL 後結束。
- 排程：Windows 工作排程器（OrSurgery 每 10 分；快照 high 每 1 分、mid 每 3 分）。
- 資料鏈：高榮 DB2 →（Java dump＋[[DbSync-同步策略|DbSync]]）→ **DB2_DUMP** →（**本工具**）→ 本地表 → 白板 API 直讀。

## ★ 2026-09 擴充：全 endpoint 本地快照（顯示端脫離院方 API）
**動機**：顯示端原本每次即時 HTTP 呼叫院方 Board_* API（`http://10.20.111.84:8088/api/v1`）；院方 API／網路當下不通就整片空白。改為**定時把各 endpoint 落地成本地快照，顯示端一律讀本地**——院方短暫不通只會讓資料舊一點、不會空白。依賴時機從「顯示當下」移到「背景同步當下」。

**同步端（本工具）**
- 通用 `Jobs/SnapshotJob.cs`：對 DB2_DUMP 跑某 endpoint 的 SQL → reader 轉 JSON 陣列（欄名＝SQL 原輸出名）→ upsert 進單表 **`dbo.Sync_Snapshot`**（`Endpoint` PK、`Payload` NVARCHAR(MAX)、`RowCount`、`SyncedAt`、`DurationMs`）。**抽取/序列化失敗就不 upsert → 保留上一次快照**。
- `Jobs/SnapshotJobs.cs`：10 個 endpoint 設定（SQL 逐字取自 `Document/05-SQL查詢/`）。Endpoint 鍵沿用 API 路徑名。
  - **high（每約 1 分）**：`Board_bed`、`Board_ER`、`Board_ER_TypeE`、`OR_SYSTEM`
  - **mid（每約 3 分）**：`Board_OR`、`AICUPHY`、`Board_Examine`（**限 W52/AICU/CICU**，24,655→約 4,581 列）、`Board_AICUUD`、`Board_HCA`、`Board_Note`
  - 未納入：`病人禁治療.txt`（程式未使用）。
- `Program.cs` 加 `--group high|mid|or|all`（`or`＝既有 OrSurgery；`all`＝全部，backstop）。`IEtlJob` 加 `Group`。

**讀取端（白板 API，`kmsh-whiteboard`）**
- `Services/SyncSnapshotStore.cs`：讀 `Sync_Snapshot`（payload/syncedAt）＋新鮮度（high 逾 3 分、mid 逾 9 分視為延遲）。
- `Services/BoardDbService.cs : IBoardApiService`：讀 JSON→還原成**與原院方 HTTP 版完全相同的 10 種 DTO**（SQL 欄名→屬性對映在此）。`Program.cs` DI 由 HTTP 版 `BoardApiService` **換成** `BoardDbService`（HTTP 版原始碼保留供回滾）。**`BoardController` 免改**。
- 四站回應加 `DataStale`/`SyncedAt`；另 `GET /api/Board/{unit}/status`（輕量，不建 census）供頁首提示。
- 已實測四站（w52/icu/er/or）輸出與 live HTTP 版**完全一致**（床數、策盟、檢查等旗標）。

**前台**：`hooks/useBoardStatus.js` + 四站 `*Layout.jsx` 頁首（原時鐘處）條件顯示琥珀色「⚠ 資料可能延遲」，正常隱藏、滑過顯示最後同步時間。

**新鮮度門檻**（`SyncSnapshotStore`）：high 3 分、mid 9 分（約排程間隔 ×3）。

**並行設計（重要）**：分頻後 high/mid/or 各自一個排程、可**同時**各跑一個行程，故：
- Mutex 名稱**含 group**（`Global\WhiteboardSync-{group}`）：只防同 group 自我重疊，不同 group 並行——否則慢的 OrSurgery(約4分) 會卡住每分鐘的 high，Board_bed/ER 每 10 分就 stale。
- `Logger` 開檔用 **`FileShare.ReadWrite` + `FileMode.Append`**：多行程共寫同一日誌檔不會崩潰（原本 `StreamWriter(append:true)` 預設 `FileShare.Read`，第二個行程開檔失敗→未處理例外→整個 task 崩潰、LastResult=0xE04xxxxx）。

> 注意：`dbo.KMSH_institution`（策盟對照）在 DB2_DUMP、資訊室維護、可 SELECT，但登入帳號 `db2_88` **看不到其 metadata → 程式勿用 `OBJECT_ID` 判斷其存在**。

## 建置（Build / 發佈）
- 語言/套件：.NET 8、`Microsoft.Data.SqlClient`（來源與目標皆 SQL Server，含 `SqlBulkCopy`）。
- 專案檔：`Program.cs`（單次執行＋Mutex 防重疊＋雙擊暫停）、`AppConfig.cs`、`Logger.cs`、`OrClean.cs`（清洗小工具）、`Jobs/IEtlJob.cs`、`Jobs/OrSurgeryJob.cs`（OR ETL 核心）、`appsettings.sample.json`（進 git）、`appsettings.json`（**gitignore**，含帳密）、`.gitignore`、`README.md`。
- 發佈 self-contained exe：
  ```powershell
  cd "C:\WorkDir\Nursing Whiteboard\WhiteboardSync"
  dotnet publish -c Release -r win-x64 --self-contained true -o publish
  ```
  產出 `publish\WhiteboardSync.exe`（自帶執行檔，免裝 .NET）。整包 `publish\` 可複製到執行位置，同目錄需有 `appsettings.json`。

## 流程（ETL：OrSurgery job）
1. **建表**：冪等建 `dbo.OrSurgery`（工具自動；DDL 另見 `API/kmsh-whiteboard/Database/schema_v23_or_surgery.sql`）。
2. **抽取**（來源 DB2_DUMP）：`[OR].OPORDER_4A0` ＋ `AM.HPBASIC_4A0`（姓名/生日）＋ OUTER APPLY `AM.HLOC_4A0`（最新病房床）。加窗 `WHERE ORBGNDT >= 今天回推 WindowMonthsBack(預設6) 個月`（不設上界→含未來排程）。
3. **清洗**（C#）：去空白（含全形）、多值合併（助手×5・健保碼×4・ICD×4）、算年齡、`A/O/E→住/門/急`、哨兵結束日（如 `2910-12-31`）→null。
4. **去重**：自然鍵 `(OpDate,Room,ChartNo,OpTime)` 取一筆（同案多列先併，避免台數灌水）。
5. **補房號**：join 本地 `OrRoom`（ApiRoom `R{n}` → 白板 `OR-0{n}`）。
6. **落地**：staging（`_stg_OrSurgery`）＋ `SqlBulkCopy` ＋ **`MERGE`**——雜湊比對更新變動、插入新、**窗內來源已消失者 DELETE**（反映取消/移除）。事務包住，失敗 rollback＋log、保留上一版。
7. 記錄撈到/去重/新增/更新/刪除筆數與耗時（每輪約 45–75 秒）。

> 冪等：資料未變時 `新增0/更新0/刪除0`。防重疊：具名 Mutex `Global\WhiteboardSync`。

## 操作方法（Operation）
1. **設定**：複製 `appsettings.sample.json` → `appsettings.json`，填連線字串：
   - `SourceConnectionString` = DB2_DUMP（`Server=10.20.111.84;Database=DB2_DUMP;User Id=db2_88;...`）
   - `TargetConnectionString` = 本地（`Server=.\SQLEXPRESS;Database=Whiteboard;User Id=sa;...`）
   - `WindowMonthsBack` = 6（抽取下界回推月數）
2. **手動跑**：直接執行 `WhiteboardSync.exe`（雙擊跑完暫停 15 秒顯示結果；排程用 `--no-pause`）。
3. **排程**：Windows 工作排程器每 10 分鐘（見下指令）。exit code：`0` 成功、`1` 失敗、`2` 參數錯。

## 指令（Commands）
### 建立三個排程（系統管理員視窗）
OrSurgery（每 10 分，`--group or`）＋ 快照 high（每 1 分）＋ 快照 mid（每 3 分）：
```powershell
$exe = "C:\WorkDir\Nursing Whiteboard\WhiteboardSync\publish\WhiteboardSync.exe"
$dir = Split-Path $exe
$p = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
function Reg($name,$grp,$min,$limit){
  $a = New-ScheduledTaskAction -Execute $exe -Argument "--group $grp --no-pause" -WorkingDirectory $dir
  $t = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $min)
  $s = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes $limit)
  Register-ScheduledTask -TaskName $name -Action $a -Trigger $t -Principal $p -Settings $s -Force
}
Reg "WhiteboardSync"      "or"   10 8    # 既有：OR 手術清單（改帶 --group or，避免重複跑 high/mid）
Reg "WhiteboardSync-High" "high" 1  2    # 病床/急診/當日病故/OR流程
Reg "WhiteboardSync-Mid"  "mid"  3  3    # 刀房/約束/檢查/抗生素/策盟/Note
```
> 舊的 `WhiteboardSync` 若原本無參數（跑 all），改成上面的 `--group or` 即可；high/mid 為新增。

### 操作 / 監看
```powershell
Start-ScheduledTask -TaskName "WhiteboardSync"                          # 立即手動跑一次
Get-ScheduledTask -TaskName "WhiteboardSync" | Get-ScheduledTaskInfo    # 狀態
# 讀 log（-Encoding UTF8 才不亂碼）
Get-Content "C:\WorkDir\Nursing Whiteboard\WhiteboardSync\publish\logs\whiteboardsync-$(Get-Date -Format yyyyMMdd).log" -Tail 8 -Encoding UTF8
```
`LastTaskResult` 判讀：`0`=成功；`267009`(0x41301)=**執行中**（非錯誤，等它跑完）；其他非 0=真的失敗，看 log。

## 查詢（本地資料）
本地 `Whiteboard` DB 的 `dbo.OrSurgery`（一列＝一台刀，含過去已完成刀）：
```sql
SELECT COUNT(*) FROM dbo.OrSurgery;                                        -- 總筆數
SELECT CONVERT(char(7),OpDate,23) ym, COUNT(*) FROM dbo.OrSurgery GROUP BY CONVERT(char(7),OpDate,23) ORDER BY ym;  -- 月分佈
SELECT * FROM dbo.OrSurgery WHERE OpDate >= '2026-06-01' AND OpDate < '2026-07-01' ORDER BY OpDate, OpTime;
```
白板消費：OR 看板底部**第 7 頁籤「手術清單」**讀 `GET /api/Board/or/surgerylist?from=&to=`（預設本月；上/下個月/今日/自訂範圍）。

全 endpoint 快照 `dbo.Sync_Snapshot`（一列＝一個 endpoint 的整份 JSON）：
```sql
SELECT Endpoint, [RowCount], LEN(Payload) AS PayloadLen, SyncedAt, DurationMs FROM dbo.Sync_Snapshot ORDER BY Endpoint;
-- 各站顯示端讀本地快照：GET /api/Board/{w52|icu|er|or}（回應含 DataStale/SyncedAt）；輕量新鮮度：GET /api/Board/{unit}/status
```

## 移除
```powershell
Unregister-ScheduledTask -TaskName "WhiteboardSync" -Confirm:$false      # 移除排程
# 如需一併清資料/程式：
# DROP TABLE dbo.OrSurgery;   （SQL，謹慎）
# 刪除 publish\ 資料夾
```

## 待釐清 / 後續
- **去重 185 筆**：同 `(日期,房,病歷號,時間)` 多列（多為同一台刀多術式明細行）先取一筆；待資訊室確認「多列＝多術式或重複輸入」再定案（是否合併術式/健保碼）。
- **狀態碼**（`ORSTATUS` 31/32/82…）代碼表待院方 → 82 暫視為「取消」。
- **診斷**目前僅 ICD 代碼（無自由文字）；**補充/刷手/流動/麻醉護士**屬護理 overlay，未串。
- **下一步（另案）**：API `or/monthly`（直讀 DB2_DUMP 的慢速雛形）可改讀本地 `OrSurgery`。

相關：[[00-總覽]] · [[DbSync-同步策略]] · [[OR排程系統-高榮欄位需求]] · [[系統架構]] · [[待辦清單]]
