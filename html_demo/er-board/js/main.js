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
      case "critical":   show = parseInt(card.dataset.triage || "0") <= 2; break;
      case "moderate":   show = parseInt(card.dataset.triage || "0") >= 3; break;
      case "obs":        show = card.dataset.observation === "1"; break;
      case "transfer":   show = card.dataset.transfer === "1"; break;
      case "await-gen":  show = card.dataset.awaitingType === "一般"; break;
      case "await-icu":  show = card.dataset.awaitingType === "加護"; break;
      case "await-iso":  show = card.dataset.awaitingType === "隔離"; break;
      default:           show = badges.includes(currentFilter); break;
    }
    card.classList.toggle("filtered-out", !show);
  });
}

// ── Tabs ──
function initTabs() {
  const mainContent   = document.querySelector(".main-content");
  const phonePanel    = document.getElementById("phone-panel");
  const schedulePanel = document.getElementById("schedule-panel");
  const filterBar     = document.querySelector(".filter-bar");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const label      = btn.textContent.trim();
      const isPhone    = label === "連絡電話";
      const isSchedule = label === "排班資訊";
      const showMain   = !isPhone && !isSchedule;

      mainContent.style.display  = showMain ? "" : "none";
      filterBar.style.display    = showMain ? "" : "none";
      phonePanel.classList.toggle("show",    isPhone);
      schedulePanel.classList.toggle("show", isSchedule);
    });
  });
}

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;

  renderStats(MOCK_DATA.Beds);
  renderAllBeds(MOCK_DATA.Beds);
  initContactPanel();
  initSchedulePanel();

  updateClock();
  setInterval(updateClock, 1000);

  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  document.getElementById("bedModal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

  initTabs();
});
