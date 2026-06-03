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
  document.querySelectorAll(".or-card").forEach(card => {
    if (currentFilter === "all" || card.dataset.status === "empty") {
      card.classList.remove("filtered-out");
      return;
    }
    let show = false;
    switch (currentFilter) {
      case "er":   show = card.dataset.source === "急診刀"; break;
      case "op":   show = card.dataset.source === "門診刀"; break;
      case "inp":  show = card.dataset.source === "住院刀"; break;
      case "busy": show = card.dataset.status === "in-surgery"; break;
      case "prep": show = card.dataset.status === "prep"; break;
      case "done": show = card.dataset.status === "completed"; break;
      default:     show = false; break;
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
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;

  renderStats(MOCK_DATA.Rooms);
  renderAllRooms(MOCK_DATA.Rooms);

  updateClock();
  setInterval(updateClock, 1000);

  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  document.getElementById("roomModal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

  initTabs();
});
