# WhiteboardSync

把資訊室同步庫 **DB2_DUMP**（`10.20.111.84`）的資料**清洗**後落地到本地 **Whiteboard** 資料庫，供白板/報表**直接讀取**（快、穩、資料已清乾淨），不必即時遠端 join、也不必經 Board_* API。

本工具比照 [DbSync](../DbSync/) 寫法（.NET 8 console、單次執行、staging＋MERGE、每日檔記錄）。**每次執行做一輪 ETL 後結束**；排程由 Windows 工作排程器觸發。

## 目前的 job

| Job | 來源 | 目標 | 說明 |
|-----|------|------|------|
| `OrSurgery` | `[OR].OPORDER_4A0` ＋ `AM.HPBASIC_4A0`（姓名/生日）＋ `AM.HLOC_4A0`（病房床） | 本地 `dbo.OrSurgery` | OR 手術清單，清洗＋去重＋補白板房號（join `OrRoom`）。含過去已完成刀（Board_OR API 拿不到）。 |

清洗：去空白（含全形）、多值合併（助手×5、健保碼×4、ICD×4）、算年齡、`A/O/E→住/門/急`、哨兵結束日→null；以自然鍵 `(OpDate,Room,ChartNo,OpTime)` 去重。
落地：staging＋`MERGE`——更新變動（雜湊比對）、插入新、**窗內來源已消失者刪除**（反映取消/移除）。抽取下界為今天回推 `WindowMonthsBack`（預設 6）個月，不設上界（含未來排程）。

日後要清洗其他單位資料，於 `Jobs/` 加一個 `IEtlJob` 實作、在 `Program.cs` 的 `jobs` 陣列加入即可。

## 設定

複製 `appsettings.sample.json` 為 `appsettings.json` 並填入帳密（`appsettings.json` 已被 `.gitignore` 排除）：

```json
{
  "SourceConnectionString": "Server=10.20.111.84;Database=DB2_DUMP;User Id=...;Password=...;Encrypt=False;TrustServerCertificate=True;",
  "TargetConnectionString": "Server=.\\SQLEXPRESS;Database=Whiteboard;User Id=...;Password=...;TrustServerCertificate=True;Encrypt=True;",
  "LogDir": "logs",
  "CommandTimeoutSeconds": 120,
  "WindowMonthsBack": 6
}
```

> 本工具需**同時連到 DB2_DUMP 與本地 Whiteboard**，故跑在應用主機（101）。目標表 `dbo.OrSurgery` 不存在時工具會自動冪等建立（DDL 另見 `API/kmsh-whiteboard/Database/schema_v23_or_surgery.sql`）。

## 建置 / 發佈

```powershell
cd WhiteboardSync
dotnet publish -c Release -r win-x64 --self-contained true -o publish
```

產出 `publish\WhiteboardSync.exe`（自帶執行檔，免裝 .NET）。把 `publish\` 整包複製到執行位置，於同目錄放好 `appsettings.json`。

## 執行 / 排程

- 手動：直接執行 `WhiteboardSync.exe`（雙擊會在跑完後暫停 15 秒顯示結果；`--no-pause` 關閉）。
- 排程：**Windows 工作排程器**指向 `WhiteboardSync.exe`，自訂間隔（如每 10 分）：
  - 「一般」→ 不論使用者登入與否皆執行、以最高權限執行。
  - 「設定」→ 勾「**如果工作已在執行，則不要啟動新的執行個體**」（本工具已用具名 Mutex 防重疊，雙保險）。
  - 「動作」→ 程式＝`WhiteboardSync.exe`；起始位置＝該 exe 所在資料夾（讓它找得到 `appsettings.json`）。

退出碼：`0`=成功、`1`=有 job 失敗或例外、`2`=參數錯誤。記錄於 `logs/whiteboardsync-yyyyMMdd.log`。

## 參數

| 參數 | 說明 |
|------|------|
| `--no-pause` | 跑完不暫停（排程/被導向時本就不暫停） |
| `--pause-seconds N` | 雙擊執行時的暫停秒數（預設 15） |
