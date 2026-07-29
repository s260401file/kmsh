---
tags: [kmsh, 資料來源, HIS, 可用資源]
---
# HIS 資料字典（可用資源）

> 來源：`http://10.20.111.88/REPORTS/quicksearch`（疑為第5次會議之**備份報表庫 ~100 View**）
> 整理：2026-06-18 · 規模：**81 表 / 3,324 欄位**
> 完整內容：`Document/醫療系統資料字典_護理電子白板參考.md`（4415 行）

## ⚠ 重要釐清
- **民生用的是高榮提供的 HIS 系統，資料庫在高榮、不在民生**；這 **81 表＝目前高榮提供給民生的全部範圍**。不在此清單者（多半 HIS 有）＝**未提供給民生**，非不存在。
- 這代表**資料表結構/欄位已知**（schema 可查），**不等於可即時取資料**。
- 第5次會議：高榮目前僅開放 **1 支 API（急診清單 [[Board_ER]]）**；正式機資料未開通、備份庫排程同步異常。
- 即「**有表、但取用管道/即時性待開通**」→ 仍是專案瓶頸（見 [[2026-06-16-第5次-資料介接與後台]]）。

## ⭐ 白板相關資料表（26 張，對應白板需求）
> 註：字典原檔「重點」清單列 **25 張**；本表原另納入「急診出院病人 `BIMBA.ERDISPAT`」逐表拆開為 26 張。
> ⚠ **2026-06-22 實測：`BIMBA.ERDISPAT` 不存在** → 實際可用 **25 張**。逐欄實況見 [[欄位資料實況]]。
| 白板資料項                   | 對應 HIS 表                                | 備註                |
| ----------------------- | --------------------------------------- | ----------------- |
| 病患基本（姓名/性別/生日）          | `AM.HPBASIC`                            |                   |
| 住院/急診案件（床位/科別）          | `AM.HCASE`                              |                   |
| 住址                      | `AM.HADDRESS`                           |                   |
| 轉床紀錄（→ 床位動態、待轉入/出）      | `AM.HLOC`                               |                   |
| 轉科紀錄                    | `AM.HSECTION`                           |                   |
| 主治醫師/負責醫生               | `AM.HDOCTOR`                            | 與專師同欄位需識別（第5次）    |
| 診斷/病危/出院（→ 診斷、待出院、DNR?） | `AM.HDIAGNOS`、`AM.HDISCHRG`             |                   |
| 急診檢傷分級                  | `ER.ETROOT`、`ER.ETROOTS`                | 檢傷 1-5 → 白板 A/B/C |
| 重症通報 / 到院前預警            | `ER.ERCRANN`、`ER.ERWARNIN`              |                   |
| 急診出院病人                  | `BIMBA.ERDISPAT`                        |                   |
| 醫囑（→ DNR、各種 order）      | `OR.ORDER`、`OR.ORDTEXT`                 | 註記來源候選            |
| 手術醫囑                    | `OR.OPORDER`                            | OR 手術資訊           |
| 檢查/檢驗報告                 | `OR.RESULT`、`OR.RESNUM`、`OR.RESTEXT`    |                   |
| 藥囑 / 給藥日誌 / 藥檔（→ 抗生素）   | `UD.UDORDER`、`UD.UDLOG`、`UD.UDDRGPF`    | ICU 抗生素           |
| 治療醫囑                    | `TR.TRORDER`                            |                   |
| 電子病歷 就醫/診斷/處置           | `MR.EMRCASEO`、`MR.EMRDIAGO`、`MR.EMRTRE` |                   |

