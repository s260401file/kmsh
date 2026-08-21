---
tags: [kmsh, API, 院方]
---
# Board_Note（院方臨床註記：洗腎／禁治療／禁食）

`POST http://10.20.111.84:8088/api/v1/Board_Note`、header `x-api-key`、body **`{}`**（回全院；帶 `{"病房":...}` 會回空 → **不帶病房參數**，改以病歷號比對在床名單）。回 `{ success, data[] }`，**每筆＝一位病人**。2026-08 院方新增；用於 **W52／ICU 病室動態底部「洗腎／禁治療／禁食」徽章**。

## 回應欄位（皆中文鍵、補空白需 trim）
| 欄位 | 說明 |
|---|---|
| 病歷號 | 補空白，需 trim；與 Board_bed `HHISNUM` 同源、為合併鍵 |
| 姓名 | 全形補空白 |
| 病房 | AICU／CICU／W52／W61／W62／W81…（全院） |
| 床位 | 如 `007` |
| **洗腎註記** | `"Y"`／`"N"` |
| **禁治療註記** | `null` 或值 |
| **禁食註記** | `null` 或 NPO 描述文字（如 `NPO SINCE MIDNIGHT`／`NPO NG FREE DRAIN`／`7/20 早餐後NPO`）|

判定規則：`NoteOn(s) = 非空白 && trim ≠ "N"` → 三項共用（洗腎 Y→true、N→false；禁治療/禁食 null→false、有值→true）。禁食僅取有無，**不顯示** NPO 明細文字。

## 合併策略：院方為主、後台為輔（row-level）
- 病人**出現在 Board_Note** → 一律以院方值為準（院方 N／空即 false，即使後台曾勾）。
- 病人**院方查無** → 回退自建後台 `WardPatientExt`（`Renal`／`Crrt`／`NoTreatment`／`Npo`）。
- W52 洗腎→`Renal`；**ICU 洗腎→`Crrt`**（ICU 洗腎徽章讀 `crrt`）。禁治療→`NoTreatment`、禁食→`Npo`。

## 實作
- `Services/BoardApiService.GetNoteAsync`（容錯回空、逐欄 trim）；模型 `Models/Board/BoardNoteItem.cs`。
- `Controllers/BoardController.cs`：W52 `GetW52`、ICU `GetIcu→AddFloor` 各建 `noteByHis`（`FreshOrStaleAsync("note:board",45,…)` 共用快取），以 `MergeNote(病歷號, overlay)` 取三旗標。
- 前台 [[W52病室動態-JSON與組裝]]／ICU 徽章邏輯**未改**（後端填旗標即自動顯示）。
- 待辦：後台三欄（`AdminPage` `WARD_BOOLS` renal/noTreatment/npo、`WardPatientExt` 欄位）**日後移除**（見 [[待辦清單]] C 區）。
