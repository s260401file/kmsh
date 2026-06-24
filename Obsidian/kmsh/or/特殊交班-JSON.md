---
tags: [kmsh, 技術, OR, 特殊交班, 試作]
---
# OR 特殊交班 — JSON 設計

> ✅ **已上線（schema_v8，2026-06-24）**：`GET /api/Board/or/handover`（自建 `OrHandover`，含病人/術式/主刀/轉病房床/出血/輸血/引流/注意事項，**全自建手填**）。HandoverTab 已接、免 F5；後台「OR 特殊交班」可增刪改；種子照搬原 mock。
> 對應分頁 `HandoverTab`（術後轉病房特殊交班表）。內容源自**流動護理師護理紀錄**（未開放）→ 手填。手術基本（術式/主刀/來源）目前一併手填；待 `OR.OPORDER`/Board_OR 自動帶入為**未來補洞**。
> 自建表 [[資料庫Schema]] `OrHandover`。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "OR", "QueryDate": "2026-06-03",
    "Items": [
      {
        "HandoverId": 2, "RoomId": "OR-03",
        "PatientName": "張○強", "Gender": "M", "Age": 34, "MedRecord": "C401234603",
        "SurgeryName": "右股骨骨折 ORIF", "SurgerySource": "急診刀", "SurgeonName": "王○哲醫師",
        "DestWard": "骨科病房（W52）", "DestBed": "W52-014", "EndTime": null,
        "BloodLoss": 350, "BloodTransfusion": 2,
        "DrainDetails": "Hemovac × 1（右大腿外側）",
        "SpecialNotes": "術中輸血 2u RBC，術後續觀察 Hb；右下肢伸直固定、禁重量承重，48h 內監測肢端循環。"
      }
    ]
  }
}
```

## 逐欄來源（三態 × 表/自建）
| 欄位 | 來源 | 表.欄位 / 自建 | 現況 |
|---|---|---|---|
| RoomId 刀房 | HIS候選/自建 | `OR.OPORDER` OROPROOM（或自建） | 候選 |
| PatientName/Gender/Age/MedRecord | HIS | `AM.HPBASIC` | ①有值 |
| SurgeryName 術式 | HIS候選 | `OR.OPORDER` OROPNM1 | 候選 |
| SurgerySource（急/門/住刀） | HIS候選 | `OR.OPORDER` ORCASETP/OROPFLAG | 候選 |
| SurgeonName 主刀 | HIS候選 | `OR.OPORDER` ORDOCNM | 候選 |
| EndTime 結束時間 | HIS候選/自建 | `OR.OPORDER` 狀態時間 | 候選 |
| **DestWard/DestBed** 術後轉病房/床 | 自建 | `OrSpecialHandover`（ToWard＋床） | 自建 |
| **BloodLoss/BloodTransfusion** 出血/輸血 | 自建 | `OrSpecialHandover`（護理紀錄，未開放） | ③→自建 |
| **DrainDetails** 引流管 | 自建 | `OrSpecialHandover` | ③→自建 |
| **SpecialNotes** 術後注意 | 自建 | `OrSpecialHandover.Content` | 自建 |
| 隔離/測謀（病房帶入） | 自建 | `OrSpecialHandover.IsolationFlag/SpecialFlag` | 自建 |

> `OrSpecialHandover` 需**擴充欄位**：`SurgeryName`/`SurgeonName`/`SurgerySource`/`DestWard`/`DestBed`/`EndTime`/`BloodLoss`/`BloodTransfusion`/`DrainDetails`（現僅 Content/FromWard/ToWard/旗標）→ 補進 [[資料庫Schema]]。

## API 組裝
- `GET /api/Board/or/handover?date=`：核心交班內容讀自建 `OrSpecialHandover`；手術基本（術式/主刀/來源）OPORDER 開放後帶入、否則留白。
- **★核心可立即自建上線**（交班細節本就護理紀錄手填）；手術基本待 OPORDER 開放再自動補。

相關：[[OR手術動態-JSON與組裝]] · [[資料庫Schema]] · [[資料項對照表]] · [[OR]]
