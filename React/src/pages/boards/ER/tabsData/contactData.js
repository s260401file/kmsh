// ER 急診站「連絡電話」假資料（待接 API）。
// Data 內含：DutyContacts 當日值班名單、CommonContacts 常用連絡電話。
// DutyContacts 欄位：ContactId 編號、Shift 班別、ShiftTime 班別時段、Name 姓名、
//   Title 職務、Extension 院內分機、Mobile 手機（可空）。
// CommonContacts 欄位：ContactId 編號、Name 單位/科室、Extension 分機。
// 註：實際 ContactTab 已改由 contactApi 取得，此檔為早期假資料樣本。
const CONTACT_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "ER",
    QueryDate: "2026-06-03",
    // 當日值班名單（依白班/小夜/大夜）
    DutyContacts: [
      { ContactId: 1, Shift: "白班", ShiftTime: "08:00–16:00", Name: "吳○珊護理師", Title: "護理長",    Extension: "1230", Mobile: "0912-345-678" },
      { ContactId: 2, Shift: "白班", ShiftTime: "08:00–16:00", Name: "李○婷護理師", Title: "責任護理師", Extension: "1231", Mobile: "" },
      { ContactId: 3, Shift: "白班", ShiftTime: "08:00–16:00", Name: "陳○娟護理師", Title: "責任護理師", Extension: "1232", Mobile: "" },
      { ContactId: 4, Shift: "小夜", ShiftTime: "16:00–24:00", Name: "林○芳護理師", Title: "責任護理師", Extension: "1233", Mobile: "0923-456-789" },
      { ContactId: 5, Shift: "小夜", ShiftTime: "16:00–24:00", Name: "周○娟護理師", Title: "責任護理師", Extension: "1234", Mobile: "" },
      { ContactId: 6, Shift: "大夜", ShiftTime: "00:00–08:00", Name: "黃○雯護理師", Title: "責任護理師", Extension: "1235", Mobile: "0934-567-890" },
      { ContactId: 7, Shift: "大夜", ShiftTime: "00:00–08:00", Name: "蔡○慧護理師", Title: "責任護理師", Extension: "1236", Mobile: "" }
    ],
    // 常用連絡電話（各單位/科室分機）
    CommonContacts: [
      { ContactId: 101, Name: "急診護理站",          Extension: "1230" },
      { ContactId: 102, Name: "急診主任室",          Extension: "1231" },
      { ContactId: 103, Name: "急診值班室",          Extension: "1232" },
      { ContactId: 104, Name: "掛號 / 分診",        Extension: "1233" },
      { ContactId: 105, Name: "急救 RRT",           Extension: "1199" },
      { ContactId: 106, Name: "內科 ICU",           Extension: "2101" },
      { ContactId: 107, Name: "外科 ICU",           Extension: "2201" },
      { ContactId: 108, Name: "放射科",             Extension: "4101" },
      { ContactId: 109, Name: "超音波室",           Extension: "4201" },
      { ContactId: 110, Name: "檢驗科",             Extension: "4301" },
      { ContactId: 111, Name: "藥局",               Extension: "4401" },
      { ContactId: 112, Name: "血庫",               Extension: "4501" },
      { ContactId: 113, Name: "手術室",             Extension: "4601" },
      { ContactId: 114, Name: "行政值班",           Extension: "5001" },
      { ContactId: 115, Name: "社工室",             Extension: "5101" },
      { ContactId: 116, Name: "感染管制",           Extension: "5201" },
      { ContactId: 117, Name: "太平間",             Extension: "5401" }
    ]
  }
}

export default CONTACT_DATA
