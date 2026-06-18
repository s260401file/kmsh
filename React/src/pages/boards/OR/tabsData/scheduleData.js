// scheduleData：OR 手術室站「手術排程 / 派班」假資料（待接 API）
// 模擬後端 API 回應結構：Success/Message/Data，供 ScheduleTab 顯示。
// Shifts 為三班（白班/小夜/大夜）陣列，每班欄位說明：
//   ShiftType 班別、ShiftTime 時段
//   Charge 值班護理長（Name 姓名、Extension 分機）
//   Anesthesia 麻醉科人員：StaffId/Name/Role 職稱/Extension
//   CircTech 體外循環技師（null 表該班無）
//   Rooms 各刀房派班：RoomId 刀房、ScrubNurse 刷手護理師、CircNurse 流動護理師、Extension 分機
//                     （ScrubNurse/CircNurse 為 null 表該班該房未派班）
const SCHEDULE_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "OR",
    QueryDate: "2026-06-03",
    Shifts: [
      {
        ShiftType: "白班",
        ShiftTime: "08:00–16:00",
        Charge: { Name: "陳○雅護理長", Extension: "5510" },
        Anesthesia: [
          { StaffId: 1, Name: "劉○欣 醫師", Role: "主治麻醉科醫師", Extension: "5520" },
          { StaffId: 2, Name: "林○恩 住院醫師", Role: "住院醫師（R2）", Extension: "5521" },
          { StaffId: 3, Name: "許○明 住院醫師", Role: "住院醫師（R1）", Extension: "5522" }
        ],
        CircTech: { Name: "蔡○中 技師", Role: "體外循環技師", Extension: "5530" },
        Rooms: [
          { RoomId: "OR-01", ScrubNurse: "張○惠護理師", CircNurse: "李○婷護理師", Extension: "5501" },
          { RoomId: "OR-02", ScrubNurse: "周○娟護理師", CircNurse: "王○珊護理師", Extension: "5502" },
          { RoomId: "OR-03", ScrubNurse: "張○惠護理師", CircNurse: "吳○華護理師", Extension: "5503" },
          { RoomId: "OR-05", ScrubNurse: "周○娟護理師", CircNurse: "張○惠護理師", Extension: "5504" },
          { RoomId: "OR-06", ScrubNurse: "李○婷護理師", CircNurse: "周○娟護理師", Extension: "5505" },
          { RoomId: "OR-07", ScrubNurse: "王○珊護理師", CircNurse: "李○婷護理師", Extension: "5506" },
          { RoomId: "OR-08", ScrubNurse: "張○惠護理師", CircNurse: "周○娟護理師", Extension: "5507" }
        ]
      },
      {
        ShiftType: "小夜",
        ShiftTime: "16:00–24:00",
        Charge: { Name: "陳○雅護理長", Extension: "5510" },
        Anesthesia: [
          { StaffId: 4, Name: "蔡○婷 醫師", Role: "值班麻醉科醫師", Extension: "5523" },
          { StaffId: 5, Name: "謝○凱 住院醫師", Role: "住院醫師（R2）", Extension: "5524" }
        ],
        CircTech: null,
        Rooms: [
          { RoomId: "OR-01", ScrubNurse: "陳○儀護理師", CircNurse: "黃○芸護理師", Extension: "5501" },
          { RoomId: "OR-02", ScrubNurse: "蔡○穎護理師", CircNurse: "陳○儀護理師", Extension: "5502" },
          { RoomId: "OR-03", ScrubNurse: "黃○芸護理師", CircNurse: "蔡○穎護理師", Extension: "5503" },
          { RoomId: "OR-05", ScrubNurse: "陳○儀護理師", CircNurse: "黃○芸護理師", Extension: "5504" },
          { RoomId: "OR-06", ScrubNurse: "蔡○穎護理師", CircNurse: "陳○儀護理師", Extension: "5505" },
          { RoomId: "OR-07", ScrubNurse: null, CircNurse: null, Extension: "5506" },
          { RoomId: "OR-08", ScrubNurse: null, CircNurse: null, Extension: "5507" }
        ]
      },
      {
        ShiftType: "大夜",
        ShiftTime: "00:00–08:00",
        Charge: { Name: "陳○雅護理長", Extension: "5510" },
        Anesthesia: [
          { StaffId: 6, Name: "洪○安 醫師", Role: "值班麻醉科醫師（On-call）", Extension: "5525" }
        ],
        CircTech: null,
        Rooms: [
          { RoomId: "OR-01", ScrubNurse: "林○心護理師", CircNurse: "方○婷護理師", Extension: "5501" },
          { RoomId: "OR-02", ScrubNurse: "方○婷護理師", CircNurse: "林○心護理師", Extension: "5502" },
          { RoomId: "OR-03", ScrubNurse: "林○心護理師", CircNurse: "方○婷護理師", Extension: "5503" },
          { RoomId: "OR-05", ScrubNurse: null, CircNurse: null, Extension: "5504" },
          { RoomId: "OR-06", ScrubNurse: null, CircNurse: null, Extension: "5505" },
          { RoomId: "OR-07", ScrubNurse: null, CircNurse: null, Extension: "5506" },
          { RoomId: "OR-08", ScrubNurse: null, CircNurse: null, Extension: "5507" }
        ]
      }
    ]
  }
}

export default SCHEDULE_DATA
