---
tags: [kmsh, 技術, W52, 排班資訊, 試作]
---
# W52 排班資訊 — JSON 設計

> 對應分頁 `ScheduleTab`。護理排班/主護負責床位 🔧**自建**（HIS 有但未開放，[[護理排班]]）；專師/住院醫師排班亦自建。
> 自建表 [[資料庫Schema]]（`NurseStaff`/`NurseBedAssignment`/`ShiftStaff`）。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52", "QueryDate": "2026-06-02",
    "Shifts": [
      {
        "ShiftType": "白班", "ShiftTime": "08:00–16:00",
        "Nurses": [
          { "StaffId": 1, "PeNo": "N001", "PeName": "林○芳", "Role": "護理長", "Extension": "5210", "BedNos": [], "EmergencyGroup": "指揮", "CheckIn": true },
          { "StaffId": 2, "PeNo": "N002", "PeName": "陳○梅", "Role": "護理師", "Extension": "5201", "BedNos": ["001","002","003","004"], "EmergencyGroup": "A", "CheckIn": true }
        ],
        "Specialists": [ { "StaffId": 10, "PeNo": "S001", "PeName": "李○玲", "Specialty": "傷口照護", "Extension": "5220" } ],
        "Residents": [ { "StaffId": 20, "PeNo": "R001", "PeName": "吳○明", "Department": "一般外科", "Extension": "5300" } ]
      }
    ]
  }
}
```

## 逐欄來源（全自建）
| 欄位 | 來源 | 自建表 | 說明 |
|---|---|---|---|
| ShiftType/ShiftTime | 自建 | 班別常數/設定 | 白/小夜/大夜 |
| Nurses.PeNo/PeName/Role/Extension | 自建 | `NurseStaff`（EmployeeNo/Name/TitleLevel/Phone） | 員編登入 |
| Nurses.BedNos 負責床位 | 自建 | `NurseBedAssignment`（員編勾床；多床彙整） | 主護核心 |
| Nurses.EmergencyGroup 緊急編組 | 自建 | `NurseBedAssignment.TeamCode`（指揮/A/B） | |
| Nurses.CheckIn 點班 | 自建 | `NurseBedAssignment.IsCharge` | |
| Specialists（專師） | 自建 | `ShiftStaff`（Role=專師, +Specialty） | |
| Residents（住院醫師） | 自建 | `ShiftStaff`（Role=住院醫師, +Department） | |

> `NurseBedAssignment` 為「一床一列」；本 JSON 以護理師彙整其 `BedNos[]`（聚合 group by 員編）。

## API 組裝
- 純自建 `GET /api/Board/w52/schedule?date=`：讀 `NurseStaff`＋`NurseBedAssignment`（本日/班）＋`ShiftStaff`，後端 group by 班別/人員組出 `Shifts[]`。
- **現可先自建上線**（過渡期有與 HIS 雙重輸入缺點，[[護理排班]]）；待高榮開放主護欄位再切自動帶入。

相關：[[護理排班]] · [[資料庫Schema]] · [[W52病室動態-JSON與組裝]] · [[W52-一般病房]]
