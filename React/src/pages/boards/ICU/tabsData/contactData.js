// 連絡電話 Mock 資料 — ICU 版
// TODO 正式上線：return fetch(`/api/wards/ICU/contacts?date=${date}`).then(r => r.json())
const CONTACT_DATA = {
  success: true, message: "",
  data: {
    wardCode: "ICU", queryDate: "2026-06-03",
    dutyContacts: [
      { contactId:1, dutyTitle:"ICU 值班主治醫師",  name:"蘇○醫師",     extension:"4401", mobile:"0912-456-***", timeSlot:"08:00–17:00" },
      { contactId:2, dutyTitle:"ICU 值班住院醫師",  name:"張○宇 醫師",   extension:"4402", mobile:"0918-333-***", timeSlot:"08:00–20:00" },
      { contactId:3, dutyTitle:"白班 護理師（4F）", name:"陳○護理師",   extension:"4410", mobile:"0922-111-***", timeSlot:"08:00–16:00" },
      { contactId:4, dutyTitle:"白班 護理師（3F）", name:"林○護理師",   extension:"3310", mobile:"0933-222-***", timeSlot:"08:00–16:00" },
      { contactId:5, dutyTitle:"夜班 值班護理長",   name:"郭○護理長",   extension:"4400", mobile:"0922-444-***", timeSlot:"20:00 後接班" },
      { contactId:6, dutyTitle:"呼吸治療師",        name:"劉○治療師",   extension:"4420", mobile:"0935-555-***", timeSlot:"全天" }
    ],
    commonContacts: [
      { contactId:101, name:"急診室",               extension:"2200" },
      { contactId:102, name:"ICU 護理站（4F）",     extension:"4400" },
      { contactId:103, name:"ICU 護理站（3F）",     extension:"3300" },
      { contactId:104, name:"手術室",               extension:"5500" },
      { contactId:105, name:"藥劑科 / 急批",        extension:"1010 / 1011" },
      { contactId:106, name:"檢驗科 / 24h",         extension:"1212" },
      { contactId:107, name:"放射科 / CT 室",       extension:"1313 / 1314" },
      { contactId:108, name:"感染管制",             extension:"1414" },
      { contactId:109, name:"血庫",                 extension:"1616" },
      { contactId:110, name:"供應中心 (CSR)",       extension:"1515" },
      { contactId:111, name:"腎臟透析室",           extension:"4500" },
      { contactId:112, name:"呼吸治療科",           extension:"4420" },
      { contactId:113, name:"資訊室",               extension:"1818" },
      { contactId:114, name:"總務 / 工務",          extension:"1919 / 1920" }
    ]
  }
}
export default CONTACT_DATA
