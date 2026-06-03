// ──────────────────────────────────────────────────────────────
// 手術資訊 Mock 資料 — ICU 版
// 欄位（camelCase，延續 ICU 規範）：
//   items[]: surgeryId, date, orRoom, scheduledTime, bedId,
//            patientName, gender, age, procedure, diagnosis,
//            anesthesiaMethod, attendingSurgeon, status
//
// 資料橫跨 2026-06-01 到 2026-06-07（前後 3 日共 7 天）
// status: "待手術" | "手術中" | "已完成" | "取消"
//
// TODO 正式上線：return fetch(`/api/wards/ICU/surgery-info?date=${date}`).then(r => r.json())
// ──────────────────────────────────────────────────────────────

const _MOCK_ICU_SURGERY = {
  success: true,
  message: "",
  data: {
    wardCode: "ICU",
    queryDate: "2026-06-03",
    items: [
      // ── 2026-06-01 ──
      {
        surgeryId: 1,
        date: "2026-06-01",
        orRoom: "OR-01",
        scheduledTime: "08:00",
        bedId: "F4-09",
        patientName: "吳○志",
        gender: "M",
        age: 54,
        procedure: "主動脈瓣置換術（AVR）",
        diagnosis: "主動脈瓣狹窄",
        anesthesiaMethod: "全身麻醉",
        attendingSurgeon: "明○醫師",
        status: "已完成"
      },
      {
        surgeryId: 2,
        date: "2026-06-01",
        orRoom: "OR-02",
        scheduledTime: "14:00",
        bedId: "F3-05",
        patientName: "黎○達",
        gender: "M",
        age: 68,
        procedure: "主動脈剝離修補術（TEVAR）",
        diagnosis: "B型主動脈剝離",
        anesthesiaMethod: "全身麻醉",
        attendingSurgeon: "周○醫師",
        status: "已完成"
      },
      // ── 2026-06-02 ──
      {
        surgeryId: 3,
        date: "2026-06-02",
        orRoom: "OR-03",
        scheduledTime: "09:00",
        bedId: "F4-07",
        patientName: "陳○祥",
        gender: "M",
        age: 71,
        procedure: "清創術（Debridement）",
        diagnosis: "壞死性筋膜炎",
        anesthesiaMethod: "全身麻醉",
        attendingSurgeon: "蘇○醫師",
        status: "已完成"
      },
      // ── 2026-06-03 (今日) ──
      {
        surgeryId: 4,
        date: "2026-06-03",
        orRoom: "OR-01",
        scheduledTime: "08:30",
        bedId: "F4-20",
        patientName: "黃○妹",
        gender: "F",
        age: 84,
        procedure: "臨時性心律調節器置入（Temporary Pacemaker）",
        diagnosis: "急性心衰竭合併心搏過緩",
        anesthesiaMethod: "局部麻醉",
        attendingSurgeon: "弘○醫師",
        status: "已完成"
      },
      {
        surgeryId: 5,
        date: "2026-06-03",
        orRoom: "OR-02",
        scheduledTime: "11:00",
        bedId: "F4-05",
        patientName: "黃○雄",
        gender: "M",
        age: 80,
        procedure: "腦室外引流（EVD）",
        diagnosis: "顱內出血",
        anesthesiaMethod: "全身麻醉",
        attendingSurgeon: "洪○醫師",
        status: "手術中"
      },
      {
        surgeryId: 6,
        date: "2026-06-03",
        orRoom: "OR-01",
        scheduledTime: "14:30",
        bedId: "F4-01",
        patientName: "林○志",
        gender: "M",
        age: 72,
        procedure: "氣管切開術（Tracheotomy）",
        diagnosis: "敗血性休克合併肺炎",
        anesthesiaMethod: "全身麻醉",
        attendingSurgeon: "蘇○醫師",
        status: "待手術"
      },
      // ── 2026-06-04 ──
      {
        surgeryId: 7,
        date: "2026-06-04",
        orRoom: "OR-02",
        scheduledTime: "09:00",
        bedId: "F4-02",
        patientName: "張○芬",
        gender: "F",
        age: 65,
        procedure: "胸骨傷口清創（Sternal Debridement）",
        diagnosis: "CABG 術後傷口感染",
        anesthesiaMethod: "全身麻醉",
        attendingSurgeon: "李○醫師",
        status: "待手術"
      },
      // ── 2026-06-05 ──
      {
        surgeryId: 8,
        date: "2026-06-05",
        orRoom: "OR-03",
        scheduledTime: "10:00",
        bedId: "F3-02",
        patientName: "林○財",
        gender: "M",
        age: 66,
        procedure: "永久性血液透析管路置入（AV Fistula）",
        diagnosis: "敗血性休克合併急性腎衰竭",
        anesthesiaMethod: "局部麻醉",
        attendingSurgeon: "弘○醫師",
        status: "待手術"
      },
      // ── 2026-06-07 ──
      {
        surgeryId: 9,
        date: "2026-06-07",
        orRoom: "OR-01",
        scheduledTime: "08:00",
        bedId: "F4-11",
        patientName: "羅○平",
        gender: "M",
        age: 76,
        procedure: "上消化道內視鏡止血術（EGD + Hemostasis）",
        diagnosis: "上消化道出血",
        anesthesiaMethod: "全身麻醉",
        attendingSurgeon: "李○醫師",
        status: "待手術"
      }
    ]
  }
};

// ── API 模擬函式 ──────────────────────────────────────────────
// React 遷移：useEffect(() => { getIcuSurgery(wardCode, date).then(setData) }, [wardCode, date])
// TODO 正式上線：return fetch(`/api/wards/ICU/surgery-info?date=${date}`).then(r => r.json())
async function getIcuSurgery(wardCode, date) {
  return Promise.resolve(_MOCK_ICU_SURGERY);
}
