// ──────────────────────────────────────────────────────────────
// 檢查 / 會診 渲染邏輯 — ICU 版
// 欄位使用 camelCase（對齊後端 GET /api/Board/ICU/exam）
// React 對應：ExamTab.jsx（左＝檢查表格、右＝會診表格）
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// 檢查排序：未執行→未排程→已排程→已完成，同狀態依轉入日升序
function sortExams(items) {
  const order = { "未執行": 0, "未排程": 1, "已排程": 2, "已完成": 3 };
  return [...items].sort((a, b) => {
    const p = (order[a.status] ?? 99) - (order[b.status] ?? 99);
    if (p !== 0) return p;
    return (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
  });
}

// 會診排序：待回覆→已回覆→進行中→待安排→取消，同狀態依完成時間新→舊
function sortConsults(items) {
  const order = { "待回覆": 0, "已回覆": 1, "進行中": 2, "待安排": 3, "取消": 4 };
  return [...items].sort((a, b) => {
    const p = (order[a.status] ?? 99) - (order[b.status] ?? 99);
    if (p !== 0) return p;
    return (b.completedTime || "").localeCompare(a.completedTime || "");
  });
}

// ── 檢查表格 ──
// React 對應：左欄 ec-card
function renderExams(items) {
  const el = document.getElementById("exam-list");
  document.getElementById("ec-exam-count").textContent = `${items.length} 筆`;

  if (!items.length) {
    el.innerHTML = `<tr class="ec-empty-row"><td colspan="7">無待執行檢查</td></tr>`;
    return;
  }

  el.innerHTML = sortExams(items).map(e => {
    const genderCls = e.gender === "M" ? "ec-gender-m" : "ec-gender-f";
    return `
      <tr>
        <td class="ec-td-bed">${e.bedId}</td>
        <td class="ec-td-name"><span class="${genderCls}">${e.patientName}</span></td>
        <td class="ec-td-item">${e.examName}</td>
        <td class="ec-td-date">${e.scheduledDate || ""}</td>
        <td class="ec-td-time">${e.timeSlot || ""}</td>
        <td class="ec-td-status"><span class="ec-status ec-status-${e.status}">${e.status}</span></td>
        <td class="ec-td-remark">${e.notes || "—"}</td>
      </tr>`;
  }).join("");
}

// ── 會診表格 ──
// React 對應：右欄 ec-card
function renderConsults(items) {
  const el = document.getElementById("consult-list");
  document.getElementById("ec-consult-count").textContent = `${items.length} 筆`;

  if (!items.length) {
    el.innerHTML = `<tr class="ec-empty-row"><td colspan="7">無待會診</td></tr>`;
    return;
  }

  el.innerHTML = sortConsults(items).map(c => {
    const genderCls = c.gender === "M" ? "ec-gender-m" : "ec-gender-f";
    return `
      <tr>
        <td class="ec-td-bed">${c.bedId}</td>
        <td class="ec-td-name"><span class="${genderCls}">${c.patientName}</span></td>
        <td class="ec-td-item">${c.consultDept}</td>
        <td class="ec-td-doctor">${c.consultDoctor}</td>
        <td class="ec-td-time">${c.completedTime || "—"}</td>
        <td class="ec-td-status"><span class="ec-status ec-status-${c.status}">${c.status}</span></td>
        <td class="ec-td-remark">${c.notes || "—"}</td>
      </tr>`;
  }).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "王○明";
  document.getElementById("head-nurse").textContent    = "陳○美";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getIcuExamConsult("ICU", "2026-06-03");
  if (!res.success) {
    document.getElementById("exam-list").innerHTML =
      `<tr class="ec-empty-row"><td colspan="7">資料載入失敗</td></tr>`;
    document.getElementById("consult-list").innerHTML =
      `<tr class="ec-empty-row"><td colspan="7">資料載入失敗</td></tr>`;
    return;
  }

  renderExams(res.data.examinations);
  renderConsults(res.data.consultations);
});
