const EVACUATION_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "OR",
    QueryDate: "2026-06-03",
    EvacPlan: {
      EvacPlanId: 1,
      FloorNo: "5F",
      WardName: "手術室（OR-01～03、OR-05～08）",
      Description: "手術室位於 5 樓，共設 7 間刀房。主要逃生出口為東西兩側防火門通往樓梯間，集合點為 1F 停車場入口廣場。術中病患由麻醉科與護理人員協助推床疏散。",
      UpdatedAt: "2026-05-01",
      LastDrillDate: "2026-04-15"
    },
    Equipment: [
      { EquipmentId: 1,  EquipmentName: "滅火器",      Location: "OR 走廊中段（東）",  Quantity: 2 },
      { EquipmentId: 2,  EquipmentName: "滅火器",      Location: "OR 走廊中段（西）",  Quantity: 2 },
      { EquipmentId: 3,  EquipmentName: "滅火器",      Location: "恢復室（PACU）",     Quantity: 1 },
      { EquipmentId: 4,  EquipmentName: "緊急照明",    Location: "全區走廊頂部",       Quantity: 8 },
      { EquipmentId: 5,  EquipmentName: "安全門",      Location: "東側樓梯間",         Quantity: 1 },
      { EquipmentId: 6,  EquipmentName: "安全門",      Location: "西側樓梯間",         Quantity: 1 },
      { EquipmentId: 7,  EquipmentName: "氧氣切換閥",  Location: "護理站後方",         Quantity: 1 },
      { EquipmentId: 8,  EquipmentName: "緊急推床",    Location: "走廊備用區",         Quantity: 3 },
      { EquipmentId: 9,  EquipmentName: "醫療緊急包",  Location: "護理站",             Quantity: 1 },
      { EquipmentId: 10, EquipmentName: "集合點",      Location: "1F 停車場入口廣場",  Quantity: 1 }
    ],
    EmergencyContacts: [
      { ContactId: 1, Name: "院內保全",       Extension: "9119" },
      { ContactId: 2, Name: "院內急救 RRT",   Extension: "1234" },
      { ContactId: 3, Name: "消防隊（外線）", Extension: "119"  }
    ]
  }
}

export default EVACUATION_DATA
