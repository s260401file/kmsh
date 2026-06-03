// ──────────────────────────────────────────────────────────────
// 排班資訊 Mock 資料
// §7.1.2 (7.1) 護理人員排班（含負責床位、緊急應變編組、點班）
// §7.1.2 (7.2) 專師排班
// §7.1.2 (7.3) 住院醫師排班
//
// 欄位（PascalCase = C# Model）：
//   Nurses    ： StaffId, PeNo, PeName, Role, Extension,
//                BedNos(string[]), EmergencyGroup, CheckIn(bool)
//   Specialists： StaffId, PeNo, PeName, Specialty, Extension
//   Residents  ： StaffId, PeNo, PeName, Department, Extension
//
// 正式上線時替換 getSchedule() 內部為 fetch() 呼叫即可
// ──────────────────────────────────────────────────────────────

const _MOCK_SCHEDULE = {
  "Success": true,
  "Message": "",
  "Data": {
    "WardCode": "W52",
    "QueryDate": "2026-06-02",
    "Shifts": [
      {
        "ShiftType": "白班",
        "ShiftTime": "08:00–16:00",

        // ── (7.1) 護理人員 ──
        "Nurses": [
          {
            "StaffId": 1,
            "PeNo": "N001",
            "PeName": "林○芳",
            "Role": "護理長",
            "Extension": "5210",
            "BedNos": [],
            "EmergencyGroup": "指揮",
            "CheckIn": true
          },
          {
            "StaffId": 2,
            "PeNo": "N002",
            "PeName": "陳○梅",
            "Role": "護理師",
            "Extension": "5201",
            "BedNos": ["001", "002", "003", "004"],
            "EmergencyGroup": "A",
            "CheckIn": true
          },
          {
            "StaffId": 3,
            "PeNo": "N003",
            "PeName": "蔡○柔",
            "Role": "護理師",
            "Extension": "5202",
            "BedNos": ["005", "006", "007", "008"],
            "EmergencyGroup": "A",
            "CheckIn": true
          },
          {
            "StaffId": 4,
            "PeNo": "N004",
            "PeName": "王○惠",
            "Role": "護理師",
            "Extension": "5203",
            "BedNos": ["009", "010", "011", "012"],
            "EmergencyGroup": "B",
            "CheckIn": false
          },
          {
            "StaffId": 5,
            "PeNo": "N005",
            "PeName": "黃○萍",
            "Role": "護理師",
            "Extension": "5204",
            "BedNos": ["013", "014", "015", "016"],
            "EmergencyGroup": "B",
            "CheckIn": true
          }
        ],

        // ── (7.2) 專師 ──
        "Specialists": [
          {
            "StaffId": 10,
            "PeNo": "S001",
            "PeName": "李○玲",
            "Specialty": "傷口照護",
            "Extension": "5220"
          },
          {
            "StaffId": 11,
            "PeNo": "S002",
            "PeName": "張○雯",
            "Specialty": "糖尿病衛教",
            "Extension": "5221"
          }
        ],

        // ── (7.3) 住院醫師 ──
        "Residents": [
          {
            "StaffId": 20,
            "PeNo": "R001",
            "PeName": "吳○明",
            "Department": "一般外科",
            "Extension": "5300"
          },
          {
            "StaffId": 21,
            "PeNo": "R002",
            "PeName": "陳○宇",
            "Department": "骨科",
            "Extension": "5301"
          }
        ]
      },
      {
        "ShiftType": "小夜",
        "ShiftTime": "16:00–24:00",

        "Nurses": [
          {
            "StaffId": 6,
            "PeNo": "N006",
            "PeName": "鄭○雲",
            "Role": "護理師",
            "Extension": "5203",
            "BedNos": ["001", "002", "003", "004", "005", "006", "007", "008"],
            "EmergencyGroup": "A",
            "CheckIn": true
          },
          {
            "StaffId": 7,
            "PeNo": "N007",
            "PeName": "林○靜",
            "Role": "護理師",
            "Extension": "5204",
            "BedNos": ["009", "010", "011", "012", "013", "014", "015", "016"],
            "EmergencyGroup": "B",
            "CheckIn": true
          },
          {
            "StaffId": 8,
            "PeNo": "N008",
            "PeName": "謝○玉",
            "Role": "護理師",
            "Extension": "5205",
            "BedNos": [],
            "EmergencyGroup": "指揮",
            "CheckIn": true
          }
        ],

        "Specialists": [],

        "Residents": [
          {
            "StaffId": 22,
            "PeNo": "R003",
            "PeName": "劉○傑",
            "Department": "一般外科",
            "Extension": "5302"
          }
        ]
      },
      {
        "ShiftType": "大夜",
        "ShiftTime": "00:00–08:00",

        "Nurses": [
          {
            "StaffId": 9,
            "PeNo": "N009",
            "PeName": "吳○萱",
            "Role": "護理師",
            "Extension": "5205",
            "BedNos": ["001", "002", "003", "004", "005", "006", "007", "008"],
            "EmergencyGroup": "A",
            "CheckIn": true
          },
          {
            "StaffId": 10,
            "PeNo": "N010",
            "PeName": "黃○芬",
            "Role": "護理師",
            "Extension": "5206",
            "BedNos": ["009", "010", "011", "012", "013", "014", "015", "016"],
            "EmergencyGroup": "B",
            "CheckIn": true
          }
        ],

        "Specialists": [],

        "Residents": [
          {
            "StaffId": 23,
            "PeNo": "R004",
            "PeName": "蔡○翔",
            "Department": "骨科",
            "Extension": "5303"
          }
        ]
      }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// React 遷移：useEffect(() => { getSchedule(wardCode, date).then(setData) }, [wardCode, date])
// TODO 正式上線：return fetch(`/api/wards/${wardCode}/schedule?date=${date}`).then(r => r.json())
async function getSchedule(wardCode, date) {
  return Promise.resolve(_MOCK_SCHEDULE);
}
