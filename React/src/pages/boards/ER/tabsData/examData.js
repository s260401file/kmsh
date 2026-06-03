const EXAM_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "ER",
    QueryDate: "2026-06-03",
    Exams: [
      { ExamId: 1,  BedId: "ER-01", PatientName: "王○明", ExamName: "胸部 X 光",       ScheduledDate: "2026-06-03", TimeSlot: "09:00", Status: "完成",   Notes: "" },
      { ExamId: 2,  BedId: "ER-02", PatientName: "李○花", ExamName: "腹部超音波",      ScheduledDate: "2026-06-03", TimeSlot: "10:30", Status: "執行中", Notes: "NPO 中" },
      { ExamId: 3,  BedId: "ER-03", PatientName: "張○強", ExamName: "頭部 CT",        ScheduledDate: "2026-06-03", TimeSlot: "11:00", Status: "完成",   Notes: "顯影劑過敏確認" },
      { ExamId: 4,  BedId: "ER-05", PatientName: "陳○美", ExamName: "心電圖",          ScheduledDate: "2026-06-03", TimeSlot: "11:30", Status: "待執行", Notes: "" },
      { ExamId: 5,  BedId: "ER-07", PatientName: "林○宏", ExamName: "腹部 CT（顯影）", ScheduledDate: "2026-06-03", TimeSlot: "13:00", Status: "待執行", Notes: "腎功能確認中" },
      { ExamId: 6,  BedId: "ER-09", PatientName: "黃○珊", ExamName: "骨盆 X 光",      ScheduledDate: "2026-06-03", TimeSlot: "14:00", Status: "待執行", Notes: "" },
      { ExamId: 7,  BedId: "ER-11", PatientName: "吳○志", ExamName: "血液培養",        ScheduledDate: "2026-06-03", TimeSlot: "08:30", Status: "完成",   Notes: "送檢驗科" }
    ],
    Consults: [
      { ConsultId: 1, BedId: "ER-02", PatientName: "李○花", ConsultDept: "婦產科",   ConsultDoctor: "張○惠醫師", ConsultTime: "10:00", Status: "已回覆", Notes: "建議婦科超音波" },
      { ConsultId: 2, BedId: "ER-03", PatientName: "張○強", ConsultDept: "神經外科", ConsultDoctor: "陳○明醫師", ConsultTime: "11:15", Status: "已回覆", Notes: "追蹤 CT 結果後決定手術" },
      { ConsultId: 3, BedId: "ER-05", PatientName: "陳○美", ConsultDept: "心臟內科", ConsultDoctor: "林○哲醫師", ConsultTime: null,    Status: "待回覆", Notes: "疑似 STEMI，請急會" },
      { ConsultId: 4, BedId: "ER-07", PatientName: "林○宏", ConsultDept: "一般外科", ConsultDoctor: "吳○誠醫師", ConsultTime: null,    Status: "待回覆", Notes: "急性腹症評估" },
      { ConsultId: 5, BedId: "ER-10", PatientName: "蔡○婷", ConsultDept: "精神科",   ConsultDoctor: "黃○安醫師", ConsultTime: "09:45", Status: "已回覆", Notes: "需轉介精神科病房" },
      { ConsultId: 6, BedId: "ER-12", PatientName: "周○豪", ConsultDept: "骨科",     ConsultDoctor: "王○勇醫師", ConsultTime: null,    Status: "待回覆", Notes: "右股骨骨折手術評估" }
    ]
  }
}

export default EXAM_DATA
