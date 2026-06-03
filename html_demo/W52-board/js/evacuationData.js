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

    // ── 緊急聯絡電話 ──
    "EmergencyContacts": [
      { "ContactId": 1, "Name": "院內保全",     "Extension": "9119" },
      { "ContactId": 2, "Name": "院內急救 RRT", "Extension": "1234" },
      { "ContactId": 3, "Name": "消防隊（外線）", "Extension": "119"  }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// React 遷移：useEffect(() => { getEvacuation(wardCode).then(setData) }, [wardCode])
// TODO 正式上線：return fetch(`/api/wards/${wardCode}/evacuation`).then(r => r.json())
async function getEvacuation(wardCode) {
  return Promise.resolve(_MOCK_EVACUATION);
}
