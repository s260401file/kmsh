// ──────────────────────────────────────────────────────────────
// 檢查 / 會診 渲染邏輯
// §7.1.2 (5.1) 檢查、(5.2) 會診
// React 對應：<ExamTable /> + <ConsultTable />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// 日期：yyyy-MM-dd → yyyy/MM/dd
function fmtDate(s) {
  return s ? s.replace(/-/g, "/") : "";
}

// 時段 + 時間：上午 + 08:00 → "AM 08:00"
function fmtTimeSlot(slot, time) {
  const tag = slot === "上午" ? "AM" : slot === "下午" ? "PM" : slot;
  return `${tag} ${time}`;
}

// 完成時間：2026-06-03 07:45 → 2026/06/03 07:45
function fmtDateTime(s) {
  if (!s) return "—";
  return s.replace(/-/g, "/");
}

// 床號顯示（含 W52 前綴）
function fmtBed(bedNo) {
  return `W52-${bedNo}`;
}

// 檢查排序：待執行→預約→已完成，同狀態依預定時間升序
function sortExams(items) {
  const order = { "待執行": 0, "預約": 1, "已完成": 2 };
  return [...items].sort((a, b) => {
    const p = (order[a.Status] ?? 99) - (order[b.Status] ?? 99);
    if (p !== 0) return p;
    const ad = (a.ScheduledDate + a.ScheduledTime).replace(/[-:]/g, "");
    const bd = (b.ScheduledDate + b.ScheduledTime).replace(/[-:]/g, "");
    return ad.localeCompare(bd);
  });
}

// 會診排序：進行中→待安排→已完成，已完成依完成時間降序
function sortConsults(items) {
  const order = { "進行中": 0, "待安排": 1, "已完成": 2 };
  return [...items].sort((a, b) => {
    const p = (order[a.Status] ?? 99) - (order[b.Status] ?? 99);
    if (p !== 0) return p;
    return (b.CompletedAt || "").localeCompare(a.CompletedAt || "");
  });
}

// ── (5.1) 檢查表格 ──
// React 對應：<ExamTable items={items} />
function renderExams(items) {
  const el = document.getElementById("exam-list");
  document.getElementById("ec-exam-count").textContent = items.length ? `${items.length} 筆` : "";

  if (!items.length) {
    el.innerHTML = `<tr class="ec-empty-row"><td colspan="7">無檢查資料</td></tr>`;
    return;
  }

  el.innerHTML = sortExams(items).map(e => {
    const genderCls = e.Gender === "M" ? "ec-gender-m" : "ec-gender-f";
    return `
      <tr>
        <td class="ec-td-bed">${fmtBed(e.BedNo)}</td>
        <td class="ec-td-name ${genderCls}">${e.PatientName}</td>
        <td class="ec-td-item">${e.ExamName}</td>
        <td class="ec-td-date">${fmtDate(e.ScheduledDate)}</td>
        <td class="ec-td-time">${fmtTimeSlot(e.TimeSlot, e.ScheduledTime)}</td>
        <td class="ec-td-status"><span class="ec-status ec-status-${e.Status}">${e.Status}</span></td>
        <td class="ec-td-remark">${e.Remarks || "—"}</td>
      </tr>`;
  }).join("");
}

// ── (5.2) 會診表格 ──
// React 對應：<ConsultTable items={items} />
function renderConsults(items) {
  const el = document.getElementById("consult-list");
  document.getElementById("ec-consult-count").textContent = items.length ? `${items.length} 筆` : "";

  if (!items.length) {
    el.innerHTML = `<tr class="ec-empty-row"><td colspan="7">無會診資料</td></tr>`;
    return;
  }

  el.innerHTML = sortConsults(items).map(c => {
    const genderCls = c.Gender === "M" ? "ec-gender-m" : "ec-gender-f";
    return `
      <tr>
        <td class="ec-td-bed">${fmtBed(c.BedNo)}</td>
        <td class="ec-td-name ${genderCls}">${c.PatientName}</td>
        <td class="ec-td-item">${c.ConsultDept}</td>
        <td class="ec-td-doctor">${c.ConsultDoctor}</td>
        <td class="ec-td-time">${fmtDateTime(c.CompletedAt)}</td>
        <td class="ec-td-status"><span class="ec-status ec-status-${c.Status}">${c.Status}</span></td>
        <td class="ec-td-remark">${c.Remarks || "—"}</td>
      </tr>`;
  }).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getExamConsult("W52", "2026-06-03");
  if (!res.Success) {
    document.getElementById("exam-list").innerHTML =
      `<tr class="ec-empty-row"><td colspan="7">資料載入失敗</td></tr>`;
    document.getElementById("consult-list").innerHTML =
      `<tr class="ec-empty-row"><td colspan="7">資料載入失敗</td></tr>`;
    return;
  }

  renderExams(res.Data.Examinations);
  renderConsults(res.Data.Consultations);
});
