// surgerylistData.js — OR「手術清單」靜態原型資料（對齊 React SurgeryListTab 讀取的
// /api/Board/or/surgerylist 回傳形狀：{ rows:[...], stats:{...} }）。純 mock、無 API。
const SURGERY_LIST_DATA = {
  stats: { total: 9, inpatient: 5, outpatient: 3, emergency: 1 },
  rows: [
    { opDate: "2026-07-16", opTime: "07:15", chartNo: "G801234607",
      sourceWard: "急診", sourceBed: "", caseTypeText: "急診", roomId: "OR-08",
      department: "一般外科", anesthesia: "GA", patientName: "許○宏", sex: "M", age: 48,
      surgeonName: "王○哲醫師", surgeryName: "腹腔鏡闌尾切除術 Lap. Appendectomy",
      diagnosis: "Acute appendicitis, Perforated", note: "術前廣效抗生素",
      scrubNurse: "張○惠", circNurse: "周○娟", anesNurse: "何○君", statusCode: "" },

    { opDate: "2026-07-16", opTime: "07:18", chartNo: "A201234611",
      sourceWard: "門診", sourceBed: "", caseTypeText: "門診", roomId: "OR-01",
      department: "一般外科", anesthesia: "GA", patientName: "趙○琴", sex: "F", age: 51,
      surgeonName: "黃○誠醫師", surgeryName: "腹腔鏡腹股溝疝氣修補術 TEP",
      diagnosis: "Inguinal hernia, Right", note: "",
      scrubNurse: "張○惠", circNurse: "李○婷", anesNurse: "何○君", statusCode: "" },

    { opDate: "2026-07-16", opTime: "08:10", chartNo: "E601234615",
      sourceWard: "6A", sourceBed: "12", caseTypeText: "住院", roomId: "OR-06",
      department: "泌尿外科", anesthesia: "SA", patientName: "孫○德", sex: "M", age: 69,
      surgeonName: "陳○科醫師", surgeryName: "經尿道膀胱腫瘤刮除術 TURBT",
      diagnosis: "Bladder tumor, Recurrent", note: "病理送驗",
      scrubNurse: "李○婷", circNurse: "周○娟", anesNurse: "何○君", statusCode: "" },

    { opDate: "2026-07-16", opTime: "08:22", chartNo: "F701234606",
      sourceWard: "門診", sourceBed: "", caseTypeText: "門診", roomId: "OR-07",
      department: "整形外科", anesthesia: "LA", patientName: "林○雯", sex: "F", age: 29,
      surgeonName: "林○泰醫師", surgeryName: "左手攣縮疤痕鬆解植皮術",
      diagnosis: "Hypertrophic scar contracture, Lt hand", note: "已轉 PACU",
      scrubNurse: "王○珊", circNurse: "李○婷", anesNurse: "何○君", statusCode: "" },

    { opDate: "2026-07-16", opTime: "09:05", chartNo: "A201234601",
      sourceWard: "5B", sourceBed: "08", caseTypeText: "住院", roomId: "OR-01",
      department: "一般外科", anesthesia: "GA", patientName: "王○明", sex: "M", age: 65,
      surgeonName: "黃○誠醫師", surgeryName: "腹腔鏡膽囊切除術 LC",
      diagnosis: "Cholelithiasis, Acute cholecystitis", note: "HTN 病史",
      scrubNurse: "張○惠", circNurse: "李○婷", anesNurse: "何○君", statusCode: "" },

    { opDate: "2026-07-16", opTime: "09:32", chartNo: "B301234602",
      sourceWard: "門診", sourceBed: "", caseTypeText: "門診", roomId: "OR-02",
      department: "婦產科", anesthesia: "SA", patientName: "陳○芳", sex: "F", age: 42,
      surgeonName: "林○泰醫師", surgeryName: "子宮鏡肌瘤切除術 Hysteroscopic Myomectomy",
      diagnosis: "Uterine myoma, Menorrhagia", note: "",
      scrubNurse: "周○娟", circNurse: "王○珊", anesNurse: "何○君", statusCode: "" },

    { opDate: "2026-07-16", opTime: "10:00", chartNo: "E601234605",
      sourceWard: "6A", sourceBed: "12", caseTypeText: "住院", roomId: "OR-06",
      department: "泌尿外科", anesthesia: "SA", patientName: "劉○明", sex: "M", age: 72,
      surgeonName: "陳○科醫師", surgeryName: "經尿道前列腺刮除術 TURP",
      diagnosis: "BPH with LUTS", note: "停用 Warfarin",
      scrubNurse: "李○婷", circNurse: "周○娟", anesNurse: "何○君", statusCode: "" },

    { opDate: "2026-07-16", opTime: "11:30", chartNo: "D501234604",
      sourceWard: "CVICU", sourceBed: "03", caseTypeText: "住院", roomId: "OR-05",
      department: "心臟外科", anesthesia: "GA", patientName: "吳○秀", sex: "F", age: 58,
      surgeonName: "黃○誠醫師", surgeryName: "二尖瓣置換術 MVR",
      diagnosis: "Mitral valve regurgitation, Severe", note: "體外循環，ICU 床已預留",
      scrubNurse: "周○娟", circNurse: "張○惠", anesNurse: "何○君", statusCode: "" },

    { opDate: "2026-07-16", opTime: "13:30", chartNo: "H901234608",
      sourceWard: "5B", sourceBed: "15", caseTypeText: "住院", roomId: "OR-03",
      department: "骨科", anesthesia: "GA", patientName: "鄭○昌", sex: "M", age: 61,
      surgeonName: "王○哲醫師", surgeryName: "全膝關節置換術 TKR",
      diagnosis: "Osteoarthritis, Rt knee, severe", note: "病人取消，改期",
      scrubNurse: "", circNurse: "", anesNurse: "", statusCode: "82", cancelReason: "病人要求改期" }
  ]
};
