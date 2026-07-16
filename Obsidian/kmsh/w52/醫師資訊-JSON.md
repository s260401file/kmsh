---
tags: [kmsh, 技術, W52, 醫師資訊, 試作]
---
# W52 醫師資訊 — JSON 設計

> 對應分頁 `DoctorTab`：①醫師/專師負責床位 ②查房時間表。主治醫師可由 HIS `AM.HDOCTOR`（候選），**查房時間表為自建**（HIS 無，[[資料庫Schema]] `DoctorRound`）。

## ⚠ 版面更新（2026-07，已上線）— 值班醫療團隊改引用中央值班排程
> 病室動態 [[W52病室動態-JSON與組裝]] 內「值班表」面板第 2 段 **值班醫療團隊** 已上線：**引用全院共用「各科值班醫師每日輪值排程」**（`OnCallDept`＋`OnCallRoster`，由 ER 管理維護），非本頁 `HDOCTOR`。
> - 前台：`getOnCallBoardForUnit('W52')` → `[{ deptCode, deptName, doctorName, ext, mobile }]`（顯示為 科別＋醫師＋分機）。
> - 後台「W52 管理→顯示值班醫師」以 `saveUnitOnCallDepts` 挑科別＋排序（`UnitOnCallDept`）；面板依所設順序顯示**當日值班**醫師。
> - 病室動態床卡詳情之 **責任護理師可多位**（一床多主護，逗號並列）。
> DoctorTab 的「主治-床對應／查房時間表」仍如下（未變）。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52", "QueryDate": "2026-06-02",
    "DoctorBeds": [
      { "DoctorId": 1, "DoctorNo": "D001", "DoctorName": "張○明 醫師", "Role": "主治醫師",
        "Specialty": "一般外科", "Ext": "5301", "BedNos": ["001","002","003","004","005","006"] }
    ],
    "RoundSchedule": [
      { "RoundId": 1, "RoundDate": "20260602", "DoctorName": "張○明 醫師", "Specialty": "一般外科",
        "EstimatedTime": "09:00", "ActualTime": "09:08", "IsCompleted": true, "Remark": "" }
    ]
  }
}
```

## 逐欄來源（三態 × 表/自建）
| 區 | 欄位 | 來源 | 表.欄位 / 自建 | 現況 |
|---|---|---|---|---|
| DoctorBeds | DoctorNo/DoctorName/Specialty | HIS | `AM.HDOCTOR` HDOCNAMC(+HMDTYPE) | 候選 |
| DoctorBeds | Role（主治/專師） | HIS/自建 | `HDOCTOR` HMDTYPE；專師補自建 | 候選 |
| DoctorBeds | Ext 分機 | 自建 | `DoctorDirectory`/`NurseStaff`.Phone | 自建 |
| DoctorBeds | BedNos 負責床位 | HIS/自建 | HIS 主治對應床（候選）或自建指派 | 待確認 |
| RoundSchedule | RoundDate/DoctorName/Specialty | 自建 | `DoctorRound`（Weekday/RoundDate/DoctorName） | 自建 |
| RoundSchedule | EstimatedTime/ActualTime/IsCompleted/Remark | 自建 | `DoctorRound`（TimeSlot/Note）＋執行回填 | 自建 |

> `DoctorRound` 需補 `ActualTime`/`IsCompleted` 欄位（實際查房回填）→ 補進 [[資料庫Schema]]。

## API 組裝
- `GET /api/Board/w52/doctor?date=`：DoctorBeds 由 HIS `HDOCTOR`（開放後）或自建指派；RoundSchedule 純自建 `DoctorRound`。後端合併。
- **查房表現可自建上線**；主治-床對應待 HIS 開放（或先自建）。

相關：[[資料庫Schema]] · [[W52病室動態-JSON與組裝]] · [[資料項對照表]] · [[W52-一般病房]]
