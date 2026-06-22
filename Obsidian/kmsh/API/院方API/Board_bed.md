---
tags: [kmsh, API, 院方, Board_bed]
---
# Board_bed（住院在床清單 API）

> 院方第二支確認可用的開放 API（繼 [[Board_ER]] 之後）。2026-06 實測**回真實資料**。提供住院病房的「在床病人清單＋病人基本」。

## 呼叫
```bash
curl --location 'http://10.20.111.84:8088/api/v1/Board_bed' \
  --header 'Content-Type: application/json' \
  --data '{"病房":"W52"}'
```
- 主機 `http://10.20.111.84:8088`（民生 copy 區 84，內網限定）。
- body `{"病房":"<病房代碼>"}`，**病房參數化**（W52 已測；ICU 等待測）。

## 回應
`{ "success": true, "data": [ {一床一筆} ] }`，每筆欄位：
| 欄位 | 範例 | 說明 / 處理 | 對應 HIS |
|---|---|---|---|
| 病歷號 | `"19021524  "` | 補空白 → **trim** | HHISNUM |
| 姓名 | `"劉文財　　     "` | **全形＋半形補空白** → trim | HPBASIC.HNAMEC |
| 身分證 | `"T121402583"` | ⚠**個資，白板不可顯示**（僅後端比對）| HPBASIC.HIDNO |
| 出生年月日 | `"1970/11/20"` | `yyyy/MM/dd`，前端自算年齡 | HPBASIC.HBIRTHDT |
| 性別 | `"M"` | M/F | HPBASIC.HSEX |
| 病房 | `"W52 "` | 補空白 → trim | HLOC.HNURSTA |
| 床位 | `"006"` | 零補字串（排序注意）| HLOC.HBED |

## 實作基礎（院方以既有資料表組出）
Board_bed 等同對備份庫 **DB2_DUMP** 既有表跑下列查詢、以 `HNURSTA` 篩病房：`AM.HLOC`（每案最新床＝目前床）＋ `AM.HCASE`（在院狀態）＋ `AM.HPBASIC`（基本）。
```sql
WITH CURRENT_INPATIENT AS (
  SELECT loc.HHISNUM, loc.HCASENO, loc.HNURSTA, loc.HBED,
         ROW_NUMBER() OVER (PARTITION BY loc.HCASENO
                            ORDER BY loc.HADATE DESC, loc.HATIME DESC) AS rn_bed
  FROM [DB2_DUMP].[AM].[HLOC_4A0] loc
  JOIN [DB2_DUMP].[AM].[HCASE_4A0] cas ON loc.HCASENO = cas.HCASENO
  WHERE cas.HPATSTAT IN ('A','C','I','M','O') AND loc.HCASETYP = 'A'
)
SELECT a.HCASENO, a.HHISNUM, b.HNAMEC, b.HSEX, b.HBIRTHDT, a.HNURSTA, a.HBED
FROM CURRENT_INPATIENT a
LEFT JOIN [DB2_DUMP].[AM].[HPBASIC_4A0] b ON a.HHISNUM = b.HHISNUM
WHERE a.rn_bed = 1 AND a.HNURSTA = 'W52'      -- 病房代碼，見下表
ORDER BY a.HBED;
```
> ★ 因為是**既有資料表**，建置方可**直接對 DB2_DUMP 跑同一支查詢**（不必經 API）；且 **CTE 已含 `HCASENO`** → 可在同一查詢再 join `HSECTION`/`HDOCTOR`/`HDIAGNOS`/`HDISCHRG`，一次取回科別/主治/診斷/預定出院，**免再做病歷號→案號對應**。Board_bed API 即院方用同表建的精簡版（僅回基本）。詳見 [[W52病室動態-JSON與組裝]] 的組裝與 latest-per-case 寫法。

## 病房代碼（HNURSTA）對照
| 白板 | HNURSTA | 備註 |
|---|---|---|
| W52 一般病房 | `W52` | 已確認 |
| ICU 加護 | `AICU` | 已確認（**注意非 'ICU'**）|
| OR 手術室 | 待補 | OR 非住院床（手術以 OPORDER）|
| ER 急診 | （走 [[Board_ER]]）| 急診另支 API |
| 其他住院病房 | 待補 | 同支 `{"病房":<HNURSTA>}` 可查 |

## 用途與限制
- ✅ 取代「以 DB2_DUMP `HLOC`+`HPBASIC` 撈在床清單」——**即時、乾淨、參數化**。
- ❌ **不含**：科別、主治醫師、診斷、入院日、病人狀態、預定出院、任何臨床註記。
  - 科別代碼/主治/診斷/預定出院 → 備份庫 **DB2_DUMP**（實測有值，[[欄位資料實況]]）以病歷號對應目前案件補。
  - DNR/管路/隔離/責護/病況/註記 → **自建**（[[資料庫Schema]]）。
- 注意：字串補空白需 trim；回應慢/內網 → 後端**快取**＋輪詢（[[即時更新-輪詢設計]]）。

## 組裝
W52 病室動態＝**Board_bed（清單+基本）＋ DB2_DUMP（科別/主治/診斷/預定出院）＋ 自建（註記/管路/責護）**，後端聚合逐欄合併。詳 [[W52病室動態-JSON與組裝]]。

相關：[[_院方API總覽]] · [[Board_ER]] · [[W52病室動態-JSON與組裝]] · [[欄位資料實況]] · [[系統架構]]
