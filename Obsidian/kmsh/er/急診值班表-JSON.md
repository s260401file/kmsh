---
tags: [kmsh, 技術, ER, 值班表, 試作]
---
# ER 急診值班表 — JSON 設計（依實體白板補充）

> 來源：實體白板照片 `Document/er-目前的實體白板.jpg`（高雄市立民生醫院 急診室值班表，115/06/16）。
> 電子板現況只有「三班醫護面板」（`mockData.ShiftStaff`：每班 Doctor/ChargeNurse/NurseCount）涵蓋一部分；實體板資訊更完整 → 本頁列出**要再加入**的資訊。全部屬操作性、HIS 無 → **自建**。
> 自建表 [[資料庫Schema]] `ShiftStaff` / `DoctorDirectory` / `ConsultDutyDaily`。

## 實體白板 vs 電子板（差異＝要加入的資訊）
| 實體板區塊 | 電子板現況 | 要加入 |
|---|---|---|
| 急診醫師（陳博紅、林士勛＋救護班）| ShiftStaff 每班 1 醫師 | **急診醫師具名清單**（可含救護班/班別）|
| 照服員（楊凌雲・日班）| 無 | **照服員**（Role=照服員）|
| 護理長／師（蘇宜文／蔡美陵）| 僅 HospitalInfo HeadNurse | **護理長/專科護理師具名** |
| 護理人員 大夜/白/小夜（各 2 名＋人數）| ShiftStaff ChargeNurse/NurseCount | **各班護理師具名清單**（已有結構，補具名）|
| 緊急應變編組（救護班/避難引導/滅火班/通報班/安全防護）| 無 | **緊急應變編組標記**（指派到人員）|
| **各科值班醫師**（MED/GS/ORTH/NS/GYN/PS/PED/CRS/GU/CVS＋分機＋員編）| 待辦「會診醫師區」未做 | **各科值班醫師面板**（科別→醫師/分機/員編）★主要缺口 |
| 急診支援醫師（手寫）| 無 | **急診支援醫師** |
| 感控值班 / 外科三線（右上標籤）| 無 | **特殊值班角色**（感控值班/外科三線）|
| 日期/星期 | 已有時鐘 | （免）|

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "ER", "QueryDate": "2026-06-16",
    "DutyBoard": {
      "ErDoctors": [ { "Name": "陳博紅", "Tag": "救護班" }, { "Name": "林士勛" } ],
      "CareAssistants": [ { "Name": "楊凌雲", "Shift": "日班" } ],
      "HeadNurses": [ { "Name": "蘇宜文", "Title": "護理長" }, { "Name": "蔡美陵", "Title": "專科護理師" } ],
      "NurseShifts": [
        { "Shift": "大夜班", "Count": 2, "Nurses": [ { "Name": "陳靜瑩", "EmergencyGroup": "通報班" }, { "Name": "鄭俞文" } ] },
        { "Shift": "白班",   "Count": 2, "Nurses": [ { "Name": "蘇楓惠", "EmergencyGroup": "滅火班" }, { "Name": "莊尚瑋" } ] },
        { "Shift": "小夜班", "Count": 2, "Nurses": [ { "Name": "廖昭珺" }, { "Name": "張雅淳" } ] }
      ],
      "EmergencyRoles": ["救護班","避難引導","滅火班","通報班","安全防護"]
    },
    "OnCallDoctors": [
      { "DeptCode": "MED",  "DeptName": "內科",       "DoctorName": "李呂華",  "Ext": "",     "EmpNo": "" },
      { "DeptCode": "GS",   "DeptName": "一般外科",   "DoctorName": "Dr.Li",   "Ext": "4204", "EmpNo": "0011064" },
      { "DeptCode": "ORTH", "DeptName": "骨科",       "DoctorName": "Dr.Wang", "Ext": "5558", "EmpNo": "0011180" },
      { "DeptCode": "NS",   "DeptName": "神經外科",   "DoctorName": "Dr.Chen", "Ext": "6365", "EmpNo": "0011149" },
      { "DeptCode": "GYN",  "DeptName": "婦產科",     "DoctorName": "Dr.Chen", "Ext": "2226", "EmpNo": "0009831" },
      { "DeptCode": "PS",   "DeptName": "整形外科",   "DoctorName": "Dr.Lin",  "Ext": "1621", "EmpNo": "0011077" },
      { "DeptCode": "PED",  "DeptName": "小兒科",     "DoctorName": "曹○○",   "Ext": "",     "EmpNo": "" },
      { "DeptCode": "CRS",  "DeptName": "大腸直腸外科","DoctorName": "Dr.Wang", "Ext": "",     "EmpNo": "0011238" },
      { "DeptCode": "GU",   "DeptName": "泌尿科",     "DoctorName": "Dr.Tsai", "Ext": "",     "EmpNo": "0011153" },
      { "DeptCode": "CVS",  "DeptName": "心臟血管外科","DoctorName": "王鈺棠",  "Ext": "",     "EmpNo": "" }
    ],
    "SupportDoctors": [ { "Name": "（急診支援醫師，手寫）" } ],
    "SpecialRoles": [ { "Role": "感控值班", "Name": "" }, { "Role": "外科三線", "Name": "" } ]
  }
}
```

## 逐欄來源（全自建）
| 欄位 | 來源 | 自建表 | 說明 |
|---|---|---|---|
| DutyBoard.ErDoctors 急診醫師 | 自建 | `ShiftStaff`（Role=急診醫師，+Tag 救護班） | |
| DutyBoard.CareAssistants 照服員 | 自建 | `ShiftStaff`（Role=照服員，+Shift） | 新角色 |
| DutyBoard.HeadNurses 護理長/師 | 自建 | `ShiftStaff`（Role=護理長/專科護理師） | |
| DutyBoard.NurseShifts 三班護理師 | 自建 | `ShiftStaff`（Role=護理師，群組班別） | 具名＋人數 |
| Nurses[].EmergencyGroup 緊急編組 | 自建 | `ShiftStaff` 新增 `EmergencyGroup` 欄（救護/避難/滅火/通報/安全防護） | 新欄位 |
| OnCallDoctors 各科值班醫師 | 自建 | `DoctorDirectory`（DeptCode/DeptName/DoctorName/EmpNo/**Ext分機**）＋`ConsultDutyDaily`（當日值班） | ★主要新增 |
| SupportDoctors 急診支援醫師 | 自建 | `ConsultDutyDaily`（DeptCode=SUPPORT） | |
| SpecialRoles 感控值班/外科三線 | 自建 | `ShiftStaff`（Role=感控值班/外科三線） | 新角色 |

> schema 待補：`ShiftStaff` 加 `EmergencyGroup`、`Tag`；`DoctorDirectory` 加 `Ext`(分機)。→ 補進 [[資料庫Schema]]。

## API 組裝
- 純自建 `GET /api/Board/er/duty?date=`：讀 `ShiftStaff`（值班表各角色）＋`DoctorDirectory`/`ConsultDutyDaily`（各科值班醫師），後端組出 `DutyBoard` 與 `OnCallDoctors`。
- **★現可立即自建上線**（與 HIS 無相依）；對應第5次會議「會診醫師區、值班人員、醫師白/夜班」需求。
- 員編/分機屬院內人事，可由後台維護（KMUH HRS 未開放）。

相關：[[ER急診動態-JSON與組裝]] · [[資料庫Schema]] · [[資料項對照表]] · [[ER]]
