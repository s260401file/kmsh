// ──────────────────────────────────────────────────────────────
// 避難圖 渲染邏輯
// §7.1.2 (10) 護理站避難圖顯示
// React 對應：<EvacPlanView /> + <EquipmentList /> + <EmergencyContacts />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// 設備清單、圖例、樓層資訊、緊急聯絡卡片已移除；平面圖本身仍保留。

// ── 緊急應變編組（右欄卡片）──
// React 對應：EMERGENCY_GROUPS.map(g => <div className="ev-resp-row">…</div>)
// 班別（左）+ 指派人員（右，多人以「、」串接，無人顯示「—」）
function renderEmergencyGroups(groups) {
  const el = document.getElementById("ev-resp");

  el.innerHTML = groups.map(g => `
    <div class="ev-resp-row">
      <span class="ev-resp-k">${g.Group}</span>
      <span class="ev-resp-n">${g.Members && g.Members.length ? g.Members.join("、") : "—"}</span>
    </div>`
  ).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getEvacuation("W52");
  if (!res.Success) {
    document.getElementById("ev-resp").innerHTML =
      `<div style="padding:24px;text-align:center;color:var(--text-muted);">資料載入失敗</div>`;
    return;
  }

  renderEmergencyGroups(res.Data.EmergencyGroups);
});
