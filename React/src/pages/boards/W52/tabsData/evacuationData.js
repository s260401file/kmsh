// evacuationData：避難圖相關假資料（待接 API；實際畫面 EvacuationTab 改用 evacuationApi 顯示圖片，此檔為參考結構）
// 結構：Data.EvacPlan=避難計畫（樓層/病房名/圖檔路徑/說明/最近演練日）、
//       Data.Equipment=消防/避難設備清單（名稱/位置/數量/最近檢查日）、
//       Data.EmergencyContacts=緊急連絡（保全/RRT/消防隊…）
const EVACUATION_DATA = {
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52", "QueryDate": "2026-06-02",
    "EvacPlan": { "EvacPlanId": 1, "FloorNo": "5F", "WardName": "W52 一般病房", "ImagePath": null, "PdfPath": null, "Description": "本病房位於 5 樓西側，主要逃生方向為左右兩側樓梯間，集合點為 1F 中庭廣場。", "UpdatedAt": "2026-05-01", "LastDrillDate": "2026-04-22" },
    "Equipment": [
      { "EquipmentId": 1, "EquipmentName": "滅火器", "Location": "護理站旁", "Quantity": 1, "LastCheckDate": "2026-04-15" },
      { "EquipmentId": 2, "EquipmentName": "滅火器", "Location": "東側走廊", "Quantity": 1, "LastCheckDate": "2026-04-15" },
      { "EquipmentId": 3, "EquipmentName": "滅火器", "Location": "西側走廊", "Quantity": 1, "LastCheckDate": "2026-04-15" },
      { "EquipmentId": 4, "EquipmentName": "滅火器", "Location": "走廊中段", "Quantity": 1, "LastCheckDate": "2026-04-15" },
      { "EquipmentId": 5, "EquipmentName": "緊急照明", "Location": "全區走廊頂部", "Quantity": 6, "LastCheckDate": "2026-05-01" },
      { "EquipmentId": 6, "EquipmentName": "安全門", "Location": "東側樓梯間", "Quantity": 1, "LastCheckDate": "2026-05-01" },
      { "EquipmentId": 7, "EquipmentName": "安全門", "Location": "西側樓梯間", "Quantity": 1, "LastCheckDate": "2026-05-01" },
      { "EquipmentId": 8, "EquipmentName": "氧氣切換閥", "Location": "護理站後方", "Quantity": 1, "LastCheckDate": "2026-03-20" },
      { "EquipmentId": 9, "EquipmentName": "醫療緊急包", "Location": "護理站", "Quantity": 1, "LastCheckDate": "2026-05-10" },
      { "EquipmentId": 10, "EquipmentName": "集合點", "Location": "1F 中庭廣場", "Quantity": 1, "LastCheckDate": null }
    ],
    "EmergencyContacts": [
      { "ContactId": 1, "Name": "院內保全", "Extension": "9119" },
      { "ContactId": 2, "Name": "院內急救 RRT", "Extension": "1234" },
      { "ContactId": 3, "Name": "消防隊（外線）", "Extension": "119" }
    ]
  }
}
export default EVACUATION_DATA
