const EXAM_DATA = {
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52", "QueryDate": "2026-06-03",
    "Examinations": [
      { "ExamId": 1, "BedNo": "019", "PatientName": "賴○月", "Gender": "F", "Age": 71, "ExamName": "Echocardiogram", "ScheduledDate": "2026-06-03", "TimeSlot": "上午", "ScheduledTime": "08:00", "Status": "待執行", "Remarks": "術前評估" },
      { "ExamId": 2, "BedNo": "016", "PatientName": "張○河", "Gender": "M", "Age": 64, "ExamName": "Hip X-ray AP/Lat", "ScheduledDate": "2026-06-03", "TimeSlot": "上午", "ScheduledTime": "09:30", "Status": "已完成", "Remarks": "等放射科報告" },
      { "ExamId": 3, "BedNo": "008", "PatientName": "陳○珠", "Gender": "F", "Age": 68, "ExamName": "CBC + Coagulation", "ScheduledDate": "2026-06-03", "TimeSlot": "上午", "ScheduledTime": "06:30", "Status": "已完成", "Remarks": "送檢驗中" },
      { "ExamId": 4, "BedNo": "027", "PatientName": "朱○玉", "Gender": "F", "Age": 56, "ExamName": "CT Chest w/ contrast", "ScheduledDate": "2026-06-03", "TimeSlot": "下午", "ScheduledTime": "14:00", "Status": "待執行", "Remarks": "化療前評估" },
      { "ExamId": 5, "BedNo": "007", "PatientName": "吳○美", "Gender": "F", "Age": 59, "ExamName": "Urodynamic study", "ScheduledDate": "2026-06-04", "TimeSlot": "上午", "ScheduledTime": "10:00", "Status": "預約", "Remarks": "" }
    ],
    "Consultations": [
      { "ConsultId": 1, "BedNo": "019", "PatientName": "賴○月", "Gender": "F", "Age": 71, "ConsultDept": "心臟外科", "ConsultDoctor": "黃○誠 主任", "CompletedAt": "2026-06-03 07:45", "Status": "已完成", "Remarks": "建議 MVR" },
      { "ConsultId": 2, "BedNo": "038", "PatientName": "梁○山", "Gender": "M", "Age": 62, "ConsultDept": "感染科", "ConsultDoctor": "魏○欣 醫師", "CompletedAt": "2026-06-03 09:00", "Status": "進行中", "Remarks": "MRSA 治療調整" },
      { "ConsultId": 3, "BedNo": "031", "PatientName": "羅○凱", "Gender": "M", "Age": 80, "ConsultDept": "腎臟科", "ConsultDoctor": "陳○科 醫師", "CompletedAt": "2026-06-02 23:55", "Status": "已完成", "Remarks": "建議啟動 CRRT" },
      { "ConsultId": 4, "BedNo": "013", "PatientName": "周○玲", "Gender": "F", "Age": 53, "ConsultDept": "新陳代謝", "ConsultDoctor": "李○醫師", "CompletedAt": "2026-06-02 14:00", "Status": "已完成", "Remarks": "出院後門診追蹤" },
      { "ConsultId": 5, "BedNo": "007", "PatientName": "吳○美", "Gender": "F", "Age": 59, "ConsultDept": "復健科", "ConsultDoctor": "陳○雅 醫師", "CompletedAt": "2026-06-03 14:30", "Status": "待安排", "Remarks": "壓瘡照護評估" }
    ]
  }
}
export default EXAM_DATA
