---
tags: [kmsh, 技術, W52, 檢查會診, 試作]
---
# W52 檢查／會診 — JSON 設計

> 對應分頁 `ExamTab`（檢查 + 會診兩區）。檢查 ✅有表 `OR.ORDER`＋`OR.RESULT`；會診 `OR.ORDER` ORCLVSNM/ORSUGEST（候選/開放待確認）。亦可由 `NonExSchList`（chktype=CHK/CON）取已排程項。
> 方法同 [[W52病室動態-JSON與組裝]]；來源見 [[HIS可用與缺漏分析]]、[[資料項對照表]]。

## ⚠ 實測更新（2026-06-22）
鍵名：`OR.ORDER`/`ORDTEXT`＝`ORHISNUM`、報告＝`RSHISNUM`。**可用**：`ORPROCED`、`ORCLVSNM`(會診VS姓名)、`RTRESTXT`(文字報告)。**不可用**：`ORSUGEST`/`ORCLVSNO`/`OREXDRNM`/`ORSPENAM` 空；`OROETYPE` 全同值、`ORSCHDT/ORSCHTM` 異常；報告 `RSSTATUS` 全同值、`RNRESVAL` 部分。詳 [[欄位資料實況]]。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52", "QueryDate": "2026-06-03",
    "Examinations": [
      { "ExamId": 1, "BedNo": "019", "PatientName": "賴○月", "Gender": "F", "Age": 71,
        "ExamName": "Echocardiogram", "ScheduledDate": "2026-06-03", "TimeSlot": "上午",
        "ScheduledTime": "08:00", "Status": "待執行", "Remarks": "術前評估" }
    ],
    "Consultations": [
      { "ConsultId": 1, "BedNo": "019", "PatientName": "賴○月", "Gender": "F", "Age": 71,
        "ConsultDept": "心臟外科", "ConsultDoctor": "黃○誠 主任",
        "CompletedAt": "2026-06-03 07:45", "Status": "已完成", "Remarks": "建議 MVR" }
    ]
  }
}
```

## 逐欄來源（三態 × 表）
| 欄位 | 來源 | 表.欄位 | 現況 |
|---|---|---|---|
| BedNo / 病人(Name/Gender/Age) | HIS | `AM.HLOC.HBED`、`AM.HPBASIC` | ①有值/待開放 |
| **檢查** ExamName | HIS | `OR.ORDER` ORPROCED | 候選 |
| ScheduledDate/Time/TimeSlot | HIS | `OR.ORDER` ORSCHDT/ORSCHTM | 候選 |
| Exam Status（待執行/已完成/預約） | HIS | `OR.ORDER` ORSTATUS（＋`OR.RESULT` 報告） | 候選 |
| Exam Remarks | HIS | `OR.ORDTEXT` ORWORDS | 候選 |
| **會診** ConsultDept/ConsultDoctor | HIS | `OR.ORDER` ORSUGEST（去向）/ORCLVSNM（VS） | 候選/**開放待確認** |
| Consult CompletedAt/Status | HIS | `OR.ORDER` ORENDDT-TM/ORSTATUS | 候選 |
| Consult Remarks | HIS | `OR.ORDTEXT` ORWORDS / `OR.RESULT` | 候選 |

> 「會診醫師**值班下拉清單**」是另一件事（操作性、自建 `ConsultDutyDaily`）；本頁是**會診紀錄**（HIS）。

## API 組裝
- `GET /api/Board/w52/exam`：以 `OR.ORDER`（W52 在床病人、檢查/會診類）一次查，狀態鏈接 `OR.RESULT`；或用 `NonExSchList` 取已排程項。前端分「檢查/會診」兩區。
- HIS 為主 → 待開放；會診是否開放需向高榮確認（[[待辦清單]] C）。

相關：[[W52病室動態-JSON與組裝]] · [[HIS可用與缺漏分析]] · [[資料項對照表]] · [[W52-一般病房]]
