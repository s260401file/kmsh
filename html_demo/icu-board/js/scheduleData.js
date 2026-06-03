// ──────────────────────────────────────────────────────────────
// 派班資訊 Mock 資料 — ICU 版
// 欄位（camelCase，延續 ICU 規範）：
//   shifts[]: shiftType, shiftTime,
//     nurses[]: staffId, peNo, peName, role, extension, bedIds, emergencyGroup, checkIn
//     specialists[]: staffId, peNo, peName, specialty, extension
//     residents[]: staffId, peNo, peName, department, extension
//
// ICU bedIds 使用 ICU 格式（F4-01 等），非病房流水號
// TODO 正式上線：return fetch(`/api/wards/ICU/schedule?date=${date}`).then(r => r.json())
// ──────────────────────────────────────────────────────────────

const _MOCK_ICU_SCHEDULE = {
  success: true,
  message: "",
  data: {
    wardCode: "ICU",
    queryDate: "2026-06-03",
    shifts: [
      {
        shiftType: "白班",
        shiftTime: "08:00–16:00",

        // ── 護理人員 ──
        nurses: [
          {
            staffId: 1,
            peNo: "N001",
            peName: "陳○美",
            role: "護理長",
            extension: "4400",
            bedIds: [],
            emergencyGroup: "指揮",
            checkIn: true
          },
          {
            staffId: 2,
            peNo: "N002",
            peName: "陳○護理師",
            role: "護理師",
            extension: "4401",
            bedIds: ["F4-01", "F4-02", "F4-03", "F4-05", "F4-06"],
            emergencyGroup: "A",
            checkIn: true
          },
          {
            staffId: 3,
            peNo: "N003",
            peName: "周○護理師",
            role: "護理師",
            extension: "4402",
            bedIds: ["F4-07", "F4-08", "F4-09", "F4-10", "F4-11"],
            emergencyGroup: "A",
            checkIn: true
          },
          {
            staffId: 4,
            peNo: "N004",
            peName: "趙○護理師",
            role: "護理師",
            extension: "4403",
            bedIds: ["F4-12", "F4-13", "F4-15", "F4-16", "F4-17"],
            emergencyGroup: "B",
            checkIn: true
          },
          {
            staffId: 5,
            peNo: "N005",
            peName: "林○護理師",
            role: "護理師",
            extension: "4404",
            bedIds: ["F4-18", "F4-19", "F4-20", "F4-21", "F4-22"],
            emergencyGroup: "B",
            checkIn: false
          },
          {
            staffId: 6,
            peNo: "N006",
            peName: "郭○護理師",
            role: "護理師",
            extension: "3310",
            bedIds: ["F3-01", "F3-02", "F3-03", "F3-04", "F3-05"],
            emergencyGroup: "A",
            checkIn: true
          }
        ],

        // ── 專科護理師 ──
        specialists: [
          {
            staffId: 10,
            peNo: "S001",
            peName: "劉○治療師",
            specialty: "呼吸治療",
            extension: "4420"
          },
          {
            staffId: 11,
            peNo: "S002",
            peName: "王○師",
            specialty: "傷口護理",
            extension: "4421"
          }
        ],

        // ── 住院醫師 ──
        residents: [
          {
            staffId: 20,
            peNo: "R001",
            peName: "張○宇",
            department: "胸腔內科",
            extension: "4410"
          },
          {
            staffId: 21,
            peNo: "R002",
            peName: "許○翔",
            department: "心臟外科",
            extension: "4411"
          }
        ]
      },
      {
        shiftType: "小夜",
        shiftTime: "16:00–24:00",

        nurses: [
          {
            staffId: 7,
            peNo: "N007",
            peName: "賴○護理師",
            role: "護理師",
            extension: "4401",
            bedIds: ["F4-01","F4-02","F4-03","F4-05","F4-06","F4-07","F4-08","F4-09","F4-10","F4-11"],
            emergencyGroup: "A",
            checkIn: true
          },
          {
            staffId: 8,
            peNo: "N008",
            peName: "李○護理師",
            role: "護理師",
            extension: "4402",
            bedIds: ["F4-12","F4-13","F4-15","F4-16","F4-17","F4-18","F4-19","F4-20","F4-21","F4-22"],
            emergencyGroup: "B",
            checkIn: true
          },
          {
            staffId: 9,
            peNo: "N009",
            peName: "郭○護理師",
            role: "護理師",
            extension: "3310",
            bedIds: ["F3-01","F3-02","F3-03","F3-04","F3-05"],
            emergencyGroup: "A",
            checkIn: true
          },
          {
            staffId: 10,
            peNo: "N010",
            peName: "王○護理師",
            role: "護理師",
            extension: "4400",
            bedIds: [],
            emergencyGroup: "指揮",
            checkIn: true
          }
        ],

        specialists: [],

        residents: [
          {
            staffId: 22,
            peNo: "R003",
            peName: "林○豪",
            department: "胸腔內科",
            extension: "4412"
          }
        ]
      },
      {
        shiftType: "大夜",
        shiftTime: "00:00–08:00",

        nurses: [
          {
            staffId: 11,
            peNo: "N011",
            peName: "謝○護理師",
            role: "護理師",
            extension: "4401",
            bedIds: ["F4-01","F4-02","F4-03","F4-05","F4-06","F4-07","F4-08","F4-09","F4-10","F4-11"],
            emergencyGroup: "A",
            checkIn: true
          },
          {
            staffId: 12,
            peNo: "N012",
            peName: "蔡○護理師",
            role: "護理師",
            extension: "4402",
            bedIds: ["F4-12","F4-13","F4-15","F4-16","F4-17","F4-18","F4-19","F4-20","F4-21","F4-22"],
            emergencyGroup: "B",
            checkIn: true
          },
          {
            staffId: 13,
            peNo: "N013",
            peName: "吳○護理師",
            role: "護理師",
            extension: "3310",
            bedIds: ["F3-01","F3-02","F3-03","F3-04","F3-05"],
            emergencyGroup: "A",
            checkIn: true
          }
        ],

        specialists: [],

        residents: [
          {
            staffId: 23,
            peNo: "R004",
            peName: "黃○翔",
            department: "心臟外科",
            extension: "4413"
          }
        ]
      }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// React 遷移：useEffect(() => { getIcuSchedule(wardCode, date).then(setData) }, [wardCode, date])
// TODO 正式上線：return fetch(`/api/wards/ICU/schedule?date=${date}`).then(r => r.json())
async function getIcuSchedule(wardCode, date) {
  return Promise.resolve(_MOCK_ICU_SCHEDULE);
}
