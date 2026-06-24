---
tags: [kmsh, 技術, OR, 手術派班, 試作]
---
# OR 手術派班 — JSON 設計

> ✅ **已上線（schema_v8，2026-06-24）**：`GET /api/Board/or/schedule`（自建 `OrShiftStaff` 班級人員＋`OrShiftRoom` 房×班 刷手/流動，刀房清單用 `OrRoom` 主檔，後端 group by 班別組 Shifts[]）。ScheduleTab 已接、免 F5；後台「OR 手術派班」可增刪改；種子照搬原 mock。
> 對應分頁 `ScheduleTab`（三班 × 各刀房派班）。OR 派班系統**高榮無 API → 全自建**（[[資料項對照表]]、第5次會議）。實作改用 OR 專屬小表 `OrShiftStaff`/`OrShiftRoom`（非共用大表 ShiftStaff），與 ErOnCallDoctor/OrRoom 一致。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "OR", "QueryDate": "2026-06-03",
    "Shifts": [
      {
        "ShiftType": "白班", "ShiftTime": "08:00–16:00",
        "Charge": { "Name": "陳○雅護理長", "Extension": "5510" },
        "Anesthesia": [
          { "StaffId": 1, "Name": "劉○欣 醫師", "Role": "主治麻醉科醫師", "Extension": "5520" },
          { "StaffId": 2, "Name": "林○恩 住院醫師", "Role": "住院醫師（R2）", "Extension": "5521" }
        ],
        "CircTech": { "Name": "蔡○中 技師", "Role": "體外循環技師", "Extension": "5530" },
        "Rooms": [
          { "RoomId": "OR-01", "ScrubNurse": "張○惠護理師", "CircNurse": "李○婷護理師", "Extension": "5501" },
          { "RoomId": "OR-02", "ScrubNurse": "周○娟護理師", "CircNurse": "王○珊護理師", "Extension": "5502" }
        ]
      }
    ]
  }
}
```

## 逐欄來源（全自建）
| 欄位 | 來源 | 自建表 | 說明 |
|---|---|---|---|
| ShiftType/ShiftTime | 自建 | 班別常數/設定 | 白/小夜/大夜 |
| Charge 值班護理長 | 自建 | `ShiftStaff`（Role=護理長） | |
| Anesthesia[] 麻醉科人員 | 自建 | `ShiftStaff`（Role=麻醉醫師，含主治/住院醫師） | |
| CircTech 體外循環技師 | 自建 | `ShiftStaff`（Role=體循技師；null=該班無） | |
| Rooms[].RoomId 刀房 | 固定 | 刀房清單（OR-01/02/03/05/06/07/08） | OR-04 已移除 |
| Rooms[].ScrubNurse 刷手 | 自建 | `OrShiftAssignment.ScrubNurseEmpNo`→`NurseStaff` | null=未派 |
| Rooms[].CircNurse 流動 | 自建 | `OrShiftAssignment.CirculatingNurseEmpNo`→`NurseStaff` | null=未派 |
| Rooms[].Extension 分機 | 自建 | 刀房分機（設定/`OrShiftAssignment`） | |

> `OrShiftAssignment`（一房一班一列：room-level 刷手/流動）＋ `ShiftStaff`（班級：護理長/麻醉/體循）；後端 group by 班別組出 `Shifts[]`。

## API 組裝
- 純自建 `GET /api/Board/or/schedule?date=`：讀 `OrShiftAssignment`＋`ShiftStaff`（本日），group by 班別→刀房。
- **★現可立即自建上線**（高榮無對應、不等院方）。量小、輪詢頻率低。

相關：[[OR手術動態-JSON與組裝]] · [[資料庫Schema]] · [[資料項對照表]] · [[OR]]
