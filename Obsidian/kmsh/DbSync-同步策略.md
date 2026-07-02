---
tags: [kmsh, DbSync, 同步策略, DB2, 資料庫]
---
# DbSync 同步策略（DB2 → DB2_DUMP）

> 建立 2026-07-02。程式碼放 `C:\WorkDir\Nursing Whiteboard\DbSync\`（新資料夾，之後 copy 到兩邊都連得到的 VM 執行）。
> 相關：[[工作項目回報]] · [[欄位資料實況]] · [[_院方API總覽]]

## 架構鏈（重要認知）
```
真實 DB2 ──〔DbSync（我們要做）〕──▶ DB2_DUMP（SQL Server）──▶ 資訊室的 API（讀 DB2_DUMP）──▶ 白板
```
- **白板不直接讀 DB2_DUMP**；是引用資訊室提供、讀 DB2_DUMP 的 API。
- 因此 **DbSync 的新鮮度 = 白板資料的新鮮度**。這應即先前記的「備份庫(84)排程同步待修復」——等於我們在重建/接手它。

## 連線（憑證另存於程式 config，勿寫進本庫）
- **來源 DB2**：`Server=DBGW1.vghks.gov.tw:50000;Database=DBDSNP2;UID=apbig72;PWD=***`（.NET 套件 `Net.IBM.Data.Db2`）。**目前埠 50000 不通，防火牆申請中**（DNS 解析 → 192.168.51.223）。
- **目標 SQL Server**：`Server=10.20.111.84;Database=DB2_DUMP;User Id=db2_88;PWD=***;Encrypt=False;TrustServerCertificate=True`（`Microsoft.Data.SqlClient`）。**已實測可連，權限含 SELECT/INSERT/DELETE/ALTER/CREATE TABLE**。

## 目標庫現況（2026-07-02 實測）
- 104 張表、合計 **~3,170 萬列**；命名慣例 `schema.TABLE_4A0`。
- **只有 3/104 有宣告 PK**（其餘要靠邏輯鍵）。
- datetime 欄多為**業務日期**（入院日/手術日…），非「逐列異動時間」。

## ★ 關鍵發現：`Z*` 逐列異動時間戳
- 幾乎每張 `_4A0` 表都有一個 **`Z<表名>` datetime2** 欄（`ZHCASE`/`ZHPBASIC`/`ZETROOT`/`ZOPORDER`…）。
- 值分佈**逐列不同、跨 1911～今天、最大值是當天** → 是 dump 現有流程幫每列打的**異動時間戳**，且 dump **目前仍在被更新**（非完全停擺）。

| 欄位 | 最小 | 最大 | 相異/總列 |
|---|---|---|---|
| HCASE.ZHCASE | 1911-01-13 | 2026-07-02 04:58 | 62,321 / 70,580 |
| HPBASIC.ZHPBASIC | 1991-01-01 | 2026-07-02 08:22 | 505,557 / 1,967,110 |
| ETROOT.ZETROOT | 2026-03-31 | 2026-07-02 01:30 | 3,488 / 3,488 |
| OPORDER.ZOPORDER | 2026-03-31 | 2026-07-01 16:55 | 1,137 / 1,141 |

→ **若來源 DB2 也有對應的逐列異動時間**，全部表可走「`WHERE 異動時間 > 浮水印`」**增量**，連 HPBASIC 200 萬列都很輕，免全表雜湊比對。

## 白板需要的子集（8 張表，來源＝api-spec「HIS欄位存在」對照）
> 鍵為推斷值，待 DB2 catalog／資訊室確認（尤其歷史表的日期/序號鍵）。

| # | Dump 表 | 列數 | 用途 | 推斷鍵 | 層級 | 模式 |
|---|---|---|---|---|---|---|
| 1 | `AM.HCASE_4A0` | 70,580 | 案件/入出院/DNR/急診時間/轉入出/候床 | HHISNUM+HCASETYP+HCASENO | fast 5m | 增量(ZHCASE)/diff |
| 2 | `AM.HLOC_4A0` | 10,119 | 床位（現床取最新列） | +HADATE+HATIME | fast 5m | 增量/diff |
| 3 | `AM.HSECTION_4A0` | 77,445 | 科別 | +HSECDATE+HSECTIME | fast 5m | 增量/diff |
| 4 | `AM.HDOCTOR_4A0` | 113,324 | 主治醫師 | +HMDNO(+HDOCBGDT) | fast 5m | 增量/diff |
| 5 | `AM.HDIAGNOS_4A0` | 311,221 | 診斷 | HHISNUM+HCASETYP+HCASENO(+seq) | fast 5m | 增量/diff |
| 6 | `ER.ETROOT_4A0` | 3,488 | 急診檢傷/過敏/DOA | ETHISNUM+ETDATE+ETSEQ | fast 5m | 增量/diff |
| 7 | `OR.OPORDER_4A0` | 1,141 | 手術醫囑/狀態/術式/房間 | ORHISNUM+ORCASETP+ORCASENO+ORDSEQNO | fast 5m | 增量/diff |
| 8 | `AM.HPBASIC_4A0` | 1,967,110 | 病人基本(姓名/性別/生日/病歷/身分證) | HHISNUM | fast 5m | 增量(ZHPBASIC)/append 浮水印 |

- **`BIMBA.ACBL` 不在 dump**（手術麻醉起訖 BLCHBGTM/BLCHENTM）→ 該白板欄位備份庫無來源；不顯示或請資訊室納入 dump。
- 除 HPBASIC 外其餘 7 張在 dump 已是小表，每 5 分鐘全表 diff 也很輕。

## 同步策略
- **首選（因發現 Z*）**：全部走 **Z* 增量** upsert（`WHERE Z* > 浮水印`）；deletes 以**每晚一次鍵對帳**補。前提＝來源 DB2 有可查的逐列異動時間。
- **備案**：來源無異動時間 → **小表鍵+雜湊 diff（staging + set-based MERGE）**、**HPBASIC 浮水印只增**（浮水印初始化為目標現有最大值 → 第一次不會慢）。
- 只增/只 diff 皆**不做整批取代**，只套用差異 DML。

## 執行/工程要求
- **兩層排程、一支程式**：`DbSync.exe --tier fast`（5 分）、`--tier slow`（30 分/每晚，含 deletes 對帳）；各層獨立**具名 Mutex** 防重疊；Task Scheduler 設「已在執行則不啟動新實例」。
- **資源釋放**：connection/command/reader/bulkcopy/transaction 全 `using`/try-finally；**每表獨立 try-catch**（單表失敗不影響其他、不外洩連線）；錯誤 rollback；最外層 finally 釋放 Mutex；命令設 timeout。
- **設定檔驅動**：表清單、每表鍵、模式(diff/append/增量)、`watermarkCol`、`filter(WHERE)`、tier；複製到 VM 只改連線＋config。
- **紀錄**：每輪每表 log（起訖、ins/upd/del 筆數、錯誤）；有錯回非 0 exit code。
- **.NET**：Console(net8)；DB2 DataReader 串流直接餵 `SqlBulkCopy`（記憶體友善）。

## 已定案
- 白板子集走 5 分鐘、其餘低頻。
- 巨表若白板有用到 → **先做只增，不改不刪**（deletes 暫不處理）。
- 白板用到的巨表其實只有 `HPBASIC`；`OR.ORDER_4A0`(200萬) 白板不用（白板用的是小表 `OR.OPORDER_4A0`）。

## 待資訊室確認（關鍵，帶去問）
1. `_4A0` 的 **`Z*`（datetime2）是什麼**？來源 DB2 端有沒有對應的**逐列異動時間**可 `WHERE > 浮水印` 撈增量？
2. 目前 dump **是不是還有一支排程在跑**（最大時間是今天）？我們是**重建/接手**，如何分工、避免雙寫？
3. 各表的**主鍵/唯一鍵**清單（或 DB2 DDL）——只有 3/104 有宣告 PK。
4. `BIMBA.ACBL`（手術麻醉起訖）能否納入 dump？

## 下一步
- 等 DB2 防火牆開通 → 查 DB2 catalog（鍵、是否有 Z* 對應來源欄）。
- 確認 Z*/排程分工後 → 定案模式，產出**設定檔格式 + 程式骨架（單表 PoC）**。
