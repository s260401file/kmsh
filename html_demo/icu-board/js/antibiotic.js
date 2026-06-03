// ──────────────────────────────────────────────────────────────
// 抗生素 渲染邏輯
// 與 index.html 相同的平面圖佈局，床位卡一致
// 統計區換成抗生素統計，點擊床位顯示抗生素 Modal
// React 對應：<AntibioticPage /> 使用 W52Layout 巢狀路由
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// ── 床位卡片渲染（與 index.html 的 renderBedCard 一致，加上抗生素 badge）──
function renderAbxBedCard(bed) {
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2,"0")}`;
  const abxList  = getAbxByBedId(bed.id);
  const hasAbx   = abxList.length > 0;

  if (bed.status === "empty") {
    return `<div class="bed-card empty bed-${bed.id}">
      <div class="empty-bed-num">${bedLabel}</div>
      <div class="empty-label">空床</div>
    </div>`;
  }

  const p = bed.patient;
  const genderCls = p.gender === "M" ? "gender-m" : "gender-f";
  const abxBadge  = hasAbx
    ? `<span class="ab-count-badge">${abxList.length}</span>`
    : "";

  return `<div class="bed-card ${bed.status} bed-${bed.id} ${hasAbx ? 'ab-has-abx' : ''}"
       data-id="${bed.id}">
    <div class="card-row1">
      <span class="bed-num">${bedLabel}</span>
      ${abxBadge}
    </div>
    <div class="card-row2">
      <span class="patient-name ${genderCls}">${p.name}</span>
      <span class="patient-basic">${p.gender}/${p.age}</span>
    </div>
  </div>`;
}

// ── 渲染所有床位（4F / 3F）──
function renderAllAbxBeds(beds) {
  const f4 = beds.filter(b => b.floor === 4);
  const f3 = beds.filter(b => b.floor === 3);

  const grid4 = document.getElementById("ab-grid-4f");
  const grid3 = document.getElementById("ab-grid-3f");

  grid4.innerHTML = f4.map(renderAbxBedCard).join("");
  grid3.innerHTML = f3.map(renderAbxBedCard).join("");

  // 綁定點擊事件（含或不含抗生素的有病人床位都可點）
  document.querySelectorAll("#ab-grid-4f .bed-card:not(.empty), #ab-grid-3f .bed-card:not(.empty)").forEach(card => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      const id  = card.dataset.id;
      const bed = MOCK_DATA.beds.find(b => b.id === id);
      if (bed) openAbxModal(bed);
    });
  });
}

// ── 抗生素統計面板 ──
function renderAbxStats() {
  const s = getAbxStats();
  document.getElementById("ab-stat-total").textContent = s.total;
  document.getElementById("ab-stat-4f").textContent    = s.f4;
  document.getElementById("ab-stat-3f").textContent    = s.f3;
  document.getElementById("ab-stat-beds").textContent  = s.beds;
  document.getElementById("ab-stat-vanc").textContent  = s.vanc;
  document.getElementById("ab-stat-mero").textContent  = s.mero;
  document.getElementById("ab-stat-pip").textContent   = s.pip;
  document.getElementById("ab-stat-other").textContent = s.other;
}

// ── Modal 開啟 ──
function openAbxModal(bed) {
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2,"0")}`;
  const p = bed.patient;
  const abxList = getAbxByBedId(bed.id);

  document.getElementById("ab-m-bed").textContent  = bedLabel;
  document.getElementById("ab-m-name").textContent = p ? p.name : "—";
  document.getElementById("ab-m-rec").textContent  = p ? `病歷號：${p.medRecord}` : "";

  const body = document.getElementById("ab-modal-body");

  if (!abxList || abxList.length === 0) {
    body.innerHTML = `<div class="ab-modal-empty">此病人目前無抗生素使用紀錄</div>`;
  } else {
    const rows = abxList.map(ab => `
      <tr>
        <td class="ab-td-drug">${ab.drugName}</td>
        <td class="ab-td-time">${ab.startDateTime}</td>
        <td class="ab-td-time">${ab.firstDoseDateTime}</td>
        <td class="ab-td-time">${ab.endDateTime}</td>
      </tr>`).join("");

    body.innerHTML = `
      <table class="ab-table">
        <thead>
          <tr>
            <th>藥品名稱</th>
            <th>開始時間</th>
            <th>首次給藥時間</th>
            <th>結束時間</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  document.getElementById("ab-modal").classList.add("show");
}

function closeAbxModal() {
  document.getElementById("ab-modal").classList.remove("show");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", () => {
  // 填入 header 資訊
  document.getElementById("ward-director").textContent = MOCK_DATA?.hospitalInfo?.wardDirector || "王○明";
  document.getElementById("head-nurse").textContent    = MOCK_DATA?.hospitalInfo?.headNurse    || "陳○美";

  updateClock();
  setInterval(updateClock, 1000);

  // 渲染床位（使用 MOCK_DATA，同 index.html）
  renderAllAbxBeds(MOCK_DATA.beds);

  // 渲染抗生素統計
  renderAbxStats();

  // Modal 關閉事件
  document.getElementById("ab-modal-close").addEventListener("click",     closeAbxModal);
  document.getElementById("ab-modal-close-btn").addEventListener("click", closeAbxModal);
  document.getElementById("ab-modal").addEventListener("click", e => {
    if (e.target === document.getElementById("ab-modal")) closeAbxModal();
  });
});
