// ──────────────────────────────────────────────────────────────
// 避難圖 Mock 資料 — ICU 版（對齊 React EvacuationTab）
//
// React 的緊急應變編組不再有獨立資料表，而是「取三班護理師今日排班」，
// 依每位護理師的 emergencyGroup（逗號分隔、一人可多組）彙整，
// 另以 checkIn 旗標推出「點班」。故此 mock 改為排班（schedule）形狀：
//
//   schedule.shifts[]:  shiftType（大夜/白班/小夜）, nurses[]
//   nurses[]: peName（姓名，已遮罩）, emergencyGroup（逗號分隔）, checkIn（點班）
//
// TODO 正式上線：return fetch(`/api/wards/ICU/schedule`).then(r => r.json())
//   對應 React：wardApi.getSchedule('ICU')
// ──────────────────────────────────────────────────────────────

const _MOCK_ICU_SCHEDULE = {
  success: true,
  message: "",
  data: {
    wardCode: "ICU",
    queryDate: "2026-07-26",
    shifts: [
      {
        shiftType: "大夜",
        nurses: [
          { peName: "鄭○婷", emergencyGroup: "通報班",       checkIn: true  }, // 點班
          { peName: "高○君", emergencyGroup: "滅火班,安全防護", checkIn: false }  // 一人多組
        ]
      },
      {
        shiftType: "白班",
        nurses: [
          { peName: "江○衛", emergencyGroup: "滅火班",   checkIn: false },
          { peName: "李○萱", emergencyGroup: "安全防護", checkIn: false },
          { peName: "葉○廷", emergencyGroup: "救護班",   checkIn: false }
        ]
      },
      {
        shiftType: "小夜",
        nurses: [
          { peName: "劉○伶", emergencyGroup: "救護班",   checkIn: false },
          { peName: "蘇○如", emergencyGroup: "避難引導", checkIn: false },
          { peName: "林○霞", emergencyGroup: "避難引導", checkIn: false }
        ]
      }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// 對齊 React：wardApi.getSchedule(unit) → { shifts: [...] }
// TODO 正式上線：return fetch(`/api/wards/ICU/schedule`).then(r => r.json())
async function getIcuSchedule(unit) {
  return Promise.resolve(_MOCK_ICU_SCHEDULE);
}
