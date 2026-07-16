---
tags: [kmsh, 技術, W52, 排班資訊, 試作]
---
# W52 排班資訊 — JSON 設計

> ✅ **已上線**：`GET /api/Board/w52/schedule`（`wardApi.getSchedule('W52')`）。**三班護理師＋緊急應變編組已改為 [[W52病室動態-JSON與組裝]] 內「值班表」面板**（右上 7×6），非獨立分頁；`ScheduleTab` 分頁仍在但主顯示點在病室動態面板。護理排班/主護負責床位 🔧**自建**（HIS 有但未開放，[[護理排班]]）。
> 後台以「W52 管理→三班護理師」批次排班（`setShiftRoster`）；資料落於**人員管理**排班（`Schedule`）＋床位指派（`BedAssignment`）＋人員主檔（`Personnel`）。

## 試作 JSON（貼合前端，**camelCase**）
```json
{
  "unitCode": "W52", "queryDate": "2026-07-11",
  "shifts": [
    {
      "shiftType": "大夜", "shiftTime": "00:00–08:00",
      "nurses": [
        { "staffId": 2, "peName": "陳○梅", "role": "護理師", "bedNos": ["001","002","003"], "emergencyGroup": "通報班", "isCharge": true }
      ]
    },
    { "shiftType": "白班", "shiftTime": "08:00–16:00", "nurses": [ /* … */ ] },
    { "shiftType": "小夜", "shiftTime": "16:00–00:00", "nurses": [ /* … */ ] },
    { "shiftType": "12:00–20:00", "nurses": [ /* 第 4 班；無班別色票，顯示時間字串 */ ] }
  ]
}
```
> 前端 `WardTab` 以 `W52_SHIFTS = ['大夜','白班','小夜','12:00–20:00']` 取班別、`SHIFT_META` 給大夜 N／白班 D／小夜 E 色票（第 4 班無色票）；每班 `nurses[].peName` 可多人。破折號 en-dash/hyphen 差異由 `normShift` 吸收。

## 逐欄來源（全自建）
| 欄位 | 來源 | 自建表 | 說明 |
|---|---|---|---|
| shiftType/shiftTime | 自建 | 班別常數/設定 | 大夜/白班/小夜 ＋ 第 4 班 **12:00–20:00** |
| nurses.peName/role | 自建 | 人員主檔 `Personnel`（姓名/職稱） | |
| nurses.bedNos 負責床位 | 自建 | 床位指派 `BedAssignment`（勾床；多床彙整） | 主護核心；**一床可多主護** |
| nurses.emergencyGroup 緊急編組 | 自建 | 排班之緊急編組欄，值＝**通報班／滅火班／安全防護／救護班／避難引導** | 面板「緊急應變編組」5 組由此歸類 |
| nurses.isCharge 點班 | 自建 | 床位指派（IsCharge） | |
| **夜專師**（面板另取） | 自建 | `getNightNurse` → `NightNurseRoster` 今日小夜（全院共用） | 顯示於三班護理師標題右方 |

> 舊設計的 `Specialists`（專師）/`Residents`（住院醫師）已不在本頁：住院/值班醫師改由**中央值班排程**帶入「值班醫療團隊」，見 [[醫師資訊-JSON]]。緊急編組原標的「指揮/A/B」已改為 5 組具名班別。

## API 組裝
- 純自建 `GET /api/Board/w52/schedule?date=`：讀當日排班＋床位指派＋人員主檔，後端 group by 班別組出 `shifts[]`（camelCase）。緊急編組於前端 `WardTab` 依 `emergencyGroup` 再歸類成 5 組。
- **已自建上線**（過渡期有與 HIS 雙重輸入缺點，[[護理排班]]）；待高榮開放主護欄位再切自動帶入。

相關：[[護理排班]] · [[資料庫Schema]] · [[W52病室動態-JSON與組裝]] · [[醫師資訊-JSON]] · [[W52-一般病房]]
