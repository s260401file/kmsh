// ──────────────────────────────────────────────────────────────
// 連絡電話 Mock 資料  (ER board)
// §7.1.2.1 (6.1) 護理站當日值班連絡電話
// §7.1.2.1 (6.2) 常用連絡電話
// ──────────────────────────────────────────────────────────────

const _MOCK_ER_CONTACTS = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "ER",
    QueryDate: "2026-06-02",

    // ── (6.1) 護理站當日值班連絡電話 ──
    DutyContacts: [
      { ContactId:1, Shift:"白班", ShiftTime:"08:00–16:00", Name:"吳○珊護理師", Title:"護理長",    Extension:"1230", Mobile:"0912-345-678" },
      { ContactId:2, Shift:"白班", ShiftTime:"08:00–16:00", Name:"李○婷護理師", Title:"責任護理師", Extension:"1231", Mobile:"" },
      { ContactId:3, Shift:"白班", ShiftTime:"08:00–16:00", Name:"陳○娟護理師", Title:"責任護理師", Extension:"1232", Mobile:"" },

      { ContactId:4, Shift:"小夜", ShiftTime:"16:00–24:00", Name:"林○芳護理師", Title:"責任護理師", Extension:"1233", Mobile:"0923-456-789" },
      { ContactId:5, Shift:"小夜", ShiftTime:"16:00–24:00", Name:"周○娟護理師", Title:"責任護理師", Extension:"1234", Mobile:"" },

      { ContactId:6, Shift:"大夜", ShiftTime:"00:00–08:00", Name:"黃○雯護理師", Title:"責任護理師", Extension:"1235", Mobile:"0934-567-890" },
      { ContactId:7, Shift:"大夜", ShiftTime:"00:00–08:00", Name:"蔡○慧護理師", Title:"責任護理師", Extension:"1236", Mobile:"" }
    ],

    // ── (6.2) 常用連絡電話 ──
    CommonContacts: [
      { ContactId:101, Category:"急診單位", Name:"急診護理站",  Extension:"1230", Mobile:"" },
      { ContactId:102, Category:"急診單位", Name:"急診主任室",  Extension:"1231", Mobile:"" },
      { ContactId:103, Category:"急診單位", Name:"急診值班室",  Extension:"1232", Mobile:"" },
      { ContactId:104, Category:"急診單位", Name:"掛號 / 分診", Extension:"1233", Mobile:"" },

      { ContactId:105, Category:"急救",     Name:"急救 RRT",   Extension:"1199", Mobile:"" },
      { ContactId:106, Category:"急救",     Name:"內科 ICU",   Extension:"2101", Mobile:"" },
      { ContactId:107, Category:"急救",     Name:"外科 ICU",   Extension:"2201", Mobile:"" },

      { ContactId:108, Category:"支援部門", Name:"放射科",     Extension:"4101", Mobile:"" },
      { ContactId:109, Category:"支援部門", Name:"超音波室",   Extension:"4201", Mobile:"" },
      { ContactId:110, Category:"支援部門", Name:"檢驗科",     Extension:"4301", Mobile:"" },
      { ContactId:111, Category:"支援部門", Name:"藥局",       Extension:"4401", Mobile:"" },
      { ContactId:112, Category:"支援部門", Name:"血庫",       Extension:"4501", Mobile:"" },
      { ContactId:113, Category:"支援部門", Name:"手術室",     Extension:"4601", Mobile:"" },

      { ContactId:114, Category:"行政",     Name:"行政值班",   Extension:"5001", Mobile:"" },
      { ContactId:115, Category:"行政",     Name:"社工室",     Extension:"5101", Mobile:"" },
      { ContactId:116, Category:"行政",     Name:"感染管制",   Extension:"5201", Mobile:"" },
      { ContactId:117, Category:"行政",     Name:"太平間",     Extension:"5401", Mobile:"" }
    ]
  }
};

async function getContacts(wardCode, date) {
  return Promise.resolve(_MOCK_ER_CONTACTS);
}
