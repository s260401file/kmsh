// ──────────────────────────────────────────────────────────────
// 手術資訊 渲染邏輯
// §7.1.2 (4.1) 當日手術 — 接 Board_OR 全院手術清單
// React 對應：<SurgeryTab />（頂部日期列今天±3 天，下方全院 OR 手術表）
// ──────────────────────────────────────────────────────────────

const DAYS = ["日","一","二","三","四","五","六"];
const STATUS_ORDER = ["手術中","待手術","已完成","取消"];   // 列表排序優先序

function updateClock() {
  const now  = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${DAYS[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// 本地日期 → yyyy-MM-dd（避免 toISOString 的 UTC 時區位移）
function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// 以「真實今天」為中心、前後各 3 天的日期列
function buildDateRange() {
  const today = new Date();
  const dates = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push({ iso: isoLocal(d), label: `${d.getMonth()+1}/${d.getDate()}`, day: DAYS[d.getDay()], isToday: i === 0 });
  }
  return dates;
}

// 排序：手術中 → 待手術 → 已完成 → 取消
function sortSurgeries(items) {
  return [...items].sort((a, b) => STATUS_ORDER.indexOf(a.Status) - STATUS_ORDER.indexOf(b.Status));
}

// ── 單筆手術列 ──
// React 對應：<SurgeryRow item={item} />
function renderSurgeryRow(item) {
  const genderText  = item.Gender === "M" ? "男" : "女";
  const genderClass = item.Gender === "M" ? "surg-gender-m" : "surg-gender-f";
  const rowCls      = item.Status === "取消" ? "surg-row-cancel" : "";

  return `
    <tr class="${rowCls}">
      <td><span class="surg-td-or">${item.OrRoom}</span></td>
      <td class="surg-td-time">${item.ScheduledTime}</td>
      <td class="surg-td-name">
        <span class="surg-name ${genderClass}">${item.PatientName}</span>
        <span class="surg-basic">${genderText}/${item.Age}</span>
      </td>
      <td class="surg-td-procedure">${item.Procedure}</td>
      <td class="surg-td-diagnosis">${item.Diagnosis}</td>
      <td class="surg-td-anesthesia">${item.AnesthesiaMethod}</td>
      <td class="surg-td-surgeon">${item.AttendingSurgeon}</td>
      <td class="surg-td-status">
        <span class="surg-status surg-status-${item.Status}">${item.Status}</span>
      </td>
    </tr>`;
}

// ── 手術表格（依當前選取日期過濾）──
// React 對應：<SurgeryTable items={items} />
function renderSurgeryList(allItems, activeDate) {
  const el = document.getElementById("surgery-list");
  const items = sortSurgeries(allItems.filter(i => i.Date === activeDate));

  // 標頭計數：不含取消，單位「台」
  const active = items.filter(i => i.Status !== "取消").length;
  document.getElementById("surg-count").textContent = `${active} 台`;

  if (!items.length) {
    el.innerHTML = `<tr class="surg-empty-row"><td colspan="8">本日無手術排程</td></tr>`;
    return;
  }
  el.innerHTML = items.map(renderSurgeryRow).join("");
}

// ── 日期切換列 ──
function renderDateBar(dates, activeDate, onPick) {
  const bar = document.getElementById("sr-date-bar");
  bar.innerHTML = dates.map(d => `
    <button class="sr-date-btn${d.isToday ? " is-today" : ""}${d.iso === activeDate ? " active" : ""}" data-iso="${d.iso}">
      ${d.label}<span class="sr-date-weekday">(${d.day})</span>
    </button>`).join("");
  bar.querySelectorAll(".sr-date-btn").forEach(btn => {
    btn.addEventListener("click", () => onPick(btn.dataset.iso));
  });
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getSurgeryInfo("W52");
  if (!res.Success) {
    document.getElementById("surgery-list").innerHTML =
      `<tr class="surg-empty-row"><td colspan="8">資料載入失敗：${res.Message}</td></tr>`;
    return;
  }

  const dates = buildDateRange();
  const todayIso = isoLocal(new Date());
  // 假資料統一掛在「今天」，讓預設檢視即可看到手術清單
  const allItems = res.Data.Items.map(i => ({ ...i, Date: todayIso }));

  let activeDate = todayIso;
  const rerender = () => {
    renderDateBar(dates, activeDate, iso => { activeDate = iso; rerender(); });
    renderSurgeryList(allItems, activeDate);
  };
  rerender();
});
