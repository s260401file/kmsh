---
tags: [kmsh, 資料來源, HIS, 分析]
---
# HIS 可用與缺漏分析（開發導向）

> 依 [[HIS資料字典-可用資源]] 逐表逐欄分析：**哪些白板資料 HIS 已有（表.欄位）**、**哪些缺（需自建/待確認）**。
> 前提：有表 ≠ 已開放即時資料；存取仍待正式機開通（見 [[2026-06-16-第5次-資料介接與後台]]）。

## A. HIS 已可提供（表結構存在，欄位明確）

### 病人 / 床位 / 入出院
| 白板資料 | HIS 表.欄位 |
|---|---|
| 姓名 / 性別 / 生日 / 身分證 | `AM.HPBASIC` HNAMEC / HSEX / HBIRTHDT / HIDNO（血型 HBLDTYPE、身高體重 HHEIGHT/HWEIGHT）|
| 病歷號 | 各表 HHISNUM |
| 現床 / 病房 | `AM.HLOC` HBED + HNURSTA（轉床紀錄＝床位動態）|
| 住院現況（占床等）| `AM.HCASE` HPATSTAT |
| 入院日期時間 | `AM.HCASE` HADMDT / HADMTM |
| 科別 / 轉科 | `AM.HSECTION` HCURSVCL（HSECDATE/TIME）|
| 候床（待床）| `AM.HCASE` HWBDDT / HWBDTM（登記候床）|
| 待出院 / 出院 | `AM.HDISCHRG` HDISRVDT（預定出院）、HDISDATE、HDISBED/HDISWARD（轉入床/病房）|
| 轉院（轉入/轉出含醫院）| `AM.HCASE` HOSPTRIN/HOSPTROU；`AM.HDISCHRG` HTRNOUTH；`ER.ETROOTS` TURNHID/KEYINTON |
| 急診轉住院（住院含床號）| `AM.HCASE` HDISADM；`AM.HDISCHRG` HDISBED/HDISWARD |
| 診斷 | `AM.HDIAGNOS` HDIAGTXT / HDIAGCOD |
| 主治醫師（＋區分主治/專師）| `AM.HDOCTOR` HDOCNAMC ＋ **HMDTYPE（醫師類別）** ← 解決「主治vs專師識別」|

### 病人註記（已可對應）
| 註記 | HIS 表.欄位 |
|---|---|
| **DNR** | `AM.HPBASIC` HDNRSIGN / HICDNR；`AM.HCASE` HDNRCASE |
| **化療** | `UD.UDORDER` UDDCJUST（化療相關藥囑旗標）|
| **禁食(NPO)** | `OR.OPORDER` ORNPODT/ORNPOTM（手術 NPO）|
| 保密（候選）| `AM.HPBASIC` HMRLOCK / HMRLKDEG（病歷列管分級）|
| 安寧/維生（候選）| `AM.HPBASIC` HICHOSP / HICLIFES |
| 過敏（**急診**）| `ER.ETROOT` ETDRUG（藥物過敏）|

### 急診（檢傷）
| 白板資料 | HIS 表.欄位 |
|---|---|
| 檢傷分級 | `ER.ETROOT` ETRANK；`ER.ETROOTS` FRANK（最後分級）|
| 到院/檢傷時間、看診科別、狀態 | `ER.ETROOT` ETDATE/ETTIME、ETSECT、ETSTAT |
| 生命徵象（BP/脈搏/呼吸/體溫/GCS/SaO2）| `ER.ETROOT` ETSYSTO/ETDIASTO/ETPULSE/ETBRATH/ETTEMPER/ETGCS；`ETROOTS` SAO2 |
| 死亡 / OHCA | `ER.ETROOT` ETDOA；`ER.ETROOTS` ISOHCA/ISOHCDIE/ISROSC |
| **特殊個案（自殺/家暴/傳染病/兒虐…＝「測謀」候選）** | `ER.ETROOTS` SCASE1~12 |
| 重症通報 / 到院前預警 | `ER.ERCRANN`、`ER.ERWARNIN` |

### 手術（OR）
| 白板資料 | HIS 表.欄位 |
|---|---|
| 刀房 / 術式 / 主刀醫師 / 助手 | `OR.OPORDER` OROPROOM / OROPNM1 / ORDOCNM / ORADRNM1-5 |
| 麻醉方式 / 手術診斷 / 手術類型 | OROPAMED / ORDIAG / OROPFLAG |
| 預定手術時間 / 狀態 / 緊急刀 | ORBGNDT-TM / ORSTATUS / OREMRFG |
| 是否使用抗生素 | ORBIO |
| 來源（急/門/住刀）（候選）| ORCASETP（就醫類別）＋ OROPFLAG |

### 檢查 / 醫囑 / 報告
| 白板資料 | HIS 表.欄位 |
|---|---|
| 檢查/醫囑名稱、類型、狀態 | `OR.ORDER` ORPROCED / OROETYPE / ORSTATUS |
| 排程時間 / 完成（結束）時間 | `OR.ORDER` ORSCHDT-TM / ORENDDT-TM |
| 執行醫師 / 檢體 | OREXDRNM / ORSPENAM |
| **會診（候選）** | `OR.ORDER` ORCLVSNM/ORCLVSNO（被申請 VS 醫師）、ORSUGEST（急診會診去向）|
| 報告結果 | `OR.RESULT` / `OR.RESNUM`（數值）/ `OR.RESTEXT`（文字）|
| 醫囑文字描述 | `OR.ORDTEXT` ORWORDS |

