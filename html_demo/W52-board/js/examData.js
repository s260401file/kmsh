// ──────────────────────────────────────────────────────────────
// 檢查 / 會診 Mock 資料
// §7.1.2 (5.1) 檢查欄位：床號、姓名、檢查項目、預定日期、時段、狀態、備註
// §7.1.2 (5.2) 會診欄位：床號、姓名、會診科別、會診醫師、完成時間、狀態、備註
//
// 欄位（PascalCase = C# Model）：
//   Examinations[] ： ExamId, BedNo, PatientName, Gender, Age,
//                     ExamName, ScheduledDate(yyyy-MM-dd),
//                     TimeSlot("上午"|"下午"), ScheduledTime(HH:mm),
//                     Status("待執行"|"已完成"|"預約"), Remarks
//   Consultations[]： ConsultId, BedNo, PatientName, Gender, Age,
//                     ConsultDept, ConsultDoctor,
//                     CompletedAt("yyyy-MM-dd HH:mm"),
//                     Status("已完成"|"進行中"|"待安排"), Remarks
//
// 正式上線時替換 getExamConsult() 內部為 fetch() 呼叫即可
// ──────────────────────────────────────────────────────────────

const _MOCK_EXAM_CONSULT = {
  "Success": true,
  "Message": "",
  "Data": {
    "WardCode": "W52",
    "QueryDate": "2026-06-03",

    // ── (5.1) 檢查清單 ──
    "Examinations": [
      {
        "ExamId": 1,
        "BedNo": "019",
        "PatientName": "賴○月",
        "Gender": "F",
        "Age": 71,
        "ExamName": "Echocardiogram",
        "ScheduledDate": "2026-06-03",
        "TimeSlot": "上午",
        "ScheduledTime": "08:00",
        "Status": "待執行",
        "Remarks": "術前評估"
      },
      {
        "ExamId": 2,
        "BedNo": "016",
        "PatientName": "張○河",
        "Gender": "M",
        "Age": 64,
        "ExamName": "Hip X-ray AP/Lat",
        "ScheduledDate": "2026-06-03",
        "TimeSlot": "上午",
        "ScheduledTime": "09:30",
        "Status": "已完成",
        "Remarks": "等放射科報告"
      },
      {
        "ExamId": 3,
        "BedNo": "008",
        "PatientName": "陳○珠",
        "Gender": "F",
        "Age": 68,
        "ExamName": "CBC + Coagulation",
        "ScheduledDate": "2026-06-03",
        "TimeSlot": "上午",
        "ScheduledTime": "06:30",
        "Status": "已完成",
        "Remarks": "送檢驗中"
      },
      {
        "ExamId": 4,
        "BedNo": "027",
        "PatientName": "朱○玉",
        "Gender": "F",
        "Age": 56,
        "ExamName": "CT Chest w/ contrast",
        "ScheduledDate": "2026-06-03",
        "TimeSlot": "下午",
        "ScheduledTime": "14:00",
        "Status": "待執行",
        "Remarks": "化療前評估"
      },
      {
        "ExamId": 5,
        "BedNo": "007",
        "PatientName": "吳○美",
        "Gender": "F",
        "Age": 59,
        "ExamName": "Urodynamic study",
        "ScheduledDate": "2026-06-04",
        "TimeSlot": "上午",
        "ScheduledTime": "10:00",
        "Status": "預約",
        "Remarks": ""
      }
    ],

    // ── (5.2) 會診清單 ──
    "Consultations": [
      {
        "ConsultId": 1,
        "BedNo": "019",
        "PatientName": "賴○月",
        "Gender": "F",
        "Age": 71,
        "ConsultDept": "心臟外科",
        "ConsultDoctor": "黃○誠 主任",
        "CompletedAt": "2026-06-03 07:45",
        "Status": "已完成",
        "Remarks": "建議 MVR"
      },
      {
        "ConsultId": 2,
        "BedNo": "038",
        "PatientName": "梁○山",
        "Gender": "M",
        "Age": 62,
        "ConsultDept": "感染科",
        "ConsultDoctor": "魏○欣 醫師",
        "CompletedAt": "2026-06-03 09:00",
        "Status": "進行中",
        "Remarks": "MRSA 治療調整"
      },
      {
        "ConsultId": 3,
        "BedNo": "031",
        "PatientName": "羅○凱",
        "Gender": "M",
        "Age": 80,
        "ConsultDept": "腎臟科",
        "ConsultDoctor": "陳○科 醫師",
        "CompletedAt": "2026-06-02 23:55",
        "Status": "已完成",
        "Remarks": "建議啟動 CRRT"
      },
      {
        "ConsultId": 4,
        "BedNo": "013",
        "PatientName": "周○玲",
        "Gender": "F",
        "Age": 53,
        "ConsultDept": "新陳代謝",
        "ConsultDoctor": "李○醫師",
        "CompletedAt": "2026-06-02 14:00",
        "Status": "已完成",
        "Remarks": "出院後門診追蹤"
      },
      {
        "ConsultId": 5,
        "BedNo": "007",
        "PatientName": "吳○美",
        "Gender": "F",
        "Age": 59,
        "ConsultDept": "復健科",
        "ConsultDoctor": "陳○雅 醫師",
        "CompletedAt": "2026-06-03 14:30",
        "Status": "待安排",
        "Remarks": "壓瘡照護評估"
      }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// React 遷移：useEffect(() => { getExamConsult(wardCode, date).then(setData) }, [wardCode, date])
// TODO 正式上線：return fetch(`/api/wards/${wardCode}/exam-consult?date=${date}`).then(r => r.json())
async function getExamConsult(wardCode, date) {
  return Promise.resolve(_MOCK_EXAM_CONSULT);
}
