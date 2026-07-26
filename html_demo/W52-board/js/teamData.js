// ──────────────────────────────────────────────────────────────
// 照護團隊 Mock 資料
// React 對應 TeamTab.jsx：兩組卡片
//   值班醫師（attending）：今日 on-call（後台「顯示值班醫師」所選科別當日值班）
//   護理人員（nurse）    ：W52 全部護理人員名冊（人員管理）
// 欄位順序（表頭）：科別 / 職別 / 姓名 / 電話·分機
//   Members[]：TeamId, Department 科別, Role 職別, Name, Ext 分機, Mobile 手機
//   手機（>9 位）沿用 ContactReveal 遮蔽（reveal.js）→「點我顯示」
// ──────────────────────────────────────────────────────────────

const _MOCK_TEAM = {
  "Success": true,
  "Message": "",
  "Data": {
    "WardCode": "W52",

    "TeamGroups": [
      // ── 值班醫師（今日 on-call）──
      {
        "GroupKey":  "attending",
        "GroupName": "值班醫師",
        "Members": [
          { "TeamId": 1, "Department": "一般外科", "Role": "值班醫師", "Name": "張○明", "Ext": "5301", "Mobile": "0911-111-111" },
          { "TeamId": 2, "Department": "骨科",     "Role": "值班醫師", "Name": "吳○宇", "Ext": "5302", "Mobile": "0911-222-222" },
          { "TeamId": 3, "Department": "整形外科", "Role": "值班醫師", "Name": "黃○倫", "Ext": "5304", "Mobile": "0911-444-444" }
        ]
      },

      // ── 護理人員（單位名冊）──
      {
        "GroupKey":  "nurse",
        "GroupName": "護理人員",
        "Members": [
          { "TeamId": 40, "Department": "W52 護理科", "Role": "護理長",     "Name": "林○芳", "Ext": "5210", "Mobile": "0912-100-002" },
          { "TeamId": 41, "Department": "W52 護理科", "Role": "專科護理師", "Name": "李○玲", "Ext": "5220", "Mobile": "0931-100-001" },
          { "TeamId": 42, "Department": "W52 護理科", "Role": "責任護理師", "Name": "陳○梅", "Ext": "5201", "Mobile": "0941-100-001" },
          { "TeamId": 43, "Department": "W52 護理科", "Role": "責任護理師", "Name": "蔡○柔", "Ext": "5202", "Mobile": "0941-100-002" },
          { "TeamId": 44, "Department": "W52 護理科", "Role": "責任護理師", "Name": "王○惠", "Ext": "5203", "Mobile": "0941-100-003" },
          { "TeamId": 45, "Department": "W52 護理科", "Role": "責任護理師", "Name": "黃○萍", "Ext": "5204", "Mobile": "0941-100-004" },
          { "TeamId": 46, "Department": "W52 護理科", "Role": "責任護理師", "Name": "鄭○雲", "Ext": "5205", "Mobile": "0941-100-005" },
          { "TeamId": 47, "Department": "W52 護理科", "Role": "護理師",     "Name": "吳○萱", "Ext": "5206", "Mobile": "0941-100-006" }
        ]
      }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
async function getTeam(wardCode) {
  return Promise.resolve(_MOCK_TEAM);
}
