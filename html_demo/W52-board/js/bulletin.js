// ──────────────────────────────────────────────────────────────
// 佈告欄 渲染邏輯
// §7.1.2 (9.1) 護理站公告  (9.2) 院方公告
// React 對應：<UnitBulletinList /> + <HospBulletinList />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// 格式化日期：yyyy-MM-dd → MM/DD
function fmtDate(dateStr) {
  const parts = dateStr.split("-");
  return `${parts[1]}/${parts[2]}`;
}

// ── 單筆公告卡片 ──
// React 對應：<BulletinCard item={item} />
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

// ── (9.1) 護理站公告列表 ──
// React 對應：<UnitBulletinList items={items} />
function renderUnitBulletins(items) {
  const el = document.getElementById("unit-bulletin-list");
  document.getElementById("bl-unit-count").textContent = items.length ? `${items.length} 則` : "";

  if (!items.length) {
    el.innerHTML = `<div class="bl-empty">目前無護理站公告</div>`;
    return;
  }

  // 重要優先，同優先度依日期降序
  const sorted = [...items].sort((a, b) => {
    if (a.Priority !== b.Priority) return a.Priority === "重要" ? -1 : 1;
    return b.PostedAt.localeCompare(a.PostedAt);
  });

  el.innerHTML = sorted.map(renderBulletinCard).join("");
}

// ── (9.2) 院方公告列表 ──
// React 對應：<HospBulletinList items={items} />
function renderHospBulletins(items) {
  const el = document.getElementById("hosp-bulletin-list");
  document.getElementById("bl-hosp-count").textContent = items.length ? `${items.length} 則` : "";

  if (!items.length) {
    el.innerHTML = `<div class="bl-empty">目前無院方公告</div>`;
    return;
  }

  const sorted = [...items].sort((a, b) => {
    if (a.Priority !== b.Priority) return a.Priority === "重要" ? -1 : 1;
    return b.PostedAt.localeCompare(a.PostedAt);
  });

  el.innerHTML = sorted.map(renderBulletinCard).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getBulletins("W52");
  if (!res.Success) {
    document.getElementById("unit-bulletin-list").innerHTML = `<div class="bl-empty">資料載入失敗</div>`;
    document.getElementById("hosp-bulletin-list").innerHTML = `<div class="bl-empty">資料載入失敗</div>`;
    return;
  }

  renderUnitBulletins(res.Data.UnitBulletins);
  renderHospBulletins(res.Data.HospBulletins);
});
