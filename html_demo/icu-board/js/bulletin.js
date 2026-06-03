// ──────────────────────────────────────────────────────────────
// 佈告欄 渲染邏輯 — ICU 版
// 欄位使用 camelCase（與 ICU mockData 一致）
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
  const barClass   = item.priority === "重要" ? "bl-bar-重要"   : (item.category === "院方" ? "bl-bar-院方" : "bl-bar-一般");
  const badgeClass = item.priority === "重要" ? "bl-badge-重要" : (item.category === "院方" ? "bl-badge-院方" : "bl-badge-一般");

  return `
    <div class="bl-card">
      <div class="bl-priority-bar ${barClass}"></div>
      <div class="bl-card-body">
        <div class="bl-card-top">
          <span class="bl-badge ${badgeClass}">${item.priority}</span>
          <span class="bl-card-title">${item.title}</span>
        </div>
        <div class="bl-card-content">${item.content}</div>
        <div class="bl-card-meta">
          <span class="bl-meta-date">${fmtDate(item.postedAt)}</span>
          <span class="bl-meta-author">${item.postedBy}</span>
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

  const sorted = [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "重要" ? -1 : 1;
    return b.postedAt.localeCompare(a.postedAt);
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
    if (a.priority !== b.priority) return a.priority === "重要" ? -1 : 1;
    return b.postedAt.localeCompare(a.postedAt);
  });

  el.innerHTML = sorted.map(renderBulletinCard).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "王○明";
  document.getElementById("head-nurse").textContent    = "陳○美";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getIcuBulletins("ICU");
  if (!res.success) {
    document.getElementById("unit-bulletin-list").innerHTML = `<div class="bl-empty">資料載入失敗</div>`;
    document.getElementById("hosp-bulletin-list").innerHTML = `<div class="bl-empty">資料載入失敗</div>`;
    return;
  }

  renderUnitBulletins(res.data.unitBulletins);
  renderHospBulletins(res.data.hospBulletins);
});
