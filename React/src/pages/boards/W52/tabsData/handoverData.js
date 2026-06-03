const HANDOVER_DATA = {
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52", "QueryDate": "2026-06-02",
    "HandoverInfo": { "FromShift": "白班", "FromShiftTime": "08:00–16:00", "ToShift": "小夜", "ToShiftTime": "16:00–24:00", "HandoverTime": "16:00", "FromNurses": ["陳○梅","蔡○柔","王○惠","黃○萍"], "ToNurses": ["鄭○雲","林○靜"] },
    "Patients": [
      { "HandoverId": 1, "BedNo": "001", "PatientName": "林○志", "Gender": "M", "Age": 75, "Diagnosis": "股骨頸骨折 — THA 術後 D2", "Priority": "高", "Items": [
        { "Category": "管路", "Content": "尿管 D2、CVP D3、左前臂 IV，注意導尿管引流量" },
        { "Category": "用藥", "Content": "Morphine 5mg PRN q4h（疼痛分數 ≥4 給予）" },
        { "Category": "生命徵象", "Content": "14:00 體溫 38.2°C，已給 Acetaminophen 500mg，請 4 小時後追蹤" },
        { "Category": "警示", "Content": "跌倒高風險、夜間譫妄，請加強巡視" },
        { "Category": "家屬", "Content": "兒子明日 09:00 來院討論出院計畫" }
      ]},
      { "HandoverId": 2, "BedNo": "005", "PatientName": "陳○華", "Gender": "F", "Age": 62, "Diagnosis": "Type 2 DM 合併足部蜂窩性組織炎", "Priority": "中", "Items": [
        { "Category": "用藥", "Content": "Insulin RI 餐前依血糖給予（>200 給 4u、>250 給 6u）" },
        { "Category": "管路", "Content": "右前臂 IV、左足傷口換藥 BID" },
        { "Category": "待辦", "Content": "明日 06:00 空腹抽血（HbA1c、Cr）" },
        { "Category": "家屬", "Content": "獨居，社工已介入評估出院支援" }
      ]},
      { "HandoverId": 3, "BedNo": "007", "PatientName": "王○雯", "Gender": "F", "Age": 58, "Diagnosis": "大腸癌 — 結腸切除術後 D3", "Priority": "中", "Items": [
        { "Category": "管路", "Content": "腹腔引流管引流量約 80mL / 班、NG 已拔" },
        { "Category": "用藥", "Content": "PCA 持續使用中，疼痛分數穩定在 2–3" },
        { "Category": "待辦", "Content": "今晚開始喝水試驗，觀察腹脹／嘔吐" }
      ]},
      { "HandoverId": 4, "BedNo": "009", "PatientName": "林○成", "Gender": "M", "Age": 45, "Diagnosis": "急性闌尾炎 — Lap. App. 術後 D1", "Priority": "一般", "Items": [
        { "Category": "用藥", "Content": "Cefazolin 1g q8h，下一劑 18:00" },
        { "Category": "管路", "Content": "右前臂 IV，無引流管" },
        { "Category": "待辦", "Content": "明日早上由主治醫師決定是否出院" }
      ]},
      { "HandoverId": 5, "BedNo": "013", "PatientName": "鄭○娟", "Gender": "F", "Age": 71, "Diagnosis": "充血性心衰竭 (CHF) 急性發作", "Priority": "高", "Items": [
        { "Category": "用藥", "Content": "Lasix 20mg IV BID（08:00、20:00）" },
        { "Category": "生命徵象", "Content": "下午 BP 145/88、SpO₂ 94%（rest），on O₂ 2L nasal cannula" },
        { "Category": "管路", "Content": "右前臂 IV、尿管 D4，每班記錄 I/O" },
        { "Category": "警示", "Content": "限水 1000mL / 日，請嚴格控管" },
        { "Category": "家屬", "Content": "女兒情緒焦慮，已聯絡個管師後續關懷" }
      ]},
      { "HandoverId": 6, "BedNo": "015", "PatientName": "黃○忠", "Gender": "M", "Age": 55, "Diagnosis": "社區型肺炎 (CAP)", "Priority": "中", "Items": [
        { "Category": "警示", "Content": "飛沫隔離中，進出請配戴 N95" },
        { "Category": "用藥", "Content": "Levofloxacin 750mg IV QD，今日已給" },
        { "Category": "生命徵象", "Content": "下午體溫 37.8°C，呼吸略喘但 SpO₂ 維持 96%" },
        { "Category": "待辦", "Content": "明日 08:00 痰液培養追蹤" }
      ]}
    ]
  }
}
export default HANDOVER_DATA
