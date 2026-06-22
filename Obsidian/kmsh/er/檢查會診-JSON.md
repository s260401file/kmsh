---
tags: [kmsh, 技術, ER, 檢查會診, 試作]
---
# ER 檢查／會診 — JSON 設計

> 對應分頁 `ExamTab`（檢查 + 會診兩清單）。檢查 ✅有表 `OR.ORDER`＋`OR.RESULT`；會診 `OR.ORDER` ORCLVSNM/ORSUGEST（候選/開放待確認）。結構同 [[檢查會診-JSON|W52 檢查/會診]]，急診情境欄位略異（會診含 ConsultTime/已回覆-待回覆）。

## ⚠ 實測更新（2026-06-22）
鍵名：`OR.ORDER`/`ORDTEXT`＝`ORHISNUM`、報告＝`RSHISNUM`。**可用**：`ORPROCED`(項目)、`ORCLVSNM`(會診VS姓名)、`RTRESTXT`(文字報告)。**不可用**：會診去向 `ORSUGEST`、VS代號 `ORCLVSNO`、`OREXDRNM`/`ORSPENAM` 空；`OROETYPE` 全同值（無法分檢查類型）、`ORSCHDT/ORSCHTM` 異常（排程時間不可靠）；報告 `RSSTATUS` 全同值（狀態不可用）。→ 會診僅顯示科別/VS姓名/項目；檢查狀態與排程時間需另尋或暫不顯示。詳 [[欄位資料實況]]。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "ER", "QueryDate": "2026-06-03",
    "Exams": [
      { "ExamId": 1, "BedId": "MER01", "PatientName": "王○明", "ExamName": "胸部 X 光",
        "ScheduledDate": "2026-06-03", "TimeSlot": "09:00", "Status": "完成", "Notes": "" },
      { "ExamId": 5, "BedId": "MER07", "PatientName": "林○宏", "ExamName": "腹部 CT（顯影）",
        "ScheduledDate": "2026-06-03", "TimeSlot": "13:00", "Status": "待執行", "Notes": "腎功能確認中" }
    ],
    "Consults": [
      { "ConsultId": 3, "BedId": "MER05", "PatientName": "陳○美", "ConsultDept": "心臟內科",
        "ConsultDoctor": "林○哲醫師", "ConsultTime": null, "Status": "待回覆", "Notes": "疑似 STEMI，請急會" }
    ]
  }
}
```

## 逐欄來源（三態 × 表）
| 欄位 | 來源 | 表.欄位 | 現況 |
|---|---|---|---|
| BedId / PatientName | HIS | `AM.HLOC.HBED`、`AM.HPBASIC`（Board_ER 回傳） | ①有值/待確認 |
| **檢查** ExamName | HIS | `OR.ORDER` ORPROCED | 候選 |
| ScheduledDate/TimeSlot | HIS | `OR.ORDER` ORSCHDT/ORSCHTM | 候選 |
| Exam Status（完成/執行中/待執行） | HIS | `OR.ORDER` ORSTATUS（＋`OR.RESULT`） | 候選 |
| Exam Notes | HIS | `OR.ORDTEXT` ORWORDS | 候選 |
| **會診** ConsultDept/ConsultDoctor | HIS | `OR.ORDER` ORSUGEST（去向）/ORCLVSNM（VS） | 候選/**開放待確認** |
| ConsultTime/Status（已回覆/待回覆） | HIS | `OR.ORDER` ORENDDT-TM/ORSTATUS | 候選 |
| Consult Notes | HIS | `OR.ORDTEXT` ORWORDS / `OR.RESULT` | 候選 |

> 會診**紀錄**（本頁，HIS）≠ 各科**值班醫師**清單（[[急診值班表-JSON]] OnCallDoctors，自建）。

## API 組裝
- `GET /api/Board/er/exam`：以 `OR.ORDER`（ER 在室病人、檢查/會診類）一次查，狀態鏈接 `OR.RESULT`；或用 `NonExSchList`（chktype=CHK/CON）。前端分「檢查/會診」兩清單。
- HIS 為主 → 待開放；會診是否開放需向高榮確認（[[待辦清單]] C）。急診本身 [[Board_ER]] 已開放但不含檢查/會診明細。

相關：[[ER急診動態-JSON與組裝]] · [[檢查會診-JSON|W52 檢查/會診]] · [[HIS可用與缺漏分析]] · [[ER]]
