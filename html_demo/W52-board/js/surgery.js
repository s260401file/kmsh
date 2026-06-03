// ──────────────────────────────────────────────────────────────
// 手術資訊 渲染邏輯
// §7.1.2 (4.1) 當日手術 — 表格列顯示（與檢查／會診一致）
// React 對應：<SurgeryTable />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// 床號顯示（含 W52 前綴，與檢查／會診一致）
function fmtBed(bedNo) {
  return `W52-${bedNo}`;
}

// 排序：手術中 → 待手術 → 已完成 → 取消，同狀態內依排程時間升序
function sortSurgeries(items) {
  const order = { "手術中": 0, "待手術": 1, "已完成": 2, "取消": 3 };
  return [...items].sort((a, b) => {
    const p = (order[a.Status] ?? 99) - (order[b.Status] ?? 99);
    if (p !== 0) return p;
    return a.ScheduledTime.localeCompare(b.ScheduledTime);
  });
}

// ── 單筆手術列 ──
// React 對應：<SurgeryRow item={item} />
function renderSurgeryRow(item) {
  const genderText  = item.Gender === "M" ? "男" : "女";
  const genderClass = item.Gender === "M" ? "surg-gender-m" : "surg-gender-f";
  const rowCls      = item.Status === "取消" ? "surg-row-cancel" : "";

  return `
    <tr class="${rowCls}">
      <td class="surg-td-bed">${fmtBed(item.BedNo)}</td>
      <td class="surg-td-name">
        <span class="surg-name ${genderClass}">${item.PatientName}</span>
        <span class="surg-basic">${genderText}/${item.Age}</span>
      </td>
      <td class="surg-td-time">${item.ScheduledTime}</td>
      <td><span class="surg-td-or">${item.OrRoom}</span></td>
      <td class="surg-td-procedure">${item.Procedure}</td>
      <td class="surg-td-diagnosis">${item.Diagnosis}</td>
      <td class="surg-td-anesthesia">${item.AnesthesiaMethod}</td>
      <td class="surg-td-surgeon">${item.AttendingSurgeon}</td>
      <td class="surg-td-status">
        <span class="surg-status surg-status-${item.Status}">${item.Status}</span>
      </td>
    </tr>`;
}

// ── 手術表格 ──
// React 對應：<SurgeryTable items={items} />
function renderSurgeryList(items) {
  const el = document.getElementById("surgery-list");
  document.getElementById("surg-count").textContent = items.length ? `${items.length} 筆` : "";

  if (!items.length) {
    el.innerHTML = `<tr class="surg-empty-row"><td colspan="9">今日無手術排程</td></tr>`;
    return;
  }

  el.innerHTML = sortSurgeries(items).map(renderSurgeryRow).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getSurgeryInfo("W52", "2026-06-03");
  if (!res.Success) {
    document.getElementById("surgery-list").innerHTML =
      `<tr class="surg-empty-row"><td colspan="9">資料載入失敗：${res.Message}</td></tr>`;
    return;
  }

  renderSurgeryList(res.Data.Items);
});