### 抗生素（ICU）
| 白板資料 | HIS 表.欄位 |
|---|---|
| **抗生素旗標** | `UD.UDORDER` **UDANTFLG**（抗生素用途旗標）|
| 藥名 / 劑量 / 頻次 / 途徑 | UDMDPNAM·UDHIMDPN / UDDOSAGE / UDFREQN / UDROUTE |
| 開始 / 結束（首次給藥）時間 | UDBGNDT-TM / UDENDDT-TM（首次＝服藥時間 UDSCHPAT）|
| 開立醫師 / 狀態 | UDDOCNAM·UDOENAME / UDSTATUS |

## B. 報表庫未見 → 多在 HIS 排班/護理紀錄模組（未開放），開放前暫行自建
> ⚠ 更正：下列多數 **HIS 本身有**（排班為護理人員在 HIS 建立、管路/隔離等在護理紀錄），只是**未開放給民生**。應向高榮申請開放（[[缺漏與申請清單]] A2）；開放前暫行自建。唯跑馬燈/佈告欄/聯絡/避難圖、站別護理長等屬白板專屬，本就後台維護。
- **護理排班 / 主護（護理師負責床位）** → 後台「員編勾選病床」（[[護理排班]]）
- 護理人員 / 專師 / 住院醫師 **排班**、急診值班醫師、**照服員** 清單
- **會診醫師「每日各科值班下拉清單」**（會診申請/結果可由 `OR.ORDER`，但值班名單屬操作性）
- **醫師查房時間表**
- **護理交班 / OR 特殊交班**（OR 特殊交班源自流動護理師護理紀錄；盡量帶入、撈不到留白）
- **照護團隊**（科別/職別/姓名/電話）
- **RRT 標籤**、**策略病人（機構後送）**、依賴度 L1/L2/L3（民生不用、預留）
- 跑馬燈 / 佈告欄 / 聯絡電話 / 避難圖（✅ 後台已完成）
- **刷手 / 流動護理師**（派班系統，高榮無 API）

## C. ❓ 深掘結果（掃描全字典 ＋ 細讀 RESULT / TR.TRORDER）

### ✅ 已解掉
- **檢查/檢驗結果**：`OR.RESULT`（狀態 RSSTATUS/異常旗標）＋ `OR.RESNUM`（數值 RNRESVAL、正常值上下限 RNNRHIGH/LOW、單位、異常）＋ `OR.RESTEXT`（文字報告 RTRESTXT）。**申請(OR.ORDER)→結果鏈完整**。
- **過敏（住院/門診）候選**：`MR.EMRTRE` **HALERGY（過敏信息 nchar100）**；急診 `ER.ETROOT` ETDRUG、`BIMBA.ERDISPAT` ETDRUGC。
- **洗腎/透析（部分）**：無乾淨「當班透析清單」表；可由醫囑名稱 `OR.ORDER`/`TR.TRORDER` TRPROCED 過濾，或帳務側透析床編號 `AR.ARBROOT` ARHIMOID。洗腎室為第二階段。
- **呼吸器（天數）**：`BL.BLNHICAS` BLRT21DT/BLRTCNT（呼吸器累計日數）—**健保側、僅天數**，非置入/換管管理。

### ⛔ 重大結論：以下「全字典 0 筆」→ 不在這 81 報表庫
掃描 `管路/中心靜脈/鼻胃/導尿/氣管內管/隔離/高危跌/運送方式/運送等級/氧氣設備/約束/輪椅/推床` **皆 0 命中**。
→ 這些屬 **護理紀錄 / 護理評估系統**，**不在**目前備份報表庫（81 表）內。
→ **★最關鍵待確認**：高榮 **護理紀錄/評估系統是否另有 API/開放**？
　有 → 接該系統；**無 → 這批（含 ICU 管路 NG/CVC/導尿、隔離、高危跌、運送等級、氧氣）只能自建後台或視驗收取捨**。

### 仍待院方確認
- 會診**開放**與否（`OR.ORDER` ORCLVSNM/ORSUGEST 欄位在，存取待確認）
- 禁治療來源（醫令？）
- 運送等級 A/B/C（第1次會議稱「HIS 第二頁」有 → 應在另一系統/畫面，非此字典）
- 床號對應：Board_ER `床位` ↔ `AM.HLOC.HBED`

## D. 統計類（前端可由上述欄位計算，免額外資料）
總床/住院/手術/檢查/會診、ER 留觀/待床(一般/加護/隔離)/重症/輕中症 — 由 HCASE.HPATSTAT/HWBDDT、ETROOT.ETRANK、OR/UD 等彙總計算。

---
> 此分析可回頭**校正 [[資料項對照表]]** 的「來源/狀態」。待確認項已併入 [[待辦清單]] C 區。
> 相關：[[HIS資料字典-可用資源]]、[[Board_ER]]、[[後台總覽]]、[[00-總覽]]