## 實際用到的查詢（SELECT 欄位 FROM 表）
> 白板實際取用的欄位＝**給高榮申請開放 / 開 API 的欄位需求清單**。欄位名已對字典原檔（`Document/醫療系統資料字典_護理電子白板參考.md`）核對；除 [[Board_ER]] 外多未開放即時存取。共同病人鍵為 `HHISNUM`（部分另以 `HCASENO`/報告鍵串接）。狀態/來源對照見 [[HIS可用與缺漏分析]]、[[資料項對照表]]。
> ⚠⚠ **有欄位 ≠ 有值**：院方 2026-06-22 確認，下列許多欄位雖存在但**實際為空值**（如 HPBASIC 的血型/身高體重/DNR/保密/安寧、急診 DNR 類）。**空值欄位等同沒有 → 需自建**。各欄位有值/空值/未開放實況與設計見 [[欄位資料實況]]。
> ⚠⚠ **實測修正（2026-06-22）**：實體表名有 `_4A0` 後綴；**病歷號鍵名跨表不同**——`ER.ETROOT`＝`ETHISNUM`、`OR.ORDER/ORDTEXT/OPORDER`＝`ORHISNUM`、`OR.RESULT/RESNUM/RESTEXT`＝`RSHISNUM`、其餘＝`HHISNUM`（`ER.ETROOTS` 無病歷號欄）；**空/不可用**：`UDANTFLG`/`UDDCJUST`/`ORSUGEST`/`ORCLVSNO`/DNR 類為空，`OROETYPE`/`RSSTATUS` 全同值、`ORSCHDT`/`ORNPODT` 異常。下方 SQL 鍵名已修正。

```sql
/* ── 病人核心 ── */
-- 病患基本（姓名/性別/生日/身分證/血型/身高體重 ＋ DNR/保密/安寧旗標）
SELECT HHISNUM, HNAMEC, HSEX, HBIRTHDT, HIDNO, HBLDTYPE, HHEIGHT, HWEIGHT,
       HDNRSIGN, HICDNR, HMRLOCK, HMRLKDEG, HICHOSP, HICLIFES
FROM   AM.HPBASIC;

-- 住院/急診案件（病人狀態/入院/候床/急診類別/DNR/轉院/急轉住院）
SELECT HHISNUM, HPATSTAT, HADMDT, HADMTM, HWBDDT, HWBDTM, HEMGTYPE,
       HDNRCASE, HOSPTRIN, HOSPTROU, HDISADM
FROM   AM.HCASE;

-- 現床/病房（轉床紀錄＝床位動態）
SELECT HHISNUM, HNURSTA, HBED FROM AM.HLOC;

-- 轉科/現科
SELECT HHISNUM, HCURSVCL, HSECDATE, HSECTIME FROM AM.HSECTION;

-- 主治/負責醫師（HMDTYPE 區分主治/專師）
SELECT HHISNUM, HDOCNAMC, HMDTYPE FROM AM.HDOCTOR;

-- 診斷
SELECT HHISNUM, HDIAGTXT, HDIAGCOD FROM AM.HDIAGNOS;

-- 病危/出院（預定出院/出院/出院床房/轉出院所/出院別）
SELECT HHISNUM, HDISRVDT, HDISDATE, HDISBED, HDISWARD, HTRNOUTH, HDISTYPE
FROM   AM.HDISCHRG;

/* ── 急診 ──（鍵：ETROOT=ETHISNUM；ETROOTS 無病歷號欄）*/
-- 檢傷（分級/到院檢傷時間/科別/狀態/生命徵象/到院死亡/藥物過敏）✅實測可用
SELECT ETHISNUM, ETRANK, ETDATE, ETTIME, ETSECT, ETSTAT,
       ETSYSTO, ETDIASTO, ETPULSE, ETBRATH, ETTEMPER, ETGCS, ETDOA, ETDRUG
FROM   ER.ETROOT;

-- 檢傷擴充：實測僅 FRANK/SAO2 有值；SCASE1~12/ISO*/TURNHID/KEYINTON 空或 0
SELECT FRANK, SAO2 FROM ER.ETROOTS;   -- 無病歷號欄，須以其他鍵串 ETROOT

-- 急診出院 BIMBA.ERDISPAT：⚠ 實測「表不存在」→ 移除（過敏 ETDRUGC 來源消失）

/* ── 手術 / 醫囑 / 檢查報告 ──（鍵：ORDER/ORDTEXT/OPORDER=ORHISNUM；RESULT*=RSHISNUM）*/
-- 醫囑主表（檢查/會診）：實測 ORPROCED/ORCLVSNM 可用；
--   ⚠ ORSUGEST/ORCLVSNO/OREXDRNM/ORSPENAM 空、OROETYPE 全同值、ORSCHDT/ORSCHTM 異常
SELECT ORHISNUM, ORPROCED, ORCLVSNM, ORSTATUS, ORENDDT, ORENDTM
FROM   OR.ORDER;

-- 醫囑描述（ORWORDS 部分有值）
SELECT ORHISNUM, ORWORDS FROM OR.ORDTEXT;

-- 手術醫囑：✅核心可用；⚠ ORNPODT/ORNPOTM 異常、ORDIAG/OREMRFG/ORBIO 部分空
SELECT ORHISNUM, OROPROOM, OROPNM1, ORDOCNM,
       ORADRNM1, ORADRNM2, ORADRNM3, ORADRNM4, ORADRNM5,
       OROPAMED, OROPFLAG, ORBGNDT, ORBGNTM, ORSTATUS, ORCASETP
FROM   OR.OPORDER;

-- 報告：⚠ RSSTATUS 全同值（不可用）；RTRESTXT 可用、RNRESVAL/上下限 部分有值
SELECT RSHISNUM, RTRESTXT FROM OR.RESTEXT;
SELECT RSHISNUM, RNRESVAL, RNNRHIGH, RNNRLOW FROM OR.RESNUM;

/* ── 藥囑 ──（鍵 HHISNUM）：✅藥名/劑量/頻次/途徑/時間可用
   ⚠ UDANTFLG(抗生素旗標)、UDDCJUST(化療旗標) 空 → 抗生素須以 UDMDPNAM 比對藥名；UDDOCNAM 大部分空 */
SELECT HHISNUM, UDMDPNAM, UDHIMDPN, UDDOSAGE, UDFREQN, UDROUTE,
       UDBGNDT, UDBGNTM, UDENDDT, UDENDTM, UDSCHPAT, UDOENAME, UDSTATUS
FROM   UD.UDORDER;

/* ── 過敏 ──：⚠ MR.EMRTRE.HALERGY 大部分為 NIL（實質無資料）*/
SELECT HHISNUM, HALERGY FROM MR.EMRTRE;
```

