// ──────────────────────────────────────────────────────────────
// 避難圖 Mock 資料
// §7.1.2 (10) 護理站避難圖顯示
//
// 對應資料表（PascalCase = C# Model）：
//   EvacPlan        ： EvacPlanId, FloorNo, ImagePath, PdfPath,
//                      Description, UpdatedAt
//   EvacEquipment[] ： EquipmentId, EquipmentName, Location,
//                      Quantity, LastCheckDate
//
// 注意：此 demo 使用 inline SVG 平面圖；
//       正式版可改用 <img src="${EvacPlan.ImagePath}"> 載入圖檔
//
// 正式上線時替換 getEvacuation() 內部為 fetch() 呼叫即可
// ──────────────────────────────────────────────────────────────

const _MOCK_EVACUATION = {
  "Success": true,
  "Message": "",
  "Data": {
    "WardCode": "W52",
    "QueryDate": "2026-06-02",

    // ── (10) 避難圖主資料 ──
    "EvacPlan": {
      "EvacPlanId": 1,
      "FloorNo": "5F",
      "WardName": "W52 一般病房",
      "ImagePath": null,            // demo 使用 inline SVG
      "PdfPath": null,
      "Description": "本病房位於 5 樓西側，主要逃生方向為左右兩側樓梯間，集合點為 1F 中庭廣場。",
      "UpdatedAt": "2026-05-01",
      "LastDrillDate": "2026-04-22"
    },

    // ── 避難設備清單 ──
    "Equipment": [
      { "EquipmentId": 1, "EquipmentName": "滅火器",      "Location": "護理站旁",     "Quantity": 1, "LastCheckDate": "2026-04-15" },
      { "EquipmentId": 2, "EquipmentName": "滅火器",      "Location": "東側走廊",     "Quantity": 1, "LastCheckDate": "2026-04-15" },
      { "EquipmentId": 3, "EquipmentName": "滅火器",      "Location": "西側走廊",     "Quantity": 1, "LastCheckDate": "2026-04-15" },
      { "EquipmentId": 4, "EquipmentName": "滅火器",      "Location": "走廊中段",     "Quantity": 1, "LastCheckDate": "2026-04-15" },
      { "EquipmentId": 5, "EquipmentName": "緊急照明",    "Location": "全區走廊頂部", "Quantity": 6, "LastCheckDate": "2026-05-01" },
      { "EquipmentId": 6, "EquipmentName": "安全門",      "Location": "東側樓梯間",   "Quantity": 1, "LastCheckDate": "2026-05-01" },
      { "EquipmentId": 7, "EquipmentName": "安全門",      "Location": "西側樓梯間",   "Quantity": 1, "LastCheckDate": "2026-05-01" },
      { "EquipmentId": 8, "EquipmentName": "氧氣切換閥",  "Location": "護理站後方",   "Quantity": 1, "LastCheckDate": "2026-03-20" },
      { "EquipmentId": 9, "EquipmentName": "醫療緊急包",  "Location": "護理站",       "Quantity": 1, "LastCheckDate": "2026-05-10" },
      { "EquipmentId":10, "EquipmentName": "集合點",      "Location": "1F 中庭廣場",  "Quantity": 1, "LastCheckDate": null         }
    ],

    // ── 緊急應變編組 ──
    // 對應 React：取三班護理師今日排班的 EmergencyGroup 彙整（跨班別、去重姓名）
    // 順序與後台一致：通報班 → 滅火班 → 安全防護 → 救護班 → 避難引導；點班（IsCharge）列於編組之後
    // 一人可同時出現在多組（emergencyGroup 逗號分隔）
    "EmergencyGroups": [
      { "Group": "通報班",   "Members": ["陳○梅"] },
      { "Group": "滅火班",   "Members": ["蔡○柔", "王○惠"] },
      { "Group": "安全防護", "Members": ["黃○萍"] },
      { "Group": "救護班",   "Members": ["陳○梅", "鄭○雲"] },
      { "Group": "避難引導", "Members": ["吳○萱"] },
      { "Group": "點班",     "Members": ["陳○梅"] }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// React 遷移：useEffect(() => { getEvacuation(wardCode).then(setData) }, [wardCode])
// TODO 正式上線：return fetch(`/api/wards/${wardCode}/evacuation`).then(r => r.json())
async function getEvacuation(wardCode) {
  return Promise.resolve(_MOCK_EVACUATION);
}
