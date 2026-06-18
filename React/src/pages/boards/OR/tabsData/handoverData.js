// handoverData：OR 手術室站「術後特殊交班」假資料（待接 API）
// 模擬後端 API 回應結構：Success/Message/Data，供 HandoverTab 表格顯示。
// 每筆交班（Items）欄位說明：
//   HandoverId 編號、RoomId 刀房、SurgerySource 來源（急診/門診/住院刀）
//   PatientName/Gender/Age/MedRecord 病患基本資料
//   SurgeryName 術式、SurgeonName 主刀醫師
//   DestWard/DestBed 術後轉往病房 / 床號、EndTime 結束時間（null 表進行中）
//   BloodLoss 出血量(mL)、BloodTransfusion 輸血量(單位)
//   DrainDetails 引流管說明、SpecialNotes 術後特殊照護注意事項
const HANDOVER_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "OR",
    QueryDate: "2026-06-03",
    Items: [
      {
        HandoverId: 1,
        RoomId: "OR-07",
        PatientName: "林○雯",
        Gender: "F",
        Age: 29,
        MedRecord: "F701234606",
        SurgeryName: "左手攣縮疤痕鬆解植皮術",
        SurgerySource: "門診刀",
        SurgeonName: "林○泰醫師",
        DestWard: "整形外科病房（W34）",
        DestBed: "W34-012",
        EndTime: "10:18",
        BloodLoss: 30,
        BloodTransfusion: 0,
        SpecialNotes: "植皮部位左手背，加壓包紮固定。術後返回病房後請勿抬高超過心臟水平以上，觀察植皮色澤及血運。",
        DrainDetails: "無引流管"
      },
      {
        HandoverId: 2,
        RoomId: "OR-03",
        PatientName: "張○強",
        Gender: "M",
        Age: 34,
        MedRecord: "C401234603",
        SurgeryName: "右股骨骨折切開復位髓內釘固定術 ORIF",
        SurgerySource: "急診刀",
        SurgeonName: "王○哲醫師",
        DestWard: "骨科病房（W52）",
        DestBed: "W52-014",
        EndTime: null,
        BloodLoss: 350,
        BloodTransfusion: 2,
        SpecialNotes: "術中輸血 2 單位（RBC），術後繼續觀察 Hb。右下肢伸直固定，禁止重量承重，48小時內監測肢端循環（色澤/溫度/脈搏）。",
        DrainDetails: "Hemovac × 1（右大腿外側）"
      },
      {
        HandoverId: 3,
        RoomId: "OR-01",
        PatientName: "王○明",
        Gender: "M",
        Age: 65,
        MedRecord: "A201234601",
        SurgeryName: "腹腔鏡膽囊切除術 LC",
        SurgerySource: "住院刀",
        SurgeonName: "黃○誠醫師",
        DestWard: "一般外科病房（W52）",
        DestBed: "W52-008",
        EndTime: null,
        BloodLoss: 20,
        BloodTransfusion: 0,
        SpecialNotes: "術中無特殊狀況，腹腔鏡操作順利，膽囊已完整取出。術後 NPO 6 小時後可開始進清流質。Trocar 傷口 4 處，注意腹部傷口是否有膽汁滲漏。",
        DrainDetails: "無引流管（膽囊床無明顯出血）"
      }
    ]
  }
}

export default HANDOVER_DATA
