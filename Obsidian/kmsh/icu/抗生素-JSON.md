---
tags: [kmsh, 技術, ICU, 抗生素, 試作]
---
# ICU 抗生素 — JSON 設計

> 對應分頁 `AntibioticTab`（per-bed 抗生素清單）。✅有表 `UD.UDORDER`（UDANTFLG 抗生素旗標），屬 HIS 候選/待開放。
> 方法同 [[ICU病室動態-JSON與組裝]]；來源見 [[HIS可用與缺漏分析]]。

## ⚠ 實測更新（2026-06-22）
`UD.UDORDER` 的 **`UDANTFLG`（抗生素旗標）實測為空** → **不能用旗標篩抗生素**。改以 **`UDMDPNAM` 比對院內抗生素藥名清單**（或自建抗生素旗標）判定。藥名/劑量/頻次/途徑/起迄（`UDBGNDT`/`UDENDDT`/`UDSCHPAT`）皆可用；鍵 `HHISNUM`。化療 `UDDCJUST` 亦空。詳 [[欄位資料實況]]、[[待辦清單]]（取得抗生素藥名清單）。

## 試作 JSON
```json
{
  "success": true, "message": "",
  "data": {
    "wardCode": "ICU", "queryDate": "2026-06-03",
    "beds": [
      { "id": "F4-01", "antibiotics": [
        { "antibioticId": 1, "drugName": "Vancomycin 1g",
          "startDateTime": "2026-06-01 08:00", "firstDoseDateTime": "2026-06-01 08:30", "endDateTime": "2026-06-08 08:00" },
        { "antibioticId": 2, "drugName": "Meropenem 1g",
          "startDateTime": "2026-06-02 12:00", "firstDoseDateTime": "2026-06-02 12:10", "endDateTime": "2026-06-09 12:00" }
      ]},
      { "id": "F4-03", "antibiotics": [] }
    ]
  }
}
```

## 逐欄來源（三態 × 表）
| 欄位 | 來源 | 表.欄位 | 現況 |
|---|---|---|---|
| id 床號 | HIS | `AM.HLOC.HBED` | 待開放 |
| antibiotics[].drugName 藥名 | HIS | `UD.UDORDER` UDMDPNAM / UDHIMDPN（＋劑量 UDDOSAGE） | 候選 |
| startDateTime 開始 | HIS | `UD.UDORDER` UDBGNDT/UDBGNTM | 候選 |
| firstDoseDateTime 首次給藥 | HIS | `UD.UDORDER` UDSCHPAT（服藥時間） | 候選 |
| endDateTime 結束 | HIS | `UD.UDORDER` UDENDDT/UDENDTM | 候選 |
| （篩選條件）抗生素旗標 | HIS | `UD.UDORDER` **UDANTFLG** | ⛔**實測空值** → 改用藥名比對 |
| （另可顯示）開立醫師/狀態 | HIS | `UD.UDORDER` UDDOCNAM/UDOENAME、UDSTATUS | 候選 |

## API 組裝
- `GET /api/Board/icu/antibiotic?date=`：以 `UD.UDORDER` 過濾 `UDANTFLG`＋ICU 在床病人，group by 床號 → `beds[].antibiotics[]`。
- 純 HIS（無自建相依）→ **待 UDORDER 開放**；開放前以暫存/mock。量略大，後端可 bulk by unit、快取。
- 與病室動態分頁併行，輪詢頻率可較低（藥囑變動慢）。

相關：[[ICU病室動態-JSON與組裝]] · [[HIS可用與缺漏分析]] · [[資料項對照表]] · [[ICU]]
