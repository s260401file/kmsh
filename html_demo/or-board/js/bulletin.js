// 佈告欄 渲染邏輯 — OR 版（對齊 ICU bulletin.js 結構，PascalCase 欄位）

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  document.getElementById("clock-date").textContent =
    `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  document.getElementById("clock-time").textContent =
    `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
}

function fmtDate(dateStr) {
  const parts = dateStr.split("-");
  return `${parts[1]}/${parts[2]}`;
}

function renderBulletinCard(item) {
  const barClass   = item.Priority === "重要" ? "bl-bar-重要"   : (item.Category === "院方" ? "bl-bar-院方" : "bl-bar-一般");
  const badgeClass = item.Priority === "重要" ? "bl-badge-重要" : (item.Category === "院方" ? "bl-badge-院方" : "bl-badge-一般");
  return `
    <div class="bl-card">
      <div class="bl-priority-bar ${barClass}"></div>
      <div class="bl-card-body">
        <div class="bl-card-top">
          <span class="bl-badge ${badgeClass}">${item.Priority}</span>
          <span class="bl-card-title">${item.Title}</span>
        </div>
        <div class="bl-card-content">${item.Content}</div>
        <div class="bl-card-meta">
          <span class="bl-meta-date">${fmtDate(item.PostedAt)}</span>
          <span class="bl-meta-author">${item.PostedBy}</span>
        </div>
      </div>
    </div>`;
}

function renderList(items, listId, countId, emptyMsg) {
  const el = document.getElementById(listId);
  document.getElementById(countId).textContent = items.length ? `${items.length} 則` : "";
  if (!items.length) { el.innerHTML = `<div class="bl-empty">${emptyMsg}</div>`; return; }
  const sorted = [...items].sort((a, b) => {
    if (a.Priority !== b.Priority) return a.Priority === "重要" ? -1 : 1;
    return b.PostedAt.localeCompare(a.PostedAt);
  });
  el.innerHTML = sorted.map(renderBulletinCard).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;
  updateClock();
  setInterval(updateClock, 1000);

  const res = await getBulletins("OR");
  if (!res.Success) {
    document.getElementById("unit-bulletin-list").innerHTML = `<div class="bl-empty">資料載入失敗</div>`;
    document.getElementById("hosp-bulletin-list").innerHTML = `<div class="bl-empty">資料載入失敗</div>`;
    return;
  }
  renderList(res.Data.UnitBulletins, "unit-bulletin-list", "bl-unit-count", "目前無手術室公告");
  renderList(res.Data.HospBulletins, "hosp-bulletin-list", "bl-hosp-count", "目前無院方公告");
});
