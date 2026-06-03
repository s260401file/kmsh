// ──────────────────────────────────────────────────────────────
// 排班資訊 Mock 資料  (ER board)
// §7.1.2.1 (7.1) 護理人員排班（含負責床位、緊急應變編組、點班）
// §7.1.2.1 (7.2) 專師排班
// §7.1.2.1 (7.3) 住院醫師排班
// ──────────────────────────────────────────────────────────────

const _MOCK_ER_SCHEDULE = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "ER",
    Date: "2026-06-02",

    // ── (7.1) 護理人員排班 ──
    NursingShifts: [
      {
        Shift: "白班", ShiftTime: "08:00–16:00",
        Staff: [
          { PeNo:"N001", Name:"吳○珊", Role:"護理長",    Ext:"1230", Beds:["負1","負2"],                     EmgRole:"指揮組",  CheckedIn:true  },
          { PeNo:"N002", Name:"李○婷", Role:"責任護理師", Ext:"1231", Beds:["MER01","MER02","MER03"],          EmgRole:"急救1組", CheckedIn:true  },
          { PeNo:"N003", Name:"陳○娟", Role:"責任護理師", Ext:"1232", Beds:["MER05","MER06","MER07"],          EmgRole:"急救2組", CheckedIn:true  },
          { PeNo:"N004", Name:"張○明", Role:"責任護理師", Ext:"1233", Beds:["MER08","MER09","MER10"],          EmgRole:"CPR 組",  CheckedIn:false },
          { PeNo:"N005", Name:"王○華", Role:"責任護理師", Ext:"1234", Beds:["MER11","MER12","MER13"],          EmgRole:"轉送組",  CheckedIn:true  },
          { PeNo:"N006", Name:"劉○慧", Role:"責任護理師", Ext:"1235", Beds:["OER01","OER02","MER993"],         EmgRole:"後援組",  CheckedIn:true  }
        ]
      },
      {
        Shift: "小夜", ShiftTime: "16:00–24:00",
        Staff: [
          { PeNo:"N007", Name:"林○芳", Role:"責任護理師", Ext:"1236", Beds:["負1","負2","MER01","MER02"],      EmgRole:"急救1組", CheckedIn:true  },
          { PeNo:"N008", Name:"周○娟", Role:"責任護理師", Ext:"1237", Beds:["MER03","MER05","MER06","MER07"],  EmgRole:"CPR 組",  CheckedIn:true  },
          { PeNo:"N009", Name:"鄭○安", Role:"責任護理師", Ext:"1238", Beds:["MER08","MER09","MER10","MER11"],  EmgRole:"急救2組", CheckedIn:true  },
          { PeNo:"N010", Name:"方○玲", Role:"責任護理師", Ext:"1239", Beds:["MER12","MER13","OER01","OER02"],  EmgRole:"轉送組",  CheckedIn:false }
        ]
      },
      {
        Shift: "大夜", ShiftTime: "00:00–08:00",
        Staff: [
          { PeNo:"N011", Name:"黃○雯", Role:"責任護理師", Ext:"1240", Beds:["負1","負2","MER01","MER02","MER03"],       EmgRole:"急救1組", CheckedIn:true },
          { PeNo:"N012", Name:"蔡○慧", Role:"責任護理師", Ext:"1241", Beds:["MER05","MER06","MER07","MER08","MER09"],   EmgRole:"CPR 組",  CheckedIn:true },
          { PeNo:"N013", Name:"吳○真", Role:"責任護理師", Ext:"1242", Beds:["MER10","MER11","MER12","MER13","OER01"],   EmgRole:"轉送組",  CheckedIn:true }
        ]
      }
    ],

    // ── (7.2) 專師排班 ──
    Specialists: [
      { Name:"黃○誠", Title:"急診主任醫師", Dept:"急診科", Ext:"1201", Time:"08:00–17:00" },
      { Name:"林○達", Title:"主治醫師",     Dept:"急診科", Ext:"1202", Time:"08:00–20:00" },
      { Name:"陳○科", Title:"主治醫師",     Dept:"急診科", Ext:"1203", Time:"20:00–08:00" }
    ],

    // ── (7.3) 住院醫師排班 ──
    Residents: [
      { Name:"吳○成", Title:"住院醫師 R3", Dept:"急診科", Ext:"1210", Time:"08:00–20:00" },
      { Name:"余○玲", Title:"住院醫師 R2", Dept:"急診科", Ext:"1211", Time:"08:00–20:00" },
      { Name:"張○宏", Title:"住院醫師 R1", Dept:"急診科", Ext:"1212", Time:"20:00–08:00" },
      { Name:"劉○安", Title:"住院醫師 R1", Dept:"急診科", Ext:"1213", Time:"20:00–08:00" }
    ]
  }
};

async function getSchedule(wardCode, date) {
  return Promise.resolve(_MOCK_ER_SCHEDULE);
}
