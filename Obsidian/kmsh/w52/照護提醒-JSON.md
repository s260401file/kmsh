---
tags: [kmsh, 技術, W52, 照護提醒, 試作]
---
# W52 照護提醒 — JSON 設計

> 對應分頁 `CareTab`。病人基本來自 HIS，提醒內容/分類/完成狀態為**自建**（HIS 無此操作性資料）。
> 方法同 [[W52病室動態-JSON與組裝]]；來源/狀態見 [[資料項對照表]]、[[欄位資料實況]]；自建表 [[資料庫Schema]]。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52", "QueryTime": "2026-06-02T08:30:00",
    "Items": [
      { "ReminderId": 1, "BedId": "W52-014", "BedNo": "014",
        "PatientName": "林○志", "Gender": "M", "Age": 75,
        "Priority": "高", "Category": "術後照護",
        "Content": "術後第3天傷口換藥，確認引流量並回報醫師",
        "RemindTime": "08:30", "PrimaryNurse": "陳○護理師", "IsDone": false }
    ]
  }
}
```

## 逐欄來源（三態 × 表/自建）
| 欄位 | 來源 | 表.欄位 / 自建 | 現況 |
|---|---|---|---|
| BedId/BedNo | HIS | `AM.HLOC.HBED` | 待開放 |
| PatientName/Gender/Age | HIS | `AM.HPBASIC` HNAMEC/HSEX/HBIRTHDT | ①有值 |
| Priority 優先序 | 自建 | `CareReminder.Priority` | 自建 |
| Category 類別 | 自建 | `CareReminder.Category`（術後/感控/管路/跌倒/藥物/衛教/出院…） | 自建 |
| Content 內容 | 自建 | `CareReminder.Content` | 自建 |
| RemindTime 提醒時間 | 自建 | `CareReminder.RemindTime` | 自建 |
| PrimaryNurse 責任護理師 | 自建 | `NurseBedAssignment`＋`NurseStaff` | 自建 |
| IsDone 完成 | 自建 | `CareReminder.IsDone` | 自建 |

> 待建自建表 **`CareReminder`**（沿用慣例：Id/UnitCode/Hhisnum/Hbed/Priority/Category/Content/RemindTime/IsDone/IsActive/CreatedAt）— 補進 [[資料庫Schema]]。

## API 組裝
- 純自建端點 `GET /api/Board/w52/care-reminder`：讀 `CareReminder`（本單位 active），以 Hbed join 病人基本（HIS 開放前先存提醒當下姓名/床）。
- 與病室動態同套輪詢；提醒量小，1 次查詢即可。
- **現可先自建上線**（與 HIS 無相依）。

相關：[[W52病室動態-JSON與組裝]] · [[資料庫Schema]] · [[資料項對照表]] · [[W52-一般病房]]
