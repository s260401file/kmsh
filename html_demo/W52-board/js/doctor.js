// ──────────────────────────────────────────────────────────────
// 醫師資訊 渲染邏輯
// §7.1.2 (8.1) 負責床位、(8.2) 查房時間表
// React 對應：<DoctorBedTable /> + <RoundScheduleTable />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// yyyyMMdd → { display: "06/02", day: "(二)", isToday: bool }
function parseRoundDate(yyyyMMdd) {
  const days = ["日","一","二","三","四","五","六"];
  const y = yyyyMMdd.slice(0, 4);
  const m = yyyyMMdd.slice(4, 6);
  const d = yyyyMMdd.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}`);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return {
    display: `${m}/${d}`,
    day: `(${days[date.getDay()]})`,
    isToday
  };
}

// ── (8.1) 醫師/專師負責床位 ──
// React 對應：<DoctorBedTable doctors={doctors} />
function renderDoctorBeds(doctors) {
  const el = document.getElementById("doctor-bed-list");
  document.getElementById("dr-bed-count").textContent = doctors.length ? `${doctors.length} 人` : "";

  if (!doctors.length) {
    el.innerHTML = `<tr class="dr-empty-row"><td colspan="5">無醫師床位資料</td></tr>`;
    return;
  }

  el.innerHTML = doctors.map(d => {
    const beds = d.BedNos.length
      ? d.BedNos.map(b => `<span class="dr-bed-tag">${b}</span>`).join("")
      : `<span class="dr-beds-none">—</span>`;

    const roleKey = d.Role.replace(/\s/g, "");
    const roleBadge = `<span class="dr-role-badge dr-role-${roleKey}">${d.Role}</span>`;

    return `
      <tr>
        <td>${d.DoctorName}</td>
        <td>${roleBadge}</td>
        <td class="dr-td-specialty">${d.Specialty}</td>
        <td class="dr-td-ext">${d.Ext}</td>
        <td><div class="dr-beds">${beds}</div></td>
      </tr>`;
  }).join("");
}

// ── (8.2) 查房時間表 ──
// React 對應：<RoundScheduleTable rounds={rounds} />
function renderRoundSchedule(rounds) {
  const el = document.getElementById("round-list");

  if (!rounds.length) {
    el.innerHTML = `<tr class="dr-empty-row"><td colspan="5">無查房時間表資料</td></tr>`;
    return;
  }

  // 依日期升序排序，已完成排後方
  const sorted = [...rounds].sort((a, b) => {
    if (a.RoundDate !== b.RoundDate) return a.RoundDate.localeCompare(b.RoundDate);
    const aMin = a.EstimatedTime.replace(":", "");
    const bMin = b.EstimatedTime.replace(":", "");
    return aMin - bMin;
  });

  // 依日期分組插入分隔列
  let lastDate = null;
  const rows = [];

  sorted.forEach(r => {
    const { display, day, isToday } = parseRoundDate(r.RoundDate);

    if (r.RoundDate !== lastDate) {
      const label = isToday ? `${display} ${day} 今日` : `${display} ${day}`;
      rows.push(`<tr class="dr-date-sep"><td colspan="5">${label}</td></tr>`);
      lastDate = r.RoundDate;
    }

    const timeDisplay = r.ActualTime
      ? `${r.EstimatedTime}<span class="dr-actual-time">實 ${r.ActualTime}</span>`
      : r.EstimatedTime;

    const status = r.IsCompleted
      ? `<span class="dr-status-done">✓</span>`
      : `<span class="dr-status-pending">待查房</span>`;

    const rowCls = r.IsCompleted ? "dr-row-done" : "";

    rows.push(`
      <tr class="${rowCls}">
        <td class="dr-td-date">
          <span class="dr-date-main${isToday ? " dr-date-today-text" : ""}">${display}</span>
          <span class="dr-date-day">${day}</span>
        </td>
        <td>${r.DoctorName}</td>
        <td class="dr-td-specialty">${r.Specialty}</td>
        <td class="dr-td-time">${timeDisplay}</td>
        <td class="dr-td-status">${status}</td>
      </tr>`);
  });

  el.innerHTML = rows.join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getDoctorInfo("W52", "2026-06-02");
  if (!res.Success) {
    document.getElementById("doctor-bed-list").innerHTML =
      `<tr class="dr-empty-row"><td colspan="5">資料載入失敗</td></tr>`;
    document.getElementById("round-list").innerHTML =
      `<tr class="dr-empty-row"><td colspan="5">資料載入失敗</td></tr>`;
    return;
  }

  renderDoctorBeds(res.Data.DoctorBeds);
  renderRoundSchedule(res.Data.RoundSchedule);
});
