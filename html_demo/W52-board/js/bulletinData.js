// ──────────────────────────────────────────────────────────────
// 佈告欄 Mock 資料
// §7.1.2 (9.1) 護理站公告事項  → UnitBulletins[]
// §7.1.2 (9.2) 院方公告事項    → HospBulletins[]
//
// 欄位（PascalCase = C# Model）：
//   BulletinId, Category("護理站"|"院方"), Title,
//   Content, Priority("重要"|"一般"), PostedBy,
//   PostedAt(yyyy-MM-dd), IsActive(bool)
//
// 正式上線時替換 getBulletins() 內部為 fetch() 呼叫即可
// ──────────────────────────────────────────────────────────────

const _MOCK_BULLETINS = {
  "Success": true,
  "Message": "",
  "Data": {
    "WardCode": "W52",
    "QueryDate": "2026-06-02",

    // ── (9.1) 護理站公告事項 ──
    "UnitBulletins": [
      {
        "BulletinId": 1,
        "Category": "護理站",
        "Title": "約束帶使用新規定",
        "Content": "即日起，使用約束帶須填寫《身體約束評估及同意書》，並每 2 小時記錄一次，如有疑問請洽護理長。",
        "Priority": "重要",
        "PostedBy": "林○芳 護理長",
        "PostedAt": "2026-06-01",
        "IsActive": true
      },
      {
        "BulletinId": 2,
        "Category": "護理站",
        "Title": "冰箱溫度紀錄提醒",
        "Content": "請各班務必於交班前確認並簽署藥品冰箱溫度紀錄表，發現異常請立即通知護理長及藥局。",
        "Priority": "重要",
        "PostedBy": "林○芳 護理長",
        "PostedAt": "2026-05-30",
        "IsActive": true
      },
      {
        "BulletinId": 3,
        "Category": "護理站",
        "Title": "儀器保養排程",
        "Content": "下週四（6/11）上午，醫工室將進行病房內輸液幫浦年度保養，請各班留意儀器調度，勿安排多台同時使用。",
        "Priority": "一般",
        "PostedBy": "林○芳 護理長",
        "PostedAt": "2026-05-28",
        "IsActive": true
      },
      {
        "BulletinId": 4,
        "Category": "護理站",
        "Title": "7 月排班意願收集",
        "Content": "7 月份排班意願表請於 6/10 前交回護理長辦公室，逾期視同無特殊需求。",
        "Priority": "一般",
        "PostedBy": "林○芳 護理長",
        "PostedAt": "2026-05-27",
        "IsActive": true
      }
    ],

    // ── (9.2) 院方公告事項 ──
    "HospBulletins": [
      {
        "BulletinId": 101,
        "Category": "院方",
        "Title": "院內感染管制週宣導",
        "Content": "本週（5/12–5/18）為院內感染管制週，請確實執行五時機手部衛生，進出隔離病房務必穿戴適當防護裝備，違規將依規定處理。",
        "Priority": "重要",
        "PostedBy": "感染管制組",
        "PostedAt": "2026-05-15",
        "IsActive": true
      },
      {
        "BulletinId": 102,
        "Category": "院方",
        "Title": "2026 年度醫療品質評鑑",
        "Content": "本院將於 7 月 14–16 日接受醫策會評鑑，請各單位確認相關文件備置齊全，評鑑說明說明會訂於 6 月 20 日下午 2 時。",
        "Priority": "重要",
        "PostedBy": "醫療品質部",
        "PostedAt": "2026-06-01",
        "IsActive": true
      },
      {
        "BulletinId": 103,
        "Category": "院方",
        "Title": "新版電子病歷系統上線",
        "Content": "HIS 系統將於 6/15（一）凌晨 2 時進行版本升級，升級期間（約 4 小時）部分功能暫停使用，請提前列印必要文件備用。",
        "Priority": "一般",
        "PostedBy": "資訊室",
        "PostedAt": "2026-06-02",
        "IsActive": true
      },
      {
        "BulletinId": 104,
        "Category": "院方",
        "Title": "員工健檢報名截止通知",
        "Content": "2026 年員工健檢報名截止日為 6 月 30 日，未報名者將喪失本年度健檢資格，請至人事系統完成報名。",
        "Priority": "一般",
        "PostedBy": "人事室",
        "PostedAt": "2026-05-20",
        "IsActive": true
      }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// React 遷移：useEffect(() => { getBulletins(wardCode).then(setData) }, [wardCode])
// TODO 正式上線：return fetch(`/api/wards/${wardCode}/bulletins`).then(r => r.json())
async function getBulletins(wardCode) {
  return Promise.resolve(_MOCK_BULLETINS);
}
