// ──────────────────────────────────────────────────────────────
// 排班資訊 渲染邏輯
// §7.1.2 (7.1)(7.2)(7.3)
// React 對應：<NurseTable /> + <SpecialistTable /> + <ResidentTable />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

function getCurrentShift() {
  const h = new Date().getHours();
  if (h >= 8  && h < 16) return "白班";
  if (h >= 16 && h < 24) return "小夜";
  return "大夜";
}

// ── (7.1) 護理人員表格 ──
// React 對應：<NurseTable nurses={nurses} />
function renderNurses(nurses) {
  const el = document.getElementById("nurse-list");
  document.getElementById("sc-nurse-count").textContent = nurses.length ? `${nurses.length} 人` : "";

  if (!nurses.length) {
    el.innerHTML = `<tr class="sc-empty-row"><td colspan="6">本班無護理人員排班</td></tr>`;
    return;
  }

  el.innerHTML = nurses.map(n => {
    const beds = n.BedNos.length
      ? n.BedNos.map(b => `<span class="sc-bed-tag">${b}</span>`).join("")
      : `<span class="sc-beds-none">—</span>`;

    const group = n.EmergencyGroup
      ? `<span class="sc-group-badge sc-group-${n.EmergencyGroup}">${n.EmergencyGroup === "指揮" ? "指揮" : n.EmergencyGroup + "組"}</span>`
      : `<span class="sc-group-none">—</span>`;

    const checkin = n.CheckIn
      ? `<span class="sc-checkin-yes">✓</span>`
      : `<span class="sc-checkin-no">—</span>`;

    return `
      <tr>
        <td class="sc-td-role">${n.Role}</td>
        <td>${n.PeName}</td>
        <td class="sc-td-ext">${n.Extension}</td>
        <td><div class="sc-beds">${beds}</div></td>
        <td>${group}</td>
        <td class="sc-td-checkin">${checkin}</td>
      </tr>`;
  }).join("");
}

// ── (7.2) 專師表格 ──
// React 對應：<SpecialistTable specialists={specialists} />
function renderSpecialists(specialists) {
  const el = document.getElementById("specialist-list");
  document.getElementById("sc-spec-count").textContent = specialists.length ? `${specialists.length} 人` : "";

  if (!specialists.length) {
    el.innerHTML = `<tr class="sc-empty-row"><td colspan="3">本班無專師排班</td></tr>`;
    return;
  }

  el.innerHTML = specialists.map(s => `
    <tr>
      <td>${s.PeName}</td>
      <td style="color:var(--text-muted);font-size:15px;">${s.Specialty}</td>
      <td class="sc-td-ext">${s.Extension}</td>
    </tr>`
  ).join("");
}

// ── (7.3) 住院醫師表格 ──
// React 對應：<ResidentTable residents={residents} />
function renderResidents(residents) {
  const el = document.getElementById("resident-list");
  document.getElementById("sc-res-count").textContent = residents.length ? `${residents.length} 人` : "";

  if (!residents.length) {
    el.innerHTML = `<tr class="sc-empty-row"><td colspan="3">本班無住院醫師排班</td></tr>`;
    return;
  }

  el.innerHTML = residents.map(r => `
    <tr>
      <td>${r.PeName}</td>
      <td style="color:var(--text-muted);font-size:15px;">${r.Department}</td>
      <td class="sc-td-ext">${r.Extension}</td>
    </tr>`
  ).join("");
}

// ── 班別切換列 ──
function renderShiftBar(shifts, activeShiftType) {
  const currentShift = getCurrentShift();
  const bar = document.getElementById("sc-shift-bar");

  bar.innerHTML = shifts.map(s => {
    const isCurrent = s.ShiftType === currentShift;
    const isActive  = s.ShiftType === activeShiftType;
    let cls = "sc-shift-btn";
    if (isCurrent) cls += " is-current";
    if (isActive)  cls += " active";

    return `
      <button class="${cls}" data-shift="${s.ShiftType}">
        ${s.ShiftType}
        <span class="sc-shift-time">${s.ShiftTime}</span>
      </button>`;
  }).join("");

  bar.querySelectorAll(".sc-shift-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const shiftType = btn.dataset.shift;
      const shiftData = shifts.find(s => s.ShiftType === shiftType);
      if (!shiftData) return;
      renderShiftBar(shifts, shiftType);
      renderShiftContent(shiftData);
    });
  });
}

function renderShiftContent(shiftData) {
  renderNurses(shiftData.Nurses);
  renderSpecialists(shiftData.Specialists);
  renderResidents(shiftData.Residents);
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getSchedule("W52", "2026-06-02");
  if (!res.Success || !res.Data.Shifts.length) {
    ["nurse-list","specialist-list","resident-list"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<tr class="sc-empty-row"><td colspan="6">資料載入失敗</td></tr>`;
    });
    return;
  }

  const shifts      = res.Data.Shifts;
  const currentType = getCurrentShift();
  const initShift   = shifts.find(s => s.ShiftType === currentType) || shifts[0];

  renderShiftBar(shifts, initShift.ShiftType);
  renderShiftContent(initShift);
});