> **字典列為相關、白板尚未實際取用（8 張，先不列 SELECT）**：`AM.HADDRESS`（住址，個資不顯示）、`ER.ERCRANN`/`ER.ERWARNIN`（重症通報/到院前預警，尚無對應功能）、`UD.UDLOG`/`UD.UDDRGPF`（給藥日誌/藥檔，抗生素改由 `UD.UDORDER` 取）、`TR.TRORDER`（治療醫囑，TRPROCED 候選）、`MR.EMRCASEO`/`MR.EMRDIAGO`（門診就醫/診斷，本案以住院/急診為主）。＝ 18 張已取用 ＋ 8 張未取用 ＝ **26 張**。

## 模組總覽（81 表分布）
AM 病患/住院急診/醫師/轉床 · AR 門診帳務/排程 · BICMA/BIMBA/BL 帳務 · **ER 檢傷** · HE 慢性病 · IC 出院疾病分類 · MR 電子病歷 · **OR 醫囑/手術/報告** · RS 門診掛號 · TR 治療 · **UD 藥品/給藥**。

## 對 [[資料項對照表]] 的影響（待逐項校正）
許多原標「待確認/HIS無」的項目，**表結構其實存在**（病人基本、床位、醫師、診斷、檢傷、手術、醫囑、藥囑、報告）。下一步：逐項把對照表的「來源/狀態」依此字典更新，並區分「**表存在但未開放**」vs「**真的無**（如護理排班/主護、會診醫師→自建後台）」。

相關：[[Board_ER]]、[[_院方API總覽]]、[[後台總覽]]、[[00-總覽]]
