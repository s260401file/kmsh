---
tags: [kmsh, 技術, W52, 護理交班, 試作]
---
# W52 護理交班 — JSON 設計

> 對應分頁 `HandoverTab`。護理交班 🔧**自建**（HIS 無此操作性資料）。結構為「交班資訊 + 各病患交班卡（分類事項）」，比 [[資料庫Schema]] 現有 `Handover`（單一長文字）更結構化 → 需擴充自建表。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52", "QueryDate": "2026-06-02",
    "HandoverInfo": {
      "FromShift": "白班", "FromShiftTime": "08:00–16:00",
      "ToShift": "小夜", "ToShiftTime": "16:00–24:00", "HandoverTime": "16:00",
      "FromNurses": ["陳○梅","蔡○柔"], "ToNurses": ["鄭○雲","林○靜"]
    },
    "Patients": [
      { "HandoverId": 1, "BedNo": "001", "PatientName": "林○志", "Gender": "M", "Age": 75,
        "Diagnosis": "股骨頸骨折 — THA 術後 D2", "Priority": "高",
        "Items": [
          { "Category": "管路", "Content": "尿管 D2、CVP D3，注意引流量" },
          { "Category": "用藥", "Content": "Morphine 5mg PRN q4h" },
          { "Category": "警示", "Content": "跌倒高風險、夜間譫妄，加強巡視" }
        ]
      }
    ]
  }
}
```

## 逐欄來源（三態 × 表/自建）
| 欄位 | 來源 | 表.欄位 / 自建 | 現況 |
|---|---|---|---|
| HandoverInfo（交/接班別/時間/人員） | 自建 | `Handover`（+班別/人員）＋`NurseBedAssignment` | 自建 |
| Patients.BedNo/PatientName/Gender/Age | HIS | `AM.HLOC.HBED`、`AM.HPBASIC` | ①有值/待開放 |
| Patients.Diagnosis | HIS | `AM.HDIAGNOS` HDIAGTXT | 候選 |
| Patients.Priority | 自建 | 交班卡優先序 | 自建 |
| Patients.Items[].Category | 自建 | 管路/用藥/生命徵象/警示/家屬/待辦 | 自建 |
| Patients.Items[].Content | 自建 | 交班內容 | 自建 |

> 現有 `Handover` 為單筆長文字；本頁需 **`HandoverPatient`（一病人一卡）＋`HandoverItem`（分類事項）** 子表，或在 `Handover` 存結構化 JSON。建議補進 [[資料庫Schema]]。

## API 組裝
- 純自建 `GET /api/Board/w52/handover?date=&shift=`：讀交班 header＋病人交班卡＋事項；病人基本以 Hbed join HIS（開放前存當下姓名/診斷）。
- **現可自建上線**；屬輸入密集，後台表單需好操作。

相關：[[資料庫Schema]] · [[W52病室動態-JSON與組裝]] · [[後台總覽]] · [[W52-一般病房]]
