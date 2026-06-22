---
tags: [kmsh, 技術, ICU, 手術資訊, 試作]
---
# ICU 手術資訊 — JSON 設計

> 對應分頁 `SurgeryTab`（ICU 病人前後數日手術）。✅有表 `OR.OPORDER`（HIS 候選/待開放）。結構同 [[手術資訊-JSON|W52 手術資訊]]，僅篩選對象為 ICU 在床病人。

## ⚠ 實測更新（2026-06-22）
✅ `OR.OPORDER` 核心**可用**（刀房/術式/主刀/助手/麻醉/狀態/來源/起始時間）；鍵＝**`ORHISNUM`**。⚠ NPO `ORNPODT/ORNPOTM` 異常、`ORDIAG`/`OREMRFG`/`ORBIO` 部分空。詳 [[欄位資料實況]]。

## 試作 JSON
```json
{
  "success": true, "message": "",
  "data": {
    "wardCode": "ICU", "queryDate": "2026-06-03",
    "items": [
      { "surgeryId": 5, "date": "2026-06-03", "orRoom": "OR-02", "scheduledTime": "11:00",
        "bedId": "F4-05", "patientName": "黃○雄", "gender": "M", "age": 80,
        "procedure": "腦室外引流（EVD）", "diagnosis": "顱內出血",
        "anesthesiaMethod": "全身麻醉", "attendingSurgeon": "洪○醫師", "status": "手術中" }
    ]
  }
}
```

## 逐欄來源（三態 × 表）
| 欄位 | 來源 | 表.欄位 | 現況 |
|---|---|---|---|
| orRoom 刀房 | HIS | `OR.OPORDER` OROPROOM | 候選 |
| scheduledTime | HIS | `OR.OPORDER` ORBGNDT/ORBGNTM | 候選 |
| bedId | HIS | `AM.HLOC.HBED` | 待開放 |
| patientName/gender/age | HIS | `AM.HPBASIC` | ①有值 |
| procedure 術式 | HIS | `OR.OPORDER` OROPNM1 | 候選 |
| diagnosis | HIS | `OR.OPORDER` ORDIAG / `AM.HDIAGNOS` | 候選 |
| anesthesiaMethod 麻醉 | HIS | `OR.OPORDER` OROPAMED | 候選 |
| attendingSurgeon 主刀 | HIS | `OR.OPORDER` ORDOCNM | 候選 |
| status 狀態 | HIS | `OR.OPORDER` ORSTATUS | 候選 |

## API 組裝
- `GET /api/Board/icu/surgery?date=`：OPORDER 查「日期區間 ＋ ICU 在床病人」；與 [[OR手術動態-JSON與組裝]]、[[手術資訊-JSON|W52 手術資訊]] 同來源、不同篩選。
- 純 HIS → 待 OPORDER 開放；無自建相依。

相關：[[ICU病室動態-JSON與組裝]] · [[OR手術動態-JSON與組裝]] · [[HIS可用與缺漏分析]] · [[ICU]]
