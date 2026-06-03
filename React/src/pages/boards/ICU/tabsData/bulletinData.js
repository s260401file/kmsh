// 佈告欄 Mock 資料 — ICU 版
// TODO 正式上線：return fetch(`/api/wards/ICU/bulletins`).then(r => r.json())
const BULLETIN_DATA = {
  success: true, message: "",
  data: {
    wardCode: "ICU", queryDate: "2026-06-03",
    unitBulletins: [
      { bulletinId:1, category:"護理站", title:"CRRT 管路照護規範更新",  content:"即日起，CRRT 管路照護須依據新版 SOP（2026年5月版）執行，每班需記錄濾器使用時數與凝血狀況，異常請即通知主責醫師。",         priority:"重要", postedBy:"陳○美 護理長", postedAt:"2026-06-01", isActive:true },
      { bulletinId:2, category:"護理站", title:"呼吸器電池備援檢查",      content:"請各班於交班前確認呼吸器電池備援狀況，如有電池異常請通知醫工室及護理長，勿自行更換。",                                      priority:"重要", postedBy:"陳○美 護理長", postedAt:"2026-05-30", isActive:true },
      { bulletinId:3, category:"護理站", title:"隔離病房消耗品補充提醒",  content:"4F-07（陳○祥）與 4F-15（王○任）隔離房間之手套、口罩庫存已低，請備品護理師於今日上午前補充完畢。",                          priority:"一般", postedBy:"陳○美 護理長", postedAt:"2026-06-02", isActive:true },
      { bulletinId:4, category:"護理站", title:"7 月排班意願收集",         content:"7 月份排班意願表請於 6/10 前交回護理長辦公室，逾期視同無特殊需求。",                                                          priority:"一般", postedBy:"陳○美 護理長", postedAt:"2026-05-27", isActive:true },
      { bulletinId:5, category:"護理站", title:"ICU 急救車定期查核",       content:"本月急救車查核日為 6/10（二），請白班護理師完成藥品效期及器材核對並簽名，表單交護理長存查。",                                priority:"一般", postedBy:"陳○美 護理長", postedAt:"2026-06-03", isActive:true }
    ],
    hospBulletins: [
      { bulletinId:101, category:"院方", title:"院內感染管制週宣導",      content:"本週（5/12–5/18）為院內感染管制週，請確實執行五時機手部衛生，進出隔離病房務必穿戴適當防護裝備。",                            priority:"重要", postedBy:"感染管制組",   postedAt:"2026-05-15", isActive:true },
      { bulletinId:102, category:"院方", title:"2026 年度醫療品質評鑑",  content:"本院將於 7 月 14–16 日接受醫策會評鑑，請各單位確認相關文件備置齊全。ICU 評鑑說明會訂於 6 月 25 日下午 2 時。",            priority:"重要", postedBy:"醫療品質部",   postedAt:"2026-06-01", isActive:true },
      { bulletinId:103, category:"院方", title:"新版電子病歷系統上線",    content:"HIS 系統將於 6/15（一）凌晨 2 時進行版本升級，升級期間（約 4 小時）部分功能暫停使用，請提前列印必要文件備用。",                priority:"一般", postedBy:"資訊室",       postedAt:"2026-06-02", isActive:true },
      { bulletinId:104, category:"院方", title:"員工健檢報名截止通知",    content:"2026 年員工健檢報名截止日為 6 月 30 日，未報名者將喪失本年度健檢資格，請至人事系統完成報名。",                                priority:"一般", postedBy:"人事室",       postedAt:"2026-05-20", isActive:true }
    ]
  }
}
export default BULLETIN_DATA
