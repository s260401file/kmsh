// ──────────────────────────────────────────────────────────────
// 醫師資訊 Mock 資料
// §7.1.2 (8.1) 醫師/專師負責床位  → DoctorBeds[]
// §7.1.2 (8.2) 查房時間表         → RoundSchedule[]
//
// 欄位（PascalCase = C# Model）：
//   DoctorBeds    ： DoctorId, DoctorNo, DoctorName, Role,
//                    Specialty, Ext, BedNos(string[])
//   RoundSchedule ： RoundId, RoundDate(yyyyMMdd), DoctorName,
//                    Specialty, EstimatedTime(HH:mm),
//                    ActualTime(HH:mm|null), IsCompleted(bool), Remark
//
// 正式上線時替換 getDoctorInfo() 內部為 fetch() 呼叫即可
// ──────────────────────────────────────────────────────────────

const _MOCK_DOCTOR_INFO = {
  "Success": true,
  "Message": "",
  "Data": {
    "WardCode": "W52",
    "QueryDate": "2026-06-02",

    // ── (8.1) 醫師/專師負責床位 ──
    "DoctorBeds": [
      {
        "DoctorId": 1,
        "DoctorNo": "D001",
        "DoctorName": "張○明 醫師",
        "Role": "主治醫師",
        "Specialty": "一般外科",
        "Ext": "5301",
        "BedNos": ["001", "002", "003", "004", "005", "006"]
      },
      {
        "DoctorId": 2,
        "DoctorNo": "D002",
        "DoctorName": "吳○宇 醫師",
        "Role": "主治醫師",
        "Specialty": "骨科",
        "Ext": "5302",
        "BedNos": ["007", "008", "009", "010", "011", "012"]
      },
      {
        "DoctorId": 3,
        "DoctorNo": "D003",
        "DoctorName": "許○仁 醫師",
        "Role": "主治醫師",
        "Specialty": "骨科",
        "Ext": "5303",
        "BedNos": ["013", "014", "015", "016"]
      },
      {
        "DoctorId": 4,
        "DoctorNo": "S001",
        "DoctorName": "李○玲 專師",
        "Role": "專科護理師",
        "Specialty": "傷口照護",
        "Ext": "5220",
        "BedNos": ["001", "002", "007", "008", "013", "014"]
      }
    ],

    // ── (8.2) 查房時間表 ──
    "RoundSchedule": [
      {
        "RoundId": 1,
        "RoundDate": "20260602",
        "DoctorName": "張○明 醫師",
        "Specialty": "一般外科",
        "EstimatedTime": "09:00",
        "ActualTime": "09:08",
        "IsCompleted": true,
        "Remark": ""
      },
      {
        "RoundId": 2,
        "RoundDate": "20260602",
        "DoctorName": "吳○宇 醫師",
        "Specialty": "骨科",
        "EstimatedTime": "10:30",
        "ActualTime": "10:22",
        "IsCompleted": true,
        "Remark": ""
      },
      {
        "RoundId": 3,
        "RoundDate": "20260602",
        "DoctorName": "許○仁 醫師",
        "Specialty": "骨科",
        "EstimatedTime": "11:00",
        "ActualTime": null,
        "IsCompleted": false,
        "Remark": ""
      },
      {
        "RoundId": 4,
        "RoundDate": "20260602",
        "DoctorName": "李○玲 專師",
        "Specialty": "傷口照護",
        "EstimatedTime": "14:00",
        "ActualTime": null,
        "IsCompleted": false,
        "Remark": ""
      },
      {
        "RoundId": 5,
        "RoundDate": "20260603",
        "DoctorName": "張○明 醫師",
        "Specialty": "一般外科",
        "EstimatedTime": "09:00",
        "ActualTime": null,
        "IsCompleted": false,
        "Remark": ""
      },
      {
        "RoundId": 6,
        "RoundDate": "20260603",
        "DoctorName": "吳○宇 醫師",
        "Specialty": "骨科",
        "EstimatedTime": "10:30",
        "ActualTime": null,
        "IsCompleted": false,
        "Remark": ""
      },
      {
        "RoundId": 7,
        "RoundDate": "20260603",
        "DoctorName": "許○仁 醫師",
        "Specialty": "骨科",
        "EstimatedTime": "11:00",
        "ActualTime": null,
        "IsCompleted": false,
        "Remark": ""
      }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// React 遷移：useEffect(() => { getDoctorInfo(wardCode, date).then(setData) }, [wardCode, date])
// TODO 正式上線：return fetch(`/api/wards/${wardCode}/doctor-info?date=${date}`).then(r => r.json())
async function getDoctorInfo(wardCode, date) {
  return Promise.resolve(_MOCK_DOCTOR_INFO);
}
