// ──────────────────────────────────────────────────────────────
// 手術資訊 渲染邏輯
// §7.1.2 (4.1) 當日手術 — 本單位在床病人當日手術
// React 對應：<SurgeryTab />（只顯示當日、無日期切換）
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

// ── 手術表格（當日、無日期切換）──
// React 對應：<SurgeryTable items={items} />
function renderSurgeryList(allItems) {
  const el = document.getElementById("surgery-list");
  const items = sortSurgeries(allItems);

  // 標頭計數：不含取消，單位「台」
  const active = items.filter(i => i.Status !== "取消").length;
  document.getElementById("surg-count").textContent = `${active} 台`;

  if (!items.length) {
    el.innerHTML = `<tr class="surg-empty-row"><td colspan="8">本日無手術排程</td></tr>`;
    return;
  }
  el.innerHTML = items.map(renderSurgeryRow).join("");
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

  // 後端已只回「本單位在床病人當日手術」，前端不再做日期過濾
  renderSurgeryList(res.Data.Items);
});
