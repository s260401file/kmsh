// ──────────────────────────────────────────────────────────────
// 檢查 / 會診 Mock 資料 — ICU 版
// 對齊後端 GET /api/Board/ICU/exam（camelCase）：
//   檢查＝院方 Board_Examine（每列一項檢查）→ exams[]
//     status 由代碼對應：31 未執行 / 32 未排程 / 34 已排程
//     欄位：bedId, patientName, gender, examName, scheduledDate(轉入日),
//           timeSlot, status, notes
//   會診＝自建 WardExamConsult（設定後 24h 內顯示）→ consults[]
//     status：待回覆 / 已回覆 / 進行中 / 待安排 / 取消
//     欄位：bedId, patientName, gender, consultDept, consultDoctor,
//           completedTime, status, notes
//
// TODO 正式上線：return fetch(`/api/Board/ICU/exam`).then(r => r.json())
// ──────────────────────────────────────────────────────────────

const _MOCK_ICU_EXAM_CONSULT = {
  success: true,
  message: "",
  data: {
    wardCode: "ICU",
    queryDate: "2026-06-03",

    // ── 檢查清單（院方 Board_Examine，只顯示本站在床病人）──
    examinations: [
      {
        examId: 1,
        bedId: "F4-01",
        patientName: "林○志",
        gender: "M",
        age: 72,
        examName: "Chest CT w/ contrast",
        scheduledDate: "2026-06-03",
        timeSlot: "上午",
        status: "未執行",
        notes: "肺炎評估"
      },
      {
        examId: 2,
        bedId: "F4-02",
        patientName: "張○芬",
        gender: "F",
        age: 65,
        examName: "Echocardiogram",
        scheduledDate: "2026-06-03",
        timeSlot: "上午",
        status: "已排程",
        notes: "心臟功能評估"
      },
      {
        examId: 3,
        bedId: "F4-07",
        patientName: "陳○祥",
        gender: "M",
        age: 71,
        examName: "Wound culture (x3)",
        scheduledDate: "2026-06-03",
        timeSlot: "上午",
        status: "已排程",
        notes: "細菌培養追蹤"
      },
      {
        examId: 4,
        bedId: "F4-10",
        patientName: "柯○芳",
        gender: "F",
        age: 49,
        examName: "Brain MRI",
        scheduledDate: "2026-06-03",
        timeSlot: "下午",
        status: "未排程",
        notes: "術後評估"
      },
      {
        examId: 5,
        bedId: "F3-01",
        patientName: "謝○恆",
        gender: "M",
        age: 79,
        examName: "Sputum culture",
        scheduledDate: "2026-06-02",
        timeSlot: "上午",
        status: "已排程",
        notes: "肺炎病原追蹤"
      },
      {
        examId: 6,
        bedId: "F4-12",
        patientName: "彭○輝",
        gender: "M",
        age: 81,
        examName: "Chest X-ray (portable)",
        scheduledDate: "2026-06-04",
        timeSlot: "上午",
        status: "未執行",
        notes: "肺水腫追蹤"
      },
      {
        examId: 7,
        bedId: "F4-15",
        patientName: "王○任",
        gender: "M",
        age: 64,
        examName: "Urine culture",
        scheduledDate: "2026-06-03",
        timeSlot: "上午",
        status: "已排程",
        notes: "UTI 治療評估"
      }
    ],

    // ── 會診清單（自建 WardExamConsult，設定後 24h 內）──
    consultations: [
      {
        consultId: 1,
        bedId: "F4-01",
        patientName: "林○志",
        gender: "M",
        age: 72,
        consultDept: "感染科",
        consultDoctor: "魏○欣 醫師",
        completedTime: "2026-06-03 08:30",
        status: "已回覆",
        notes: "抗生素方案調整建議"
      },
      {
        consultId: 2,
        bedId: "F4-05",
        patientName: "黃○雄",
        gender: "M",
        age: 80,
        consultDept: "復健科",
        consultDoctor: "陳○雅 醫師",
        completedTime: "",
        status: "待回覆",
        notes: "神經復健評估"
      },
      {
        consultId: 3,
        bedId: "F4-11",
        patientName: "羅○平",
        gender: "M",
        age: 76,
        consultDept: "腸胃科",
        consultDoctor: "黃○誠 主任",
        completedTime: "2026-06-03 07:45",
        status: "已回覆",
        notes: "消化道出血處置建議"
      },
      {
        consultId: 4,
        bedId: "F4-12",
        patientName: "彭○輝",
        gender: "M",
        age: 81,
        consultDept: "心臟內科",
        consultDoctor: "弘○醫師",
        completedTime: "",
        status: "進行中",
        notes: "心衰竭治療調整"
      },
      {
        consultId: 5,
        bedId: "F3-01",
        patientName: "謝○恆",
        gender: "M",
        age: 79,
        consultDept: "胸腔外科",
        consultDoctor: "蘇○醫師",
        completedTime: "",
        status: "待安排",
        notes: "胸腔引流評估"
      },
      {
        consultId: 6,
        bedId: "F4-18",
        patientName: "張○慧",
        gender: "F",
        age: 76,
        consultDept: "肝膽腸胃科",
        consultDoctor: "李○醫師",
        completedTime: "2026-06-02 14:00",
        status: "取消",
        notes: "會診已由主治醫師取消"
      }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// TODO 正式上線：return fetch(`/api/Board/ICU/exam`).then(r => r.json())
async function getIcuExamConsult(wardCode, date) {
  return Promise.resolve(_MOCK_ICU_EXAM_CONSULT);
}
