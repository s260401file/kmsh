// ──────────────────────────────────────────────────────────────
// 手術資訊 渲染邏輯 — ICU 版
// 含前後 3 日共 7 天的日期切換 bar
// React 對應：<DateBar /> + <SurgeryTable />
// ──────────────────────────────────────────────────────────────

const TODAY = "2026-06-03";  // mock 今日

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// 生成前後3日共7天的日期列表
function getDateRange(todayStr) {
  const d  = new Date(todayStr);
  const out = [];
  for (let i = -3; i <= 3; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    const y   = dd.getFullYear();
    const m   = String(dd.getMonth() + 1).padStart(2, "0");
    const day = String(dd.getDate()).padStart(2, "0");
    const wds = ["日","一","二","三","四","五","六"];
    out.push({
      dateStr:  `${y}-${m}-${day}`,
      display:  `${m}/${day}`,
      weekday:  `（${wds[dd.getDay()]}）`,
      isToday:  i === 0
    });
  }
  return out;
}

// 排序：手術中 → 待手術 → 已完成 → 取消，同狀態依排程時間升序
function sortSurgeries(items) {
  const order = { "手術中": 0, "待手術": 1, "已完成": 2, "取消": 3 };
  return [...items].sort((a, b) => {
    const p = (order[a.status] ?? 99) - (order[b.status] ?? 99);
    if (p !== 0) return p;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
}

// ── 單筆手術列 ──
function renderSurgeryRow(item) {
  const genderText  = item.gender === "M" ? "男" : "女";
  const genderClass = item.gender === "M" ? "surg-gender-m" : "surg-gender-f";
  const rowCls      = item.status === "取消" ? "surg-row-cancel" : "";

  return `
    <tr class="${rowCls}">
      <td><span class="surg-td-or">${item.orRoom}</span></td>
      <td class="surg-td-time">${item.scheduledTime}</td>
      <td class="surg-td-bed">${item.bedId}</td>
      <td class="surg-td-name">
        <span class="surg-name ${genderClass}">${item.patientName}</span>
        <span class="surg-basic">${genderText}/${item.age}</span>
      </td>
      <td class="surg-td-procedure">${item.procedure}</td>
      <td class="surg-td-diagnosis">${item.diagnosis}</td>
      <td class="surg-td-anesthesia">${item.anesthesiaMethod}</td>
      <td class="surg-td-surgeon">${item.attendingSurgeon}</td>
      <td class="surg-td-status">
        <span class="surg-status surg-status-${item.status}">${item.status}</span>
      </td>
    </tr>`;
}

// ── 手術表格 ──
function renderSurgeryList(items, selectedDate) {
  const el = document.getElementById("surgery-list");
  const dayItems = items.filter(i => i.date === selectedDate);

  const d = new Date(selectedDate);
  const wds = ["日","一","二","三","四","五","六"];
  const label = selectedDate === TODAY
    ? "當日手術"
    : `${selectedDate.replace(/-/g,"/")} (${wds[d.getDay()]}) 手術`;

  document.getElementById("surg-date-label").textContent = label;
  document.getElementById("surg-count").textContent = dayItems.length ? `${dayItems.length} 筆` : "";

  if (!dayItems.length) {
    el.innerHTML = `<tr class="surg-empty-row"><td colspan="9">此日期無手術排程</td></tr>`;
    return;
  }

  el.innerHTML = sortSurgeries(dayItems).map(renderSurgeryRow).join("");
}

// ── 日期切換列 ──
function renderDateBar(dates, activeDate, allItems) {
  const bar = document.getElementById("sr-date-bar");
  bar.innerHTML = dates.map(d => {
    const count = allItems.filter(i => i.date === d.dateStr).length;
    let cls = "sr-date-btn";
    if (d.isToday)             cls += " is-today";
    if (d.dateStr === activeDate) cls += " active";
    return `
      <button class="${cls}" data-date="${d.dateStr}">
        ${d.display}
        <span class="sr-date-weekday">${d.weekday}${count ? ` · ${count}筆` : ""}</span>
      </button>`;
  }).join("");

  bar.querySelectorAll(".sr-date-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const date = btn.dataset.date;
      renderDateBar(dates, date, allItems);
      renderSurgeryList(allItems, date);
    });
  });
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "王○明";
  document.getElementById("head-nurse").textContent    = "陳○美";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getIcuSurgery("ICU", TODAY);
  if (!res.success) {
    document.getElementById("surgery-list").innerHTML =
      `<tr class="surg-empty-row"><td colspan="9">資料載入失敗：${res.message}</td></tr>`;
    return;
  }

  const allItems = res.data.items;
  const dates    = getDateRange(TODAY);

  renderDateBar(dates, TODAY, allItems);
  renderSurgeryList(allItems, TODAY);
});
