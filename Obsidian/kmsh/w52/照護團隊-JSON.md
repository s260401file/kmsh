---
tags: [kmsh, 技術, W52, 照護團隊, 試作]
---
# W52 照護團隊 — JSON 設計

> 對應分頁 `TeamTab`。照護團隊 🔧**自建**（科別/職別/姓名/電話，HIS 無）。對應 [[資料庫Schema]] `CareTeam`，以 GroupKey 分組顯示。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52",
    "TeamGroups": [
      { "GroupKey": "leader", "GroupName": "病房主管", "Members": [
        { "TeamId": 1, "Role": "病房主任", "Name": "吳○明", "Department": "一般外科", "Ext": "5400", "Mobile": "0911-100-001" },
        { "TeamId": 2, "Role": "護理長", "Name": "林○芳", "Department": "W52 護理科", "Ext": "5210", "Mobile": "0912-100-002" }
      ]},
      { "GroupKey": "attending", "GroupName": "主治醫師", "Members": [
        { "TeamId": 10, "Role": "主治", "Name": "張○明", "Department": "一般外科", "Ext": "5301", "Mobile": "0911-111-111" }
      ]},
      { "GroupKey": "allied", "GroupName": "醫事人員", "Members": [
        { "TeamId": 50, "Role": "藥師", "Name": "王○翰", "Department": "藥劑科", "Ext": "2105", "Mobile": "0951-100-001" }
      ]}
    ]
  }
}
```

## 逐欄來源（全自建）
| 欄位 | 來源 | 自建表 | 說明 |
|---|---|---|---|
| GroupKey/GroupName | 自建 | 分組常數 | leader/attending/resident/specialist/nurse/allied |
| Members.Role 職別 | 自建 | `CareTeam.RoleTitle` | |
| Members.Name | 自建 | `CareTeam.Name` | |
| Members.Department 科別/專長 | 自建 | `CareTeam.DeptName` | |
| Members.Ext 分機 | 自建 | `CareTeam.Phone` | |
| Members.Mobile 手機 | 自建 | `CareTeam`（需補 Mobile 欄位） | 自建 |

> `CareTeam` 需補 `GroupKey`（分組）與 `Mobile` 欄位 → 補進 [[資料庫Schema]]。

## API 組裝
- 純自建 `GET /api/Board/w52/team`：讀 `CareTeam`（本單位 active），後端 group by `GroupKey` 組出 `TeamGroups[]`。
- 與 [[後台總覽]] 既有聯絡/避難圖同模式，**現可自建上線**；變動少，輪詢頻率低。

相關：[[資料庫Schema]] · [[後台總覽]] · [[W52病室動態-JSON與組裝]] · [[W52-一般病房]]
