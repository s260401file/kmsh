---
tags: [kmsh, 技術, ER, 大量傷患, 試作]
---
# ER 大量傷患（MCI）— JSON 設計

> 對應分頁 `MassCasualtyTab`。**無獨立資料源**：把 ER 病室動態（[[ER急診動態-JSON與組裝]]）所有在室病人**攤平成一張總表、依檢傷級別排序、上方各級人數統計**，供 MCI 情境快速掌握。
> ⇒ 資料可用性與「急診動態」**完全相同**（[[Board_ER]]＋`ER.ETROOT` 檢傷＋自建註記）；本頁僅是聚合視圖。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "ER", "QueryTime": "2026-06-03T11:30:00",
    "Stats": { "total": 17, "sevA": 5, "sevB": 7, "sevC": 5, "dead": 0, "transfer": 1 },
    "Patients": [
      { "BedId": "MER01", "PatientName": "王○進", "Gender": "M", "Age": 73, "MedRecord": "C401234569",
        "Triage": 1, "Grade": "A", "Department": "心臟內科",
        "Diagnosis": "Cardiac arrest, ROSC", "ArrivalTime": "11:08",
        "Flags": { "Deceased": false, "Mbd": false, "Aad": false, "Dnr": false,
                   "Observation": false, "Admitted": false, "AdmBedNo": null,
                   "TransferOut": false, "TransferIn": false } }
    ]
  }
}
```
> `Grade` 由 `Triage` 換算（1–2→A 重症、3→B 中症、4–5→C 輕症）；`Patients` 依 Triage 升冪排序。

## 逐欄來源（沿用急診動態）
| 欄位 | 來源 | 表.欄位 / 自建 | 現況 |
|---|---|---|---|
| BedId / PatientName / Gender / Age / MedRecord | HIS | `AM.HLOC.HBED`、`AM.HPBASIC` | ①有值/待確認 |
| Triage（→Grade A/B/C） | HIS | `ER.ETROOT` ETRANK | ✅可（Board_ER）|
| Department / Diagnosis | HIS | `ETSECT` / 主訴`HDIAGNOS` | 候選 |
| ArrivalTime | HIS | `ER.ETROOT` ETDATE/ETTIME | 候選 |
| Flags.Deceased | HIS | `ER.ETROOT` ETDOA、`ETROOTS` ISOHCDIE | 候選 |
| Flags.Mbd / Aad | HIS | 出院區分 `HDISCHRG` HDISTYPE？ | **代碼待確認** |
| Flags.Observation / Admitted / AdmBedNo / TransferIn / TransferOut | HIS | Board_ER 動向代碼、`HCASE`/`HDISCHRG` | 代碼待確認 |
| Flags.Dnr | 自建 | (急診 DNR ②空值) → `PatientMarker` | ②→自建 |
| Stats（total/各級/死亡/轉出） | 前端/後端算 | 由 Patients 彙總 | — |

## API 組裝
- **不另開資料來源**：可由 `GET /api/Board/er`（急診動態）回傳的 `Beds[]` 在前端攤平排序＋彙總；或後端另出輕量 `GET /api/Board/er/mci`（同源、回攤平 + Stats）。
- 既與急診動態同源 → 同一份快取即可；MCI 情境輪詢可較密（檢傷頁頻率，[[即時更新-輪詢設計]]）。
- 待確認：`Mbd/Aad` 對應碼、Board_ER 動向代碼、是否回全部在室（[[待辦清單]] E、[[ER急診動態-JSON與組裝]]）。

相關：[[ER急診動態-JSON與組裝]] · [[Board_ER]] · [[HIS可用與缺漏分析]] · [[ER]]
