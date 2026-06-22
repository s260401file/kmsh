---
tags: [kmsh, 技術, ICU, 檢查會診, 試作]
---
# ICU 檢查／會診 — JSON 設計

> 對應分頁 `ExamTab`（檢查 + 會診兩區）。檢查 ✅有表 `OR.ORDER`＋`OR.RESULT`；會診 `OR.ORDER` ORCLVSNM/ORSUGEST（候選/開放待確認）。結構同 [[檢查會診-JSON|W52 檢查/會診]]，篩選對象為 ICU。

## ⚠ 實測更新（2026-06-22）
鍵名：`OR.ORDER`/`ORDTEXT`＝`ORHISNUM`、報告＝`RSHISNUM`。**可用**：`ORPROCED`、`ORCLVSNM`(會診VS姓名)、`RTRESTXT`(文字報告)。**不可用**：`ORSUGEST`/`ORCLVSNO`/`OREXDRNM`/`ORSPENAM` 空；`OROETYPE` 全同值、`ORSCHDT/ORSCHTM` 異常；報告 `RSSTATUS` 全同值、`RNRESVAL` 部分。詳 [[欄位資料實況]]。

## 試作 JSON
```json
{
  "success": true, "message": "",
  "data": {
    "wardCode": "ICU", "queryDate": "2026-06-03",
    "examinations": [
      { "examId": 1, "bedId": "F4-01", "patientName": "林○志", "gender": "M", "age": 72,
        "examName": "Chest CT w/ contrast", "scheduledDate": "2026-06-03", "timeSlot": "上午",
        "scheduledTime": "09:00", "status": "待執行", "remarks": "肺炎評估" }
    ],
    "consultations": [
      { "consultId": 1, "bedId": "F4-01", "patientName": "林○志", "gender": "M", "age": 72,
        "consultDept": "感染科", "consultDoctor": "魏○欣 醫師",
        "completedAt": "2026-06-03 08:30", "status": "已完成", "remarks": "抗生素方案調整建議" }
    ]
  }
}
```

## 逐欄來源（三態 × 表）
| 欄位 | 來源 | 表.欄位 | 現況 |
|---|---|---|---|
| bedId / 病人(name/gender/age) | HIS | `AM.HLOC.HBED`、`AM.HPBASIC` | ①有值/待開放 |
| **檢查** examName | HIS | `OR.ORDER` ORPROCED | 候選 |
| scheduledDate/Time/timeSlot | HIS | `OR.ORDER` ORSCHDT/ORSCHTM | 候選 |
| Exam status（待執行/已完成/預約） | HIS | `OR.ORDER` ORSTATUS（＋`OR.RESULT`） | 候選 |
| Exam remarks | HIS | `OR.ORDTEXT` ORWORDS | 候選 |
| **會診** consultDept/consultDoctor | HIS | `OR.ORDER` ORSUGEST/ORCLVSNM | 候選/**開放待確認** |
| Consult completedAt/status | HIS | `OR.ORDER` ORENDDT-TM/ORSTATUS | 候選 |
| Consult remarks | HIS | `OR.ORDTEXT` ORWORDS / `OR.RESULT` | 候選 |

> 會診醫師「**每日值班下拉**」另為自建 `ConsultDutyDaily`（操作性，免點病人即見當日各科會診醫師，ICU 第5次會議需求）；本頁為**會診紀錄**（HIS）。

## API 組裝
- `GET /api/Board/icu/exam`：`OR.ORDER`（ICU 在床、檢查/會診類）一次查，狀態鏈接 `OR.RESULT`；或用 `NonExSchList`（chktype=CHK/CON）取已排程項。
- HIS 為主 → 待開放；會診是否開放需向高榮確認（[[待辦清單]] C）。

相關：[[ICU病室動態-JSON與組裝]] · [[檢查會診-JSON|W52 檢查/會診]] · [[HIS可用與缺漏分析]] · [[ICU]]
