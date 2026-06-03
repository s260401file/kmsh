// 避難圖 Mock 資料 — ICU 版（3F/4F）
// TODO 正式上線：return fetch(`/api/wards/ICU/evacuation`).then(r => r.json())
const EVACUATION_DATA = {
  success: true, message: "",
  data: {
    wardCode: "ICU", queryDate: "2026-06-03",
    evacPlan: { evacPlanId:1, floorNo:"3F/4F", wardName:"ICU 加護病房", imagePath:null, pdfPath:null, description:"ICU 位於 3F（5床）及 4F（20床），主要逃生方向為各樓層兩側樓梯間，集合點為 1F 門診廣場。", updatedAt:"2026-05-01", lastDrillDate:"2026-04-28" },
    equipment: [
      { equipmentId:1,  equipmentName:"滅火器",     location:"4F 護理站旁",     quantity:1, lastCheckDate:"2026-04-20" },
      { equipmentId:2,  equipmentName:"滅火器",     location:"4F 東側走廊",     quantity:1, lastCheckDate:"2026-04-20" },
      { equipmentId:3,  equipmentName:"滅火器",     location:"4F 西側走廊",     quantity:1, lastCheckDate:"2026-04-20" },
      { equipmentId:4,  equipmentName:"滅火器",     location:"3F 護理站旁",     quantity:1, lastCheckDate:"2026-04-20" },
      { equipmentId:5,  equipmentName:"緊急照明",   location:"4F 走廊全區",     quantity:8, lastCheckDate:"2026-05-01" },
      { equipmentId:6,  equipmentName:"緊急照明",   location:"3F 走廊全區",     quantity:4, lastCheckDate:"2026-05-01" },
      { equipmentId:7,  equipmentName:"安全門",     location:"4F 東側樓梯間",   quantity:1, lastCheckDate:"2026-05-01" },
      { equipmentId:8,  equipmentName:"安全門",     location:"4F 西側樓梯間",   quantity:1, lastCheckDate:"2026-05-01" },
      { equipmentId:9,  equipmentName:"安全門",     location:"3F 東側樓梯間",   quantity:1, lastCheckDate:"2026-05-01" },
      { equipmentId:10, equipmentName:"氧氣切換閥", location:"4F 護理站後方",   quantity:1, lastCheckDate:"2026-03-20" },
      { equipmentId:11, equipmentName:"氧氣切換閥", location:"3F 護理站後方",   quantity:1, lastCheckDate:"2026-03-20" },
      { equipmentId:12, equipmentName:"醫療緊急包", location:"4F / 3F 護理站", quantity:2, lastCheckDate:"2026-05-10" },
      { equipmentId:13, equipmentName:"集合點",     location:"1F 門診廣場",     quantity:1, lastCheckDate:null }
    ],
    emergencyContacts: [
      { contactId:1, name:"院內保全",       extension:"9119" },
      { contactId:2, name:"院內急救 RRT",   extension:"1234" },
      { contactId:3, name:"消防隊（外線）", extension:"119"  }
    ]
  }
}
export default EVACUATION_DATA
