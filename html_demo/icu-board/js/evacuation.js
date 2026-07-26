// ──────────────────────────────────────────────────────────────
// 避難圖 渲染邏輯 — ICU 版（對齊 React EvacuationTab）
// 版面：左＝避難圖（此原型以 SVG 平面圖代替後台上傳影像）；
//       右＝緊急應變編組（取自三班護理師今日排班的緊急編組）。
// 緊急聯絡卡、樓層資訊、設備/圖例卡片已隨 React 移除。
// 編組彙整規則同 React：跨班別去重、一人可多組（逗號分隔）、點班取 checkIn。
// ──────────────────────────────────────────────────────────────

const UNIT = "ICU";
const EMERGENCY_GROUPS = ["通報班", "滅火班", "安全防護", "救護班", "避難引導"]; // 顯示順序（同看板）
const CHARGE = "點班"; // 點班（來源 checkIn=IsCharge），列於編組之後

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// 依三班排班彙整緊急應變編組（對齊 React EvacuationTab 的邏輯）
function buildRespRows(schedData) {
  const nurses = (schedData?.shifts ?? []).flatMap(s => s.nurses ?? []);
  const byGroup = {};
  const charge  = [];
  nurses.forEach(n => {
    if (!n.peName) return;
    String(n.emergencyGroup ?? "").split(",").forEach(g0 => {
      const g = g0.trim();
      if (!g) return;
      const a = (byGroup[g] = byGroup[g] || []);
      if (!a.includes(n.peName)) a.push(n.peName);
    });
    if (n.checkIn && !charge.includes(n.peName)) charge.push(n.peName);
  });
  return [
    ...EMERGENCY_GROUPS.map(g => ({ k: g, names: byGroup[g] || [] })),
    { k: CHARGE, names: charge }
  ];
}

function renderResp(rows) {
  const box = document.getElementById("ev-resp");
  if (!box) return;
  box.innerHTML = rows.map(row => `
    <div class="ev-resp-row">
      <span class="ev-resp-k">${row.k}</span>
      <span class="ev-resp-n">${row.names.length ? row.names.join("、") : "—"}</span>
    </div>`).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "王○明";
  document.getElementById("head-nurse").textContent    = "陳○美";

  updateClock();
  setInterval(updateClock, 1000);

  // 緊急應變編組：取三班護理師今日排班，依緊急編組彙整後渲染。
  const sched = await getIcuSchedule(UNIT);
  renderResp(buildRespRows(sched.data));
});
