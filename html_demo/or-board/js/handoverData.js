// ──────────────────────────────────────────────────────────────
// 特殊交班 Mock 資料 — OR 版
// 規格 §7.1.2.3 (3)：病人術後轉至其他病房，由手術醫師填寫特殊交班事項
// 欄位（PascalCase）：
//   Items[]: HandoverId, RoomId, PatientName, Gender, Age, MedRecord,
//            SurgeryName, SurgerySource, SurgeonName,
//            DestWard（轉出病房）, DestBed（預定床位）,
//            EndTime（手術完成時間）,
//            BloodLoss（術中失血量 mL）, BloodTransfusion（輸血量）,
//            SpecialNotes（特殊交班事項）, DrainDetails（引流管）
//
// TODO 正式上線：return fetch(`/api/or/handover?date=${date}`).then(r => r.json())
// ──────────────────────────────────────────────────────────────

const HANDOVER_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "OR",
    QueryDate: "2026-06-03",
    Items: [
      {
        HandoverId: 1,
        RoomId: "OR-06",
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
};

async function getHandover(wardCode, date) {
  return Promise.resolve(HANDOVER_DATA);
}
