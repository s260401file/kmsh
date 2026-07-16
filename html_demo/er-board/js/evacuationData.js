// 避難圖 Mock 資料 — ER 版
// 左欄：後台上傳的避難圖（靜態原型顯示未上傳佔位）
// 右欄：緊急應變編組（正式版取自三班護理師今日排班的緊急編組，跨班別去重）
const EVACUATION_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "ER",
    QueryDate: "2026-06-03",
    // 固定 5 組：救護班／滅火班／安全防護／避難引導／通報班（與 React EMERGENCY_GROUPS 一致）
    EmergencyGroups: [
      { Group: "救護班",   Members: ["李○婷", "周○娟"] },
      { Group: "滅火班",   Members: ["張○惠", "許○雯"] },
      { Group: "安全防護", Members: ["蔡○芸"] },
      { Group: "避難引導", Members: ["王○琳", "陳○華"] },
      { Group: "通報班",   Members: ["黃○珠"] }
    ]
  }
};

async function getEvacuation(wardCode) {
  return Promise.resolve(EVACUATION_DATA);
}
