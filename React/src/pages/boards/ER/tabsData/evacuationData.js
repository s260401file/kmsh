const EVACUATION_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "ER",
    QueryDate: "2026-06-03",
    EvacPlan: {
      EvacPlanId: 1,
      FloorNo: "1F",
      WardName: "急診室",
      Description: "急診室位於 1 樓，直接面向院外。主要逃生出口為東側急救入口及西側一般出口，集合點為院門前廣場。移動困難病患由護理人員協助輪椅/推床疏散。",
      UpdatedAt: "2026-05-01",
      LastDrillDate: "2026-04-10"
    },
    Equipment: [
      { EquipmentId: 1, EquipmentName: "滅火器",   Location: "護理站旁",           Quantity: 2 },
      { EquipmentId: 2, EquipmentName: "滅火器",   Location: "急救區走廊",         Quantity: 2 },
      { EquipmentId: 3, EquipmentName: "緊急照明", Location: "全區走廊頂部",       Quantity: 6 },
      { EquipmentId: 4, EquipmentName: "安全門",   Location: "東側急救入口",       Quantity: 1 },
      { EquipmentId: 5, EquipmentName: "安全門",   Location: "西側一般出口",       Quantity: 1 },
      { EquipmentId: 6, EquipmentName: "急救推車", Location: "急救區（隨時備用）", Quantity: 2 },
      { EquipmentId: 7, EquipmentName: "氧氣鋼瓶", Location: "急救區牆側",         Quantity: 4 },
      { EquipmentId: 8, EquipmentName: "集合點",   Location: "院門前廣場",         Quantity: 1 }
    ],
    EmergencyContacts: [
      { ContactId: 1, Name: "院內保全",       Extension: "9119" },
      { ContactId: 2, Name: "院內急救 RRT",   Extension: "1199" },
      { ContactId: 3, Name: "消防隊（外線）", Extension: "119"  }
    ]
  }
}

export default EVACUATION_DATA
