// ── Clock ──
function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// ── Filter ──
let currentFilter = "all";
function setFilter(filter) {
  if (currentFilter === filter && filter !== "all") filter = "all";
  currentFilter = filter;
  // 同步所有 data-filter 按鈕（filter bar + stats panel）
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
      case "surgery":      show = card.dataset.surgery    === "1"; break;
      case "exam":         show = card.dataset.exam       === "1"; break;
      case "consult":      show = card.dataset.consult    === "1"; break;
      case "iso":          show = card.dataset.status     === "isolation"; break;
      case "tube-port":    show = card.dataset.tubePort   === "1"; break;
      case "tube-dlvc":    show = card.dataset.tubeDlvc   === "1"; break;
      case "tube-foley":   show = card.dataset.tubeFoley  === "1"; break;
      case "tube-cvc":     show = card.dataset.tubeCvc    === "1"; break;
      case "tube-cardiac": show = card.dataset.tubeCardiac === "1"; break;
      default:             show = badges.includes(currentFilter); break;
    }
    card.classList.toggle("filtered-out", !show);
  });
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
  // 填入醫院資訊
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;

  // 渲染統計與床位
  renderStats(MOCK_DATA.Beds);
  renderAllBeds(MOCK_DATA.Beds);

  // 時鐘
  updateClock();
  setInterval(updateClock, 1000);

  // Filter bar 按鈕
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  // Modal 關閉
  document.getElementById("bedModal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

  initTabs();
});

