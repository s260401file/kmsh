---
tags: [kmsh, WhiteboardSync, 資料同步, ETL, MOC]
---
# WhiteboardSync 總覽（本地清洗同步工具）

## 一句話
獨立 .NET 8 console ETL 工具，把資訊室同步庫 **DB2_DUMP** 的資料**清洗**後落地到**本地 `Whiteboard` DB** 的整齊表，供白板/報表**直接讀取**（快、穩、資料已清乾淨），不必即時遠端 join、也不必經 Board_* API。目前**只做 OR**（`dbo.OrSurgery`），結構預留日後加其他單位。

- 專案：`C:\WorkDir\Nursing Whiteboard\WhiteboardSync`（比照 [[DbSync-同步策略|DbSync]] 寫法）。
- 跑在**本機 101**（可同時連 DB2_DUMP 與本地 `.\SQLEXPRESS`）。每次執行做**一輪** ETL 後結束。
- 排程：Windows 工作排程器 **每 10 分鐘**（工作名 `WhiteboardSync`，SYSTEM 帳戶）。
- 資料鏈：高榮 DB2 →（Java dump＋[[DbSync-同步策略|DbSync]]）→ **DB2_DUMP** →（**本工具**清洗）→ 本地 `OrSurgery` → 白板 OR「手術清單」頁（`GET /api/Board/or/surgerylist`）。

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
### 建立每 10 分鐘排程（系統管理員視窗）
PowerShell：
```powershell
$exe = "C:\WorkDir\Nursing Whiteboard\WhiteboardSync\publish\WhiteboardSync.exe"
$a = New-ScheduledTaskAction -Execute $exe -Argument "--no-pause" -WorkingDirectory (Split-Path $exe)
$t = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 10)
$p = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$s = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 8)
Register-ScheduledTask -TaskName "WhiteboardSync" -Action $a -Trigger $t -Principal $p -Settings $s -Force
```
cmd（一行版）：
```
schtasks /Create /TN "WhiteboardSync" /TR "\"C:\WorkDir\Nursing Whiteboard\WhiteboardSync\publish\WhiteboardSync.exe\" --no-pause" /SC MINUTE /MO 10 /RU SYSTEM /RL HIGHEST /F
```

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
