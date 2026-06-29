// ── Clock ──
function updateClock() {
  const now = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const d = now;
  const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} (${days[d.getDay()]})`;
  const timeStr = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// ── Filter ──
let currentFilter = "all";
function setFilter(filter) {
  // 再次點擊同一過濾器 → 切回全部
  if (currentFilter === filter && filter !== "all") filter = "all";
  currentFilter = filter;
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  applyFilter();
}
function applyFilter() {
  document.querySelectorAll(".bed-card").forEach(card => {
    if (currentFilter === "all" || card.dataset.status === "empty") {
      card.classList.remove("filtered-out");
      return;
    }
    const badges = JSON.parse(card.dataset.badges || "[]");
    let show = false;
    switch (currentFilter) {
      case "surgery":    show = card.dataset.surgery    === "1"; break;
      case "exam":       show = card.dataset.exam       === "1"; break;
      case "consult":    show = card.dataset.consult    === "1"; break;
      case "cond-a":     show = card.dataset.cond       === "穩定"; break;
      case "cond-b":     show = card.dataset.cond       === "重症"; break;
      case "cond-c":     show = card.dataset.cond       === "危急"; break;
      case "iso":        show = card.dataset.status     === "isolation"; break;
      case "tube-ett":   show = card.dataset.tubeEtt   === "1"; break;
      case "tube-ng":    show = card.dataset.tubeNg    === "1"; break;
      case "tube-foley": show = card.dataset.tubeFoley === "1"; break;
      case "tube-cvc":   show = card.dataset.tubeCvc   === "1"; break;
      default:           show = badges.includes(currentFilter); break;
    }
    card.classList.toggle("filtered-out", !show);
  });
}

// ── Floor switch（4F ↔ 3F；對齊 React 單樓層檢視）──
let currentFloor = 4;
function switchFloor() {
  currentFloor = currentFloor === 4 ? 3 : 4;
  currentFilter = "all";                 // 切樓層重置篩選
  renderFloor(currentFloor);
  // 重置篩選列 active 狀態
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === "all");
  });
  applyFilter();
}

// ── Tabs ──
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  // Populate hospital info
  document.getElementById("ward-director").textContent = MOCK_DATA.hospitalInfo.wardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.hospitalInfo.headNurse;

  // Render（預設顯示 4F）
  renderFloor(currentFloor);
  renderLegendShapes();

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // 樓層切換
  document.getElementById("floor-toggle").addEventListener("click", switchFloor);

  // Filter buttons (全部 + 16 badge filters)
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  // Modal close
  document.getElementById("bedModal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

  initTabs();
});
