// ──────────────────────────────────────────────────────────────
// 連絡電話 Mock 資料
// §7.1.2 (6.1) 護理站當日值班連絡電話
// §7.1.2 (6.2) 常用連絡電話
// 正式上線時替換 getContacts() 內部為 fetch() 呼叫即可
// ──────────────────────────────────────────────────────────────

const _MOCK_CONTACTS = {
  "Success": true,
  "Message": "",
  "Data": {
    "WardCode": "W52",
    "QueryDate": "2026-06-02",

    // ── (6.1) 護理站當日值班連絡電話 ──
    // 欄位：DutyTitle 職務、Name 姓名、Extension 院內分機、Mobile 手機、TimeSlot 時段
    "DutyContacts": [
      {
        "ContactId": 1,
        "DutyTitle": "當日值班醫師",
        "Name": "陳○科 醫師",
        "Extension": "2104",
        "Mobile": "0912-345-***",
        "TimeSlot": "08:00–17:00"
      },
      {
        "ContactId": 2,
        "DutyTitle": "值班護理師",
        "Name": "蔡○柔 護理師",
        "Extension": "2105",
        "Mobile": "0918-221-***",
        "TimeSlot": "08:00–20:00"
      },
      {
        "ContactId": 3,
        "DutyTitle": "夜間值班護理長",
        "Name": "吳○璿 護理長",
        "Extension": "2110",
        "Mobile": "0922-110-***",
        "TimeSlot": "20:00 後接班"
      }
    ],

    // ── (6.2) 常用連絡電話 ──
    // 欄位：Name 單位名稱、Extension 分機/電話（可含斜線表示多號）
    "CommonContacts": [
      { "ContactId": 101, "Name": "急診室",           "Extension": "2200" },
      { "ContactId": 102, "Name": "加護病房 (4F/3F)", "Extension": "4400 / 3300" },
      { "ContactId": 103, "Name": "手術室",           "Extension": "5500" },
      { "ContactId": 104, "Name": "藥劑科 / 急批",   "Extension": "1010 / 1011" },
      { "ContactId": 105, "Name": "檢驗科 / 24h",    "Extension": "1212" },
      { "ContactId": 106, "Name": "放射科 / CT 室",  "Extension": "1313 / 1314" },
      { "ContactId": 107, "Name": "感染管制",         "Extension": "1414" },
      { "ContactId": 108, "Name": "供應中心 (CSR)",  "Extension": "1515" },
      { "ContactId": 109, "Name": "血庫",             "Extension": "1616" },
      { "ContactId": 110, "Name": "病歷室",           "Extension": "1717" },
      { "ContactId": 111, "Name": "資訊室",           "Extension": "1818" },
      { "ContactId": 112, "Name": "總務 / 工務",      "Extension": "1919 / 1920" }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// React 遷移：useEffect(() => { getContacts(wardCode, date).then(setData) }, [wardCode, date])
// TODO 正式上線：return fetch(`/api/wards/${wardCode}/contacts?date=${date}`).then(r => r.json())
async function getContacts(wardCode, date) {
  return Promise.resolve(_MOCK_CONTACTS);
}
