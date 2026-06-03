// ──────────────────────────────────────────────────────────────
// 護理交班 渲染邏輯
// §7.1.2 (11) 交班日誌摘要
// React 對應：<HandoverMetaBar /> + <HandoverList />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// ── 交班資訊橫條 ──
// React 對應：<HandoverMetaBar info={info} />
function renderMetaBar(info) {
  const fromNurses = info.FromNurses.join("、") || "—";
  const toNurses   = info.ToNurses.join("、")   || "—";

  document.getElementById("ho-shift-summary").textContent =
    `${info.FromShift} → ${info.ToShift}・${info.HandoverTime} 已交班`;

  document.getElementById("ho-meta-bar").innerHTML = `
    <div class="ho-meta-block">
      <span class="ho-meta-label">交班</span>
      <span class="ho-meta-pill ho-pill-${info.FromShift}">${info.FromShift}</span>
      <span class="ho-meta-arrow">→</span>
      <span class="ho-meta-pill ho-pill-${info.ToShift}">${info.ToShift}</span>
      <span class="ho-meta-time">${info.HandoverTime}</span>
    </div>
    <div class="ho-meta-block">
      <span class="ho-meta-label">${info.FromShift}</span>
      <span class="ho-meta-nurses">${fromNurses}</span>
    </div>
    <div class="ho-meta-block">
      <span class="ho-meta-label">${info.ToShift}</span>
      <span class="ho-meta-nurses">${toNurses}</span>
    </div>`;
}

// ── 單筆交班卡片 ──
// React 對應：<HandoverCard item={item} />
function renderHandoverCard(item) {
  const itemsHtml = item.Items.map(it =>
    `<div class="ho-item">
      <span class="ho-cat-badge ho-cat-${it.Category}">${it.Category}</span>
      <span class="ho-item-content">${it.Content}</span>
    </div>`
  ).join("");

  const genderCls = item.Gender === "M" ? "ho-gender-m" : "ho-gender-f";
  const genderText = item.Gender === "M" ? "男" : "女";

  return `
    <div class="ho-card">
      <div class="ho-priority-bar ho-bar-${item.Priority}"></div>
      <div class="ho-card-body">
        <div class="ho-card-top">
          <span class="ho-bed-label">床</span>
          <span class="ho-bed-no">${item.BedNo}</span>
          <span class="ho-patient-name ${genderCls}">${item.PatientName}</span>
          <span class="ho-basic">${genderText} / ${item.Age}</span>
          <span class="ho-priority-badge ho-pri-${item.Priority}">${item.Priority}</span>
        </div>
        <div class="ho-diagnosis">${item.Diagnosis}</div>
        <div class="ho-items">${itemsHtml}</div>
      </div>
    </div>`;
}

// ── 交班列表 ──
// React 對應：<HandoverList items={items} />
function renderHandoverList(items) {
  const el = document.getElementById("handover-list");

  if (!items.length) {
    el.innerHTML = `<div class="ho-empty">本次無待交班事項</div>`;
    return;
  }

  // 優先度排序：高 → 中 → 一般，同優先度依床號升序
  const order = { "高": 0, "中": 1, "一般": 2 };
  const sorted = [...items].sort((a, b) => {
    const p = order[a.Priority] - order[b.Priority];
    if (p !== 0) return p;
    return a.BedNo.localeCompare(b.BedNo);
  });

  el.innerHTML = sorted.map(renderHandoverCard).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getHandover("W52", "2026-06-02");
  if (!res.Success) {
    document.getElementById("handover-list").innerHTML =
      `<div class="ho-empty">資料載入失敗</div>`;
    return;
  }

  renderMetaBar(res.Data.HandoverInfo);
  renderHandoverList(res.Data.Patients);
});
