// ──────────────────────────────────────────────────────────────
// 管路狀態 渲染邏輯
// 使用 MOCK_DATA.beds，過濾有病人的床，顯示管路使用狀態
// React 對應：<TubeTable />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// 床號格式：id 已是 F4-01 格式，直接顯示
function fmtBed(id) {
  return id;
}

// 管路格標
function tubeCell(val) {
  return val
    ? `<span class="tb-check">✓</span>`
    : `<span class="tb-none">—</span>`;
}

// ── 表格渲染 ──
// React 對應：<TubeTable beds={beds} />
function renderTubeList(beds) {
  const activeBeds = beds.filter(b => b.patient !== null);
  const el = document.getElementById("tube-list");

  if (!activeBeds.length) {
    el.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);font-size:18px;">目前無住院病人</td></tr>`;
    return;
  }

  el.innerHTML = activeBeds.map(b => {
    const p = b.patient;
    return `
      <tr>
        <td class="tb-td-bed">${fmtBed(b.id)}</td>
        <td class="tb-td-name">${p.name}</td>
        <td>${tubeCell(p.ventilator)}</td>
        <td>${tubeCell(p.ng)}</td>
        <td>${tubeCell(p.foley)}</td>
        <td>${tubeCell(p.cvc)}</td>
        <td>${tubeCell(p.crrt)}</td>
      </tr>`;
  }).join("");

  // 統計
  const stats = document.getElementById("tb-stats");
  const ett   = activeBeds.filter(b => b.patient.ventilator).length;
  const ng    = activeBeds.filter(b => b.patient.ng).length;
  const foley = activeBeds.filter(b => b.patient.foley).length;
  const cvc   = activeBeds.filter(b => b.patient.cvc).length;
  const crrt  = activeBeds.filter(b => b.patient.crrt).length;

  stats.innerHTML = `
    <div class="tb-stat-item tb-stat-ett">
      <span class="tb-stat-label">呼吸器 (ETT)</span>
      <span class="tb-stat-value">${ett}</span>
    </div>
    <div class="tb-stat-item tb-stat-ng">
      <span class="tb-stat-label">鼻胃管 (NG)</span>
      <span class="tb-stat-value">${ng}</span>
    </div>
    <div class="tb-stat-item tb-stat-foley">
      <span class="tb-stat-label">導尿管 (Foley)</span>
      <span class="tb-stat-value">${foley}</span>
    </div>
    <div class="tb-stat-item tb-stat-cvc">
      <span class="tb-stat-label">中心靜脈 (CVC)</span>
      <span class="tb-stat-value">${cvc}</span>
    </div>
    <div class="tb-stat-item tb-stat-crrt">
      <span class="tb-stat-label">CRRT</span>
      <span class="tb-stat-value">${crrt}</span>
    </div>`;
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.hospitalInfo.wardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.hospitalInfo.headNurse;

  updateClock();
  setInterval(updateClock, 1000);

  renderTubeList(MOCK_DATA.beds);
});
