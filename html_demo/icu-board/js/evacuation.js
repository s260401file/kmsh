// ──────────────────────────────────────────────────────────────
// 避難圖 渲染邏輯 — ICU 版（對齊 React EvacuationTab）
// 版面：左＝避難圖（此原型以 SVG 平面圖代替後台上傳影像）；
//       右＝緊急應變編組（取自三班護理師今日排班的緊急編組，此原型為靜態）。
// 緊急聯絡卡、樓層資訊、設備/圖例卡片已隨 React 移除。
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("ward-director").textContent = "王○明";
  document.getElementById("head-nurse").textContent    = "陳○美";

  updateClock();
  setInterval(updateClock, 1000);
  // 緊急應變編組為靜態 HTML；避難圖為靜態 SVG，無需再取資料。
});
