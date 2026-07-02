# DbSync — DB2 → DB2_DUMP 差異同步

保持白板所需的 HIS 表在目標庫（`DB2_DUMP`）新鮮。**定位為並存分工**：資訊室既有的整包 dump（Java，約 30 分鐘、目前人工手動）照常跑；本程式只負責**白板子集、每 5 分鐘增量**，讓白板不必等整包 dump。

資料鏈：`真實 DB2 →〔DbSync〕→ DB2_DUMP → 資訊室 API → 白板`。詳見 Obsidian `DbSync-同步策略`。

## 架構
- .NET 8 Console；來源 `Net.IBM.Data.Db2`、目標 `Microsoft.Data.SqlClient` + `SqlBulkCopy`。
- 設定檔驅動（`appsettings.json`），每表可設層別/模式/鍵/浮水印/篩選。
- 主策略 **incremental**：讀來源 `WHERE {Z*欄} > 浮水印` → 灌 staging → 以鍵 `MERGE` upsert → 推進浮水印。**只寫差異，不整批取代**。

## 模式（每表 `Mode`）
| Mode | 說明 | 需唯一鍵？ | 群組內刪除 |
|---|---|---|---|
| `replacekey` | **首選**。Z* 浮水印找出有異動的「案群組」(KeyCols)，把目標該群組整組刪除後、以來源該群組現況重寫（單一交易） | 否 | 處理 |
| `incremental` | Z* 浮水印撈異動列 → 以鍵 upsert | 是（KeyCols 須唯一） | 不處理 |
| `append` | 同上但僅 INSERT（純新增表） | 是 | 不處理 |
| `full` | 全表拉進 staging，整列雜湊 diff upsert + 刪除來源已無的列 | 是 | 處理 |

> **實測：這批 HIS 表在 DB2 均無宣告唯一鍵**，故一律用 `replacekey`（KeyCols 用「案群組鍵」即可，不需唯一）。跨群組刪除（整案從來源消失）不由增量偵測，建議日後以 `slow` 層做全量對帳補上。

## 執行
```
DbSync.exe --tier fast     # 白板子集（排程每 5 分鐘）
DbSync.exe --tier slow     # 低頻/對帳（排程每 30 分鐘或每晚）
```
退出碼：`0`=全成功、`1`=有表失敗/例外、`2`=參數錯誤。

### 視窗行為（看得到結果）
- **雙擊 `DbSync.exe`**：跑完會停住顯示結果——按任意鍵即關，或 **15 秒後自動關閉**（不會一閃而過）。
- 秒數可調：`--pause-seconds 5`（例）；完全不暫停：`--no-pause`。
- **由排程或既有終端機執行時不會暫停**（自動偵測，避免排程卡住）；此時看 `logs\` 紀錄檔即可。
- 也可雙擊 `run-test.bat`（跑 fast 並停在畫面）。

## 防重疊 / 資源釋放
- 每層別具名 Mutex（`Global\DbSync_{tier}`）；上一輪未跑完則本輪跳過（回 0）。
- 亦請在工作排程器設「若工作已在執行，不要啟動新實例」。
- 所有連線 / reader / bulkcopy / logger 以 `using` 釋放；Mutex 於 `finally` 釋放；單表失敗獨立 try/catch 不影響其他表、不外洩連線。

## 部署（VM，兩邊 DB 都連得到）
1. `dotnet publish -c Release -r win-x64 --self-contained true -o publish`（免裝 runtime）。
2. 複製 `publish/` 到 VM；由 `appsettings.sample.json` 複製出 `appsettings.json` 填入實際帳密。
3. 工作排程器建兩個工作：`DbSync.exe --tier fast`（每 5 分）、`--tier slow`（每 30 分）。

## 設定檔
見 `appsettings.sample.json`。`appsettings.json`（含帳密）已被 `.gitignore` 排除。

## 待辦 / 待確認（依賴 DB2 連通）
- DB2 防火牆開通後，實測「來源是否有 `Z*` 對應欄」與各表**主鍵**（目前 `KeyCols` 為推斷值，只有 3/104 表有宣告 PK）。
- `state/watermarks-{tier}.json` 保存每表浮水印；首次執行會以目標現有最大值初始化（故第一次不會全量重灌）。
- 與整包 dump 並存：兩者皆寫入源真值、交易短，last-writer 正確；避免刻意同時段觸發即可。
